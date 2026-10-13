export const ASN1 = {
  INTEGER: 0x02,
  OCTET_STRING: 0x04,
  NULL: 0x05,
  OID: 0x06,
  SEQUENCE: 0x30,
  // SNMP Application types
  IP_ADDRESS: 0x40,
  COUNTER32: 0x41,
  GAUGE32: 0x42,
  TIMETICKS: 0x43,
  OPAQUE: 0x44,
  COUNTER64: 0x46,
  // SNMP PDU Types (Context-specific constructed)
  GET_REQUEST: 0xa0,
  GET_NEXT_REQUEST: 0xa1,
  GET_RESPONSE: 0xa2,
  SET_REQUEST: 0xa3,
  TRAP: 0xa4,
  GET_BULK_REQUEST: 0xa5,
} as const;

export type Asn1Tag = typeof ASN1[keyof typeof ASN1] | number;

export interface BerElement {
  tag: Asn1Tag;
  value: any;
}

/**
 * Encode a length into BER format
 */
export function encodeLength(length: number): Uint8Array {
  if (length < 128) {
    return new Uint8Array([length]);
  }
  const bytes: number[] = [];
  let temp = length;
  while (temp > 0) {
    bytes.unshift(temp & 0xff);
    temp = temp >> 8;
  }
  return new Uint8Array([0x80 | bytes.length, ...bytes]);
}

/**
 * Decode a BER length from a buffer at offset.
 * Returns { length, headerSize }
 */
export function decodeLength(buf: Uint8Array, offset: number): { length: number; headerSize: number } {
  const first = buf[offset];
  if ((first & 0x80) === 0) {
    return { length: first, headerSize: 1 };
  }
  const numBytes = first & 0x7f;
  if (numBytes === 0 || offset + 1 + numBytes > buf.length) {
    throw new Error(`Invalid BER length at offset ${offset}`);
  }
  let length = 0;
  for (let i = 0; i < numBytes; i++) {
    length = (length << 8) | buf[offset + 1 + i];
  }
  return { length, headerSize: 1 + numBytes };
}

/**
 * Encode an integer into BER bytes
 */
export function encodeInteger(val: number): Uint8Array {
  if (val === 0) {
    return new Uint8Array([ASN1.INTEGER, 1, 0]);
  }

  const bytes: number[] = [];
  let temp = val;
  const isNegative = temp < 0;

  if (isNegative) {
    // 32-bit signed
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
    // If MSB is 1, prepend 0x00 to denote positive number
    if ((bytes[0] & 0x80) !== 0) {
      bytes.unshift(0x00);
    }
  }

  const len = encodeLength(bytes.length);
  const res = new Uint8Array(1 + len.length + bytes.length);
  res[0] = ASN1.INTEGER;
  res.set(len, 1);
  res.set(bytes, 1 + len.length);
  return res;
}

/**
 * Encode an Octet String into BER bytes
 */
export function encodeOctetString(strOrBytes: string | Uint8Array): Uint8Array {
  const data =
    typeof strOrBytes === 'string'
      ? new Uint8Array(Array.from(strOrBytes).map((c) => c.charCodeAt(0)))
      : strOrBytes;

  const len = encodeLength(data.length);
  const res = new Uint8Array(1 + len.length + data.length);
  res[0] = ASN1.OCTET_STRING;
  res.set(len, 1);
  res.set(data, 1 + len.length);
  return res;
}

/**
 * Encode NULL into BER bytes
 */
export function encodeNull(): Uint8Array {
  return new Uint8Array([ASN1.NULL, 0x00]);
}

/**
 * Encode an OID string (e.g. "1.3.6.1.2.1.1.1.0") into BER bytes
 */
export function encodeOid(oidStr: string): Uint8Array {
  const clean = oidStr.startsWith('.') ? oidStr.slice(1) : oidStr;
  const parts = clean.split('.').map(Number);
  if (parts.length < 2) {
    throw new Error(`OID must have at least 2 components: ${oidStr}`);
  }

  const bytes: number[] = [];
  // First two components are combined: (X * 40) + Y
  bytes.push(parts[0] * 40 + parts[1]);

  // Subsequent components are encoded as VLQ (variable-length quantity)
  for (let i = 2; i < parts.length; i++) {
    let val = parts[i];
    const subBytes: number[] = [];
    subBytes.push(val & 0x7f);
    val = Math.floor(val / 128);

    while (val > 0) {
      subBytes.unshift((val & 0x7f) | 0x80);
      val = Math.floor(val / 128);
    }
    bytes.push(...subBytes);
  }

  const len = encodeLength(bytes.length);
  const res = new Uint8Array(1 + len.length + bytes.length);
  res[0] = ASN1.OID;
  res.set(len, 1);
  res.set(bytes, 1 + len.length);
  return res;
}

