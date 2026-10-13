export interface SubnetInfo {
  ip: string;
  netmask: string;
  networkAddress: string;
  broadcastAddress: string;
  firstHost: string;
  lastHost: string;
  totalHosts: number;
  cidr: number;
  hosts: string[];
}

/**
 * Converts an IPv4 string "192.168.1.1" to an unsigned 32-bit integer
 */
export function ipToInt(ip: string): number {
  return (
    ip
      .split('.')
      .reduce((acc, octet) => ((acc << 8) + parseInt(octet, 10)) >>> 0, 0) >>> 0
  );
}

/**
 * Converts an unsigned 32-bit integer to an IPv4 string "192.168.1.1"
 */
export function intToIp(int: number): string {
  return [
    (int >>> 24) & 255,
    (int >>> 16) & 255,
    (int >>> 8) & 255,
    int & 255,
  ].join('.');
}

/**
 * Converts CIDR prefix length (e.g. 24) to netmask string ("255.255.255.0")
 */
export function cidrToMask(cidr: number): string {
  const mask = cidr === 0 ? 0 : (~0 << (32 - cidr)) >>> 0;
  return intToIp(mask);
}

/**
 * Converts netmask string ("255.255.255.0") to CIDR prefix length (24)
 */
export function maskToCidr(mask: string): number {
  const int = ipToInt(mask);
  let count = 0;
  for (let i = 0; i < 32; i++) {
    if ((int & (1 << (31 - i))) !== 0) {
      count++;
    } else {
      break;
    }
  }
  return count;
}

/**
 * Calculates network address, broadcast, usable range, and host list
 */
export function calculateSubnet(
  ip: string,
  netmaskOrCidr: string | number = 24
): SubnetInfo {
  const cidr =
    typeof netmaskOrCidr === 'number'
      ? netmaskOrCidr
      : maskToCidr(netmaskOrCidr);

  const netmask = cidrToMask(cidr);
  const ipNum = ipToInt(ip);
  const maskNum = ipToInt(netmask);

  const networkNum = (ipNum & maskNum) >>> 0;
  const broadcastNum = (networkNum | ~maskNum) >>> 0;

  const networkAddress = intToIp(networkNum);
  const broadcastAddress = intToIp(broadcastNum);

  let firstHostNum = networkNum + 1;
  let lastHostNum = broadcastNum - 1;

  if (cidr >= 31) {
    firstHostNum = networkNum;
    lastHostNum = broadcastNum;
  }

  const firstHost = intToIp(firstHostNum);
  const lastHost = intToIp(lastHostNum);

  const totalHosts =
    lastHostNum >= firstHostNum ? lastHostNum - firstHostNum + 1 : 0;

  const hosts: string[] = [];
  // Cap at /24 size (254 hosts) for mobile scanning responsiveness
  const maxScan = Math.min(totalHosts, 254);
  for (let i = 0; i < maxScan; i++) {
    hosts.push(intToIp(firstHostNum + i));
  }

  return {
    ip,
    netmask,
    networkAddress,
    broadcastAddress,
    firstHost,
    lastHost,
    totalHosts,
    cidr,
    hosts,
  };
}
