import {
  ASN1,
  encodeLength,
  decodeLength,
  encodeInteger,
  decodeInteger,
  encodeOctetString,
  encodeOid,
  decodeOid,
  decodeBer,
  buildGetRequest,
  parseSnmpPacket,
  buildSnmpPacket,
  formatUptime,
  detectVendor,
  SnmpClient,
  UdpSocketPort,
} from '../src/network/snmp';

describe('SNMP ASN.1 BER Codec & PDU', () => {
  describe('BER Length encoding/decoding', () => {
    it('should encode and decode short lengths (< 128)', () => {
      const enc10 = encodeLength(10);
      expect(enc10).toEqual(new Uint8Array([10]));
      const dec10 = decodeLength(enc10, 0);
      expect(dec10.length).toBe(10);
      expect(dec10.headerSize).toBe(1);

      const enc127 = encodeLength(127);
      expect(enc127).toEqual(new Uint8Array([127]));
      const dec127 = decodeLength(enc127, 0);
      expect(dec127.length).toBe(127);
      expect(dec127.headerSize).toBe(1);
    });

    it('should encode and decode long multi-byte lengths (>= 128)', () => {
      const enc128 = encodeLength(128);
      expect(enc128).toEqual(new Uint8Array([0x81, 128]));
      const dec128 = decodeLength(enc128, 0);
      expect(dec128.length).toBe(128);
      expect(dec128.headerSize).toBe(2);

      const enc1000 = encodeLength(1000);
      const dec1000 = decodeLength(enc1000, 0);
      expect(dec1000.length).toBe(1000);
    });
  });

  describe('BER Integer encoding/decoding', () => {
    it('should encode and decode zero, positive and negative integers', () => {
      const zero = encodeInteger(0);
      const decZero = decodeBer(zero);
      expect(decZero.tag).toBe(ASN1.INTEGER);
      expect(decZero.value).toBe(0);

      const pos = encodeInteger(42);
      const decPos = decodeBer(pos);
      expect(decPos.value).toBe(42);

      // Value with MSB set (128 -> needs leading 0x00 to remain positive)
      const msbVal = encodeInteger(128);
      const decMsb = decodeBer(msbVal);
      expect(decMsb.value).toBe(128);

      const bigVal = encodeInteger(65535);
      const decBig = decodeBer(bigVal);
      expect(decBig.value).toBe(65535);
    });
  });

  describe('BER OID encoding/decoding', () => {
    it('should roundtrip standard MIB-II sysDescr OID 1.3.6.1.2.1.1.1.0', () => {
      const oid = '1.3.6.1.2.1.1.1.0';
      const encoded = encodeOid(oid);
      expect(encoded[0]).toBe(ASN1.OID);
      // First byte after length must be 1*40 + 3 = 43 (0x2b)
      expect(encoded[2]).toBe(0x2b);

      const decoded = decodeBer(encoded);
      expect(decoded.tag).toBe(ASN1.OID);
      expect(decoded.value).toBe(oid);
    });

    it('should roundtrip enterprise OID with large arc numbers', () => {
      const mtkOid = '1.3.6.1.4.1.14988.1.1.1.3.1.0';
      const encoded = encodeOid(mtkOid);
      const decoded = decodeBer(encoded);
      expect(decoded.tag).toBe(ASN1.OID);
      expect(decoded.value).toBe(mtkOid);
    });
  });

  describe('SNMP PDU Builder & Parser', () => {
    it('should build an SNMP GET request packet and parse it back', () => {
      const oids = ['1.3.6.1.2.1.1.1.0', '1.3.6.1.2.1.1.3.0'];
      const rawPacket = buildGetRequest(oids, 'public', 12345, 1);

      const parsed = parseSnmpPacket(rawPacket);
      expect(parsed.version).toBe(1); // v2c
      expect(parsed.community).toBe('public');
      expect(parsed.requestId).toBe(12345);
      expect(parsed.pduType).toBe(ASN1.GET_REQUEST);
      expect(parsed.errorStatus).toBe(0);
      expect(parsed.varbinds).toHaveLength(2);
      expect(parsed.varbinds[0].oid).toBe(oids[0]);
      expect(parsed.varbinds[1].oid).toBe(oids[1]);
    });

    it('should parse an SNMP GET response packet with telemetry values', () => {
      const responsePacket = buildSnmpPacket({
        version: 1,
        community: 'private',
        pduType: ASN1.GET_RESPONSE,
        requestId: 9999,
        errorStatus: 0,
        errorIndex: 0,
        varbinds: [
          { oid: '1.3.6.1.2.1.1.5.0', value: 'RB4011-Core' },
          { oid: '1.3.6.1.2.1.1.3.0', value: 8640000 },
        ],
      });

      const parsed = parseSnmpPacket(responsePacket);
      expect(parsed.pduType).toBe(ASN1.GET_RESPONSE);
      expect(parsed.community).toBe('private');
      expect(parsed.requestId).toBe(9999);
      expect(parsed.varbinds[0].value).toBe('RB4011-Core');
      expect(parsed.varbinds[1].value).toBe(8640000);
    });
  });

  describe('Telemetry formatters and vendor detection', () => {
    it('should format timeticks into human-readable uptime', () => {
      // 1 day = 86400 seconds = 8640000 timeticks
      expect(formatUptime(8640000)).toBe('1d 0h 0m');
      // 14 days, 2 hours, 30 minutes
      const ticks = (14 * 86400 + 2 * 3600 + 30 * 60) * 100;
      expect(formatUptime(ticks)).toBe('14d 2h 30m');
    });

    it('should detect hardware vendors from sysDescr', () => {
      expect(detectVendor('RouterOS v7.14.3 on RB4011iGS+')).toBe('MikroTik');
      expect(detectVendor('Cisco IOS Software, C2960 Software (C2960-LANBASEK9-M)')).toBe('Cisco');
      expect(detectVendor('Huawei Versatile Routing Platform Software')).toBe('Huawei');
      expect(detectVendor('EdgeOS v2.0.9')).toBe('Ubiquiti');
      expect(detectVendor('Linux server 5.15.0')).toBe('Linux / Generic');
      expect(detectVendor('Unknown proprietary embedded')).toBe('Genérico / Desconocido');
    });
  });

  describe('SnmpClient with Mock Socket', () => {
    it('should execute query over UDP port and parse telemetry', async () => {
      let messageHandler: ((msg: any, rinfo: any) => void) | null = null;
      let sentData: Uint8Array | null = null;

      const mockSocket: UdpSocketPort = {
        send: (data, offset, length, port, address, callback) => {
          sentData = data;
          if (callback) callback();

          // Simulate device response
          setTimeout(() => {
            if (messageHandler && sentData) {
              const req = parseSnmpPacket(sentData);
              const resPacket = buildSnmpPacket({
                version: req.version,
                community: req.community,
                pduType: ASN1.GET_RESPONSE,
                requestId: req.requestId,
                errorStatus: 0,
                errorIndex: 0,
                varbinds: [
                  { oid: '1.3.6.1.2.1.1.1.0', value: 'RouterOS v7.12' },
                  { oid: '1.3.6.1.2.1.1.3.0', value: 360000 },
                  { oid: '1.3.6.1.2.1.1.5.0', value: 'Edge-Router-01' },
                ],
              });
              messageHandler(resPacket, { address, port });
            }
          }, 10);
        },
        on: (event, cb) => {
          if (event === 'message') messageHandler = cb;
        },
        bind: (port, addr, cb) => {
          if (cb) cb();
        },
        close: jest.fn(),
      };

      const client = new SnmpClient(() => mockSocket);
      const telemetry = await client.queryDeviceTelemetry('192.168.1.1');

      expect(telemetry.sysName).toBe('Edge-Router-01');
      expect(telemetry.sysDescr).toBe('RouterOS v7.12');
      expect(telemetry.vendor).toBe('MikroTik');
      expect(mockSocket.close).toHaveBeenCalled();
    });
  });
});