/**
 * Encode a SEQUENCE or PDU container of child elements
 */
export function encodeContainer(tag: Asn1Tag, children: Uint8Array[]): Uint8Array {
  const totalChildLength = children.reduce((acc, c) => acc + c.length, 0);
  const len = encodeLength(totalChildLength);
  const res = new Uint8Array(1 + len.length + totalChildLength);
  res[0] = tag;
  res.set(len, 1);

  let offset = 1 + len.length;
  for (const child of children) {
    res.set(child, offset);
    offset += child.length;
  }
  return res;
}

/**
 * Decode an OID from raw payload bytes
 */
export function decodeOid(data: Uint8Array): string {
  if (data.length === 0) return '';
  const first = data[0];
  const arc0 = Math.floor(first / 40);
  const arc1 = first % 40;
  const parts: number[] = [arc0, arc1];

  let currentVal = 0;
  for (let i = 1; i < data.length; i++) {
    const b = data[i];
    currentVal = (currentVal * 128) + (b & 0x7f);
    if ((b & 0x80) === 0) {
      parts.push(currentVal);
      currentVal = 0;
    }
  }
  return parts.join('.');
}

/**
 * Decode an unsigned or signed integer from raw payload bytes
 */
export function decodeInteger(data: Uint8Array, unsigned = false): number {
  if (data.length === 0) return 0;
  if (!unsigned && (data[0] & 0x80) !== 0) {
    // Negative number
    let val = 0;
    for (let i = 0; i < data.length; i++) {
      val = (val << 8) | data[i];
    }
    // Sign extend
    const bits = data.length * 8;
    return val - (1 << bits);
  }
  let val = 0;
  for (let i = 0; i < data.length; i++) {
    val = (val * 256) + data[i];
  }
  return val;
}

export interface DecodedBer {
  tag: Asn1Tag;
  rawPayload: Uint8Array;
  value: any;
  totalLength: number;
}

/**
 * Decode a single BER element from a buffer starting at offset
 */
export function decodeBer(buf: Uint8Array, offset = 0): DecodedBer {
  if (offset >= buf.length) {
    throw new Error(`Buffer underflow at offset ${offset}`);
  }

  const tag = buf[offset];
  const { length, headerSize } = decodeLength(buf, offset + 1);
  const payloadStart = offset + 1 + headerSize;
  const payloadEnd = payloadStart + length;

  if (payloadEnd > buf.length) {
    throw new Error(`BER element exceeds buffer length: payloadEnd=${payloadEnd}, buf.length=${buf.length}`);
  }

  const rawPayload = buf.slice(payloadStart, payloadEnd);
  let value: any = null;

  switch (tag) {
    case ASN1.INTEGER:
      value = decodeInteger(rawPayload, false);
      break;
    case ASN1.COUNTER32:
    case ASN1.GAUGE32:
    case ASN1.TIMETICKS:
      value = decodeInteger(rawPayload, true);
      break;
    case ASN1.COUNTER64:
      // Approximate as number for telemetry
      value = decodeInteger(rawPayload, true);
      break;
    case ASN1.OCTET_STRING:
      // Try string if printable, otherwise hex
      const isPrintable = Array.from(rawPayload).every((b) => (b >= 32 && b <= 126) || b === 10 || b === 13);
      if (isPrintable) {
        value = String.fromCharCode(...rawPayload);
      } else {
        value = Array.from(rawPayload)
          .map((b) => b.toString(16).padStart(2, '0'))
          .join(':');
      }
      break;
    case ASN1.IP_ADDRESS:
      value = Array.from(rawPayload).join('.');
      break;
    case ASN1.OID:
      value = decodeOid(rawPayload);
      break;
    case ASN1.NULL:
      value = null;
      break;
    case ASN1.SEQUENCE:
    case ASN1.GET_REQUEST:
    case ASN1.GET_NEXT_REQUEST:
    case ASN1.GET_RESPONSE:
    case ASN1.SET_REQUEST:
    case ASN1.TRAP:
    case ASN1.GET_BULK_REQUEST: {
      // Decode child elements
      const children: DecodedBer[] = [];
      let childOffset = 0;
      while (childOffset < rawPayload.length) {
        const child = decodeBer(rawPayload, childOffset);
        children.push(child);
        childOffset += child.totalLength;
      }
      value = children;
      break;
    }
    default:
      value = rawPayload;
      break;
  }

  return {
    tag,
    rawPayload,
    value,
    totalLength: 1 + headerSize + length,
  };
}
