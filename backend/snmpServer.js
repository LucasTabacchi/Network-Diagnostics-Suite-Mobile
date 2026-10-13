const dgram = require('dgram');

const ASN1 = {
  INTEGER: 0x02,
  OCTET_STRING: 0x04,
  NULL: 0x05,
  OID: 0x06,
  SEQUENCE: 0x30,
  TIMETICKS: 0x43,
  COUNTER32: 0x41,
  GAUGE32: 0x42,
  GET_REQUEST: 0xa0,
  GET_RESPONSE: 0xa2,
};

function encodeLength(len) {
  if (len < 128) return Buffer.from([len]);
  const bytes = [];
  let temp = len;
  while (temp > 0) {
    bytes.unshift(temp & 0xff);
    temp = Math.floor(temp / 256);
  }
  return Buffer.from([0x80 | bytes.length, ...bytes]);
}

function encodeContainer(tag, children) {
  const body = Buffer.concat(children);
  const len = encodeLength(body.length);
  return Buffer.concat([Buffer.from([tag]), len, body]);
}

function encodeInteger(val) {
  if (val === 0) return Buffer.from([ASN1.INTEGER, 1, 0]);
  const bytes = [];
  let temp = val;
  if (temp < 0) {
    while (temp < -128) {
      bytes.unshift(temp & 0xff);
      temp >>= 8;
    }
    bytes.unshift(temp & 0xff);
  } else {
    while (temp > 0) {
      bytes.unshift(temp & 0xff);
      temp = Math.floor(temp / 256);
    }
    if ((bytes[0] & 0x80) !== 0) bytes.unshift(0x00);
  }
  const len = encodeLength(bytes.length);
  return Buffer.concat([Buffer.from([ASN1.INTEGER]), len, Buffer.from(bytes)]);
}

function encodeOctetString(strOrBuf) {
  const buf = Buffer.isBuffer(strOrBuf) ? strOrBuf : Buffer.from(String(strOrBuf), 'utf8');
  const len = encodeLength(buf.length);
  return Buffer.concat([Buffer.from([ASN1.OCTET_STRING]), len, buf]);
}

function encodeNull() {
  return Buffer.from([ASN1.NULL, 0x00]);
}

function encodeOid(oidStr) {
  const clean = oidStr.startsWith('.') ? oidStr.slice(1) : oidStr;
  const parts = clean.split('.').map(Number);
  const bytes = [];
  bytes.push(parts[0] * 40 + parts[1]);
  for (let i = 2; i < parts.length; i++) {
    let val = parts[i];
    if (val < 128) {
      bytes.push(val);
    } else {
      const subBytes = [];
      subBytes.push(val & 0x7f);
      val >>= 7;
      while (val > 0) {
        subBytes.unshift((val & 0x7f) | 0x80);
        val >>= 7;
      }
      bytes.push(...subBytes);
    }
  }
  const len = encodeLength(bytes.length);
  return Buffer.concat([Buffer.from([ASN1.OID]), len, Buffer.from(bytes)]);
}

function decodeLength(buf, offset) {
  const first = buf[offset];
  if ((first & 0x80) === 0) {
    return { length: first, headerSize: 1 };
  }
  const numBytes = first & 0x7f;
  let length = 0;
  for (let i = 0; i < numBytes; i++) {
    length = (length << 8) | buf[offset + 1 + i];
  }
  return { length, headerSize: 1 + numBytes };
}

function decodeOid(data) {
  if (data.length === 0) return '';
  const first = data[0];
  const x = Math.floor(first / 40);
  const y = first % 40;
  const parts = [x, y];
  let current = 0;
  for (let i = 1; i < data.length; i++) {
    const byte = data[i];
    current = (current << 7) | (byte & 0x7f);
    if ((byte & 0x80) === 0) {
      parts.push(current);
      current = 0;
    }
  }
  return parts.join('.');
}

function decodeBer(buf, offset = 0) {
  if (offset >= buf.length) throw new Error('underflow');
  const tag = buf[offset];
  const { length, headerSize } = decodeLength(buf, offset + 1);
  const start = offset + 1 + headerSize;
  const end = start + length;
  const rawPayload = buf.slice(start, end);
  let value = null;

  if (
    tag === ASN1.INTEGER ||
    tag === ASN1.TIMETICKS ||
    tag === ASN1.COUNTER32 ||
    tag === ASN1.GAUGE32
  ) {
    let val = 0;
    for (let i = 0; i < rawPayload.length; i++) {
      val = (val * 256) + rawPayload[i];
    }
    value = val;
  } else if (tag === ASN1.OCTET_STRING) {
    value = rawPayload.toString('utf8');
  } else if (tag === ASN1.OID) {
    value = decodeOid(rawPayload);
  } else if (tag === ASN1.SEQUENCE || tag === ASN1.GET_REQUEST || tag === ASN1.GET_RESPONSE) {
    const children = [];
    let childOffset = 0;
    while (childOffset < rawPayload.length) {
      const child = decodeBer(rawPayload, childOffset);
      children.push(child);
      childOffset += child.totalLength;
    }
    value = children;
  }
  return { tag, rawPayload, value, totalLength: 1 + headerSize + length };
}

