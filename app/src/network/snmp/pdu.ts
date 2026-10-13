import {
  ASN1,
  Asn1Tag,
  encodeInteger,
  encodeOctetString,
  encodeNull,
  encodeOid,
  encodeContainer,
  decodeBer,
  DecodedBer,
} from './ber';

export interface SnmpVarBind {
  oid: string;
  type?: Asn1Tag;
  value?: any;
}

export interface SnmpPacket {
  version: number; // 0 = v1, 1 = v2c
  community: string;
  pduType: Asn1Tag;
  requestId: number;
  errorStatus: number;
  errorIndex: number;
  varbinds: SnmpVarBind[];
}

/**
 * Builds an SNMP GET request packet
 */
export function buildGetRequest(
  oids: string[],
  community = 'public',
  requestId = Math.floor(Math.random() * 0x7fffffff),
  version = 1 // default v2c
): Uint8Array {
  return buildSnmpPacket({
    version,
    community,
    pduType: ASN1.GET_REQUEST,
    requestId,
    errorStatus: 0,
    errorIndex: 0,
    varbinds: oids.map((oid) => ({ oid })),
  });
}

/**
 * Builds an SNMP GET-NEXT request packet (for walk)
 */
export function buildGetNextRequest(
  oid: string,
  community = 'public',
  requestId = Math.floor(Math.random() * 0x7fffffff),
  version = 1
): Uint8Array {
  return buildSnmpPacket({
    version,
    community,
    pduType: ASN1.GET_NEXT_REQUEST,
    requestId,
    errorStatus: 0,
    errorIndex: 0,
    varbinds: [{ oid }],
  });
}

/**
 * Encodes an SnmpPacket into raw BER bytes
 */
export function buildSnmpPacket(packet: SnmpPacket): Uint8Array {
  // 1. Build variable bindings SEQUENCE
  const encodedVarbinds: Uint8Array[] = packet.varbinds.map((vb) => {
    const oidEncoded = encodeOid(vb.oid);
    let valEncoded: Uint8Array;
    if (vb.value === undefined || vb.value === null) {
      valEncoded = encodeNull();
    } else if (typeof vb.value === 'number') {
      valEncoded = encodeInteger(vb.value);
    } else if (typeof vb.value === 'string') {
      valEncoded = encodeOctetString(vb.value);
    } else {
      valEncoded = encodeNull();
    }
    return encodeContainer(ASN1.SEQUENCE, [oidEncoded, valEncoded]);
  });

  const varbindList = encodeContainer(ASN1.SEQUENCE, encodedVarbinds);

  // 2. Build PDU
  const pdu = encodeContainer(packet.pduType, [
    encodeInteger(packet.requestId),
    encodeInteger(packet.errorStatus),
    encodeInteger(packet.errorIndex),
    varbindList,
  ]);

  // 3. Build outer SNMP Message SEQUENCE
  return encodeContainer(ASN1.SEQUENCE, [
    encodeInteger(packet.version),
    encodeOctetString(packet.community),
    pdu,
  ]);
}

/**
 * Parses raw BER bytes into an SnmpPacket
 */
export function parseSnmpPacket(data: Uint8Array): SnmpPacket {
  const root = decodeBer(data);
  if (root.tag !== ASN1.SEQUENCE || !Array.isArray(root.value)) {
    throw new Error('Invalid SNMP packet: Root must be a SEQUENCE');
  }

  const [versionElem, commElem, pduElem] = root.value as DecodedBer[];
  if (!versionElem || !commElem || !pduElem) {
    throw new Error('Malformed SNMP message: missing version, community, or PDU');
  }

  const version = Number(versionElem.value);
  const community = String(commElem.value);
  const pduType = pduElem.tag;

  if (!Array.isArray(pduElem.value) || pduElem.value.length < 4) {
    throw new Error(`Malformed PDU: expected at least 4 elements, got ${pduElem.value?.length}`);
  }

  const [reqIdElem, errStatusElem, errIndexElem, varbindListElem] = pduElem.value as DecodedBer[];

  const requestId = Number(reqIdElem.value);
  const errorStatus = Number(errStatusElem.value);
  const errorIndex = Number(errIndexElem.value);

  const varbinds: SnmpVarBind[] = [];
  if (Array.isArray(varbindListElem.value)) {
    for (const vbContainer of varbindListElem.value) {
      if (Array.isArray(vbContainer.value) && vbContainer.value.length >= 2) {
        const [oidElem, valElem] = vbContainer.value as DecodedBer[];
        varbinds.push({
          oid: String(oidElem.value),
          type: valElem.tag,
          value: valElem.value,
        });
      }
    }
  }

  return {
    version,
    community,
    pduType,
    requestId,
    errorStatus,
    errorIndex,
    varbinds,
  };
}