function parseSnmp(buf) {
  const root = decodeBer(buf, 0);
  const [versionElem, commElem, pduElem] = root.value;
  const [reqIdElem, errStatusElem, errIndexElem, varbindListElem] = pduElem.value;
  const oids = [];
  if (Array.isArray(varbindListElem.value)) {
    for (const vb of varbindListElem.value) {
      if (Array.isArray(vb.value) && vb.value.length >= 1) {
        oids.push(vb.value[0].value);
      }
    }
  }
  return {
    version: versionElem.value,
    community: commElem.value,
    requestId: reqIdElem.value,
    oids,
  };
}

function buildResponse(version, community, requestId, varbinds) {
  const encodedVbs = varbinds.map((vb) => {
    const oidEncoded = encodeOid(vb.oid);
    let valEncoded;
    if (typeof vb.value === 'number') {
      valEncoded = encodeInteger(vb.value);
    } else if (typeof vb.value === 'string' || Buffer.isBuffer(vb.value)) {
      valEncoded = encodeOctetString(vb.value);
    } else {
      valEncoded = encodeNull();
    }
    return encodeContainer(ASN1.SEQUENCE, [oidEncoded, valEncoded]);
  });
  const varbindList = encodeContainer(ASN1.SEQUENCE, encodedVbs);
  const pdu = encodeContainer(ASN1.GET_RESPONSE, [
    encodeInteger(requestId),
    encodeInteger(0),
    encodeInteger(0),
    varbindList,
  ]);
  return encodeContainer(ASN1.SEQUENCE, [
    encodeInteger(version),
    encodeOctetString(community),
    pdu,
  ]);
}

const TELEMETRY_DATA = {
  // MIB-II System Group
  '1.3.6.1.2.1.1.1.0': 'RouterOS v7.14 (hAP ac2) - Nodo Central NetDiag',
  '1.3.6.1.2.1.1.2.0': '1.3.6.1.4.1.14988.1',
  '1.3.6.1.2.1.1.3.0': 12345000, // Timeticks (approx 1d 10h)
  '1.3.6.1.2.1.1.4.0': 'noc@netdiag.fcyt',
  '1.3.6.1.2.1.1.5.0': 'RTR-CORE-CENTRAL',
  '1.3.6.1.2.1.1.6.0': 'Nodo Central - Data Center FCyT',

  // Vendor / CPU
  '1.3.6.1.4.1.14988.1.1.1.3.1.0': 14, // MikroTik CPU load %
  '1.3.6.1.2.1.25.3.3.1.2.1': 14,      // HR processor load %

  // Interfaces Table
  '1.3.6.1.2.1.2.1.0': 1,
  '1.3.6.1.2.1.2.2.1.2.1': 'ether1-gateway',
  '1.3.6.1.2.1.2.2.1.6.1': 'B8:69:F4:11:C2:AA',
  '1.3.6.1.2.1.2.2.1.7.1': 1, // Admin Up
  '1.3.6.1.2.1.2.2.1.8.1': 1, // Oper Up
  '1.3.6.1.2.1.2.2.1.10.1': 148209400, // Rx Bytes
  '1.3.6.1.2.1.2.2.1.16.1': 92451200,  // Tx Bytes
};

function startSnmpServer(port = 161) {
  const socket = dgram.createSocket('udp4');

  socket.on('message', (msg, rinfo) => {
    try {
      const parsed = parseSnmp(msg);
      const varbinds = parsed.oids.map((oid) => {
        let value = TELEMETRY_DATA[oid];
        if (value === undefined) {
          // Fallback prefix match for interface oids or default
          for (const [key, val] of Object.entries(TELEMETRY_DATA)) {
            if (oid.startsWith(key) || key.startsWith(oid)) {
              value = val;
              break;
            }
          }
        }
        return {
          oid,
          value: value !== undefined ? value : null,
        };
      });

      const response = buildResponse(
        parsed.version,
        parsed.community,
        parsed.requestId,
        varbinds
      );

      socket.send(response, 0, response.length, rinfo.port, rinfo.address, (err) => {
        if (err) {
          console.error('[SNMP Server] Error sending response:', err.message);
        } else {
          console.log(`[SNMP Server] Handled GetRequest (${parsed.oids.length} OIDs) from ${rinfo.address}:${rinfo.port}`);
        }
      });
    } catch (err) {
      console.error('[SNMP Server] Parse error:', err.message);
    }
  });

  socket.on('error', (err) => {
    console.error('[SNMP Server] Socket error:', err.message);
    try {
      socket.close();
    } catch (_) {}
  });

  socket.bind(port, '0.0.0.0', () => {
    console.log(`[SNMP Server] Listening on udp://0.0.0.0:${port}`);
  });

  return socket;
}

module.exports = {
  startSnmpServer,
};
