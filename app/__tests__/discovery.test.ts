import {
  ipToInt,
  intToIp,
  cidrToMask,
  maskToCidr,
  calculateSubnet,
  DiscoveryEngine,
} from '../src/network/discovery';

describe('Discovery & Subnet Math', () => {
  describe('Subnet IP calculations', () => {
    it('should convert IPv4 to 32-bit int and back accurately', () => {
      expect(intToIp(ipToInt('192.168.1.1'))).toBe('192.168.1.1');
      expect(intToIp(ipToInt('10.0.0.1'))).toBe('10.0.0.1');
      expect(intToIp(ipToInt('0.0.0.0'))).toBe('0.0.0.0');
      expect(intToIp(ipToInt('255.255.255.255'))).toBe('255.255.255.255');
    });

    it('should convert CIDR to subnet mask and vice versa', () => {
      expect(cidrToMask(24)).toBe('255.255.255.0');
      expect(cidrToMask(16)).toBe('255.255.0.0');
      expect(cidrToMask(8)).toBe('255.0.0.0');
      expect(cidrToMask(30)).toBe('255.255.255.252');

      expect(maskToCidr('255.255.255.0')).toBe(24);
      expect(maskToCidr('255.255.0.0')).toBe(16);
      expect(maskToCidr('255.255.255.252')).toBe(30);
    });

    it('should calculate standard class C /24 subnet correctly', () => {
      const sub = calculateSubnet('192.168.1.45', 24);
      expect(sub.networkAddress).toBe('192.168.1.0');
      expect(sub.broadcastAddress).toBe('192.168.1.255');
      expect(sub.firstHost).toBe('192.168.1.1');
      expect(sub.lastHost).toBe('192.168.1.254');
      expect(sub.totalHosts).toBe(254);
      expect(sub.hosts).toHaveLength(254);
      expect(sub.hosts[0]).toBe('192.168.1.1');
      expect(sub.hosts[253]).toBe('192.168.1.254');
    });

    it('should calculate small /30 point-to-point subnet correctly', () => {
      const sub = calculateSubnet('10.10.10.1', 30);
      expect(sub.networkAddress).toBe('10.10.10.0');
      expect(sub.broadcastAddress).toBe('10.10.10.3');
      expect(sub.firstHost).toBe('10.10.10.1');
      expect(sub.lastHost).toBe('10.10.10.2');
      expect(sub.totalHosts).toBe(2);
      expect(sub.hosts).toEqual(['10.10.10.1', '10.10.10.2']);
    });
  });

  describe('DiscoveryEngine', () => {
    it('should fetch current subnet from NetInfo', async () => {
      const engine = new DiscoveryEngine();
      const sub = await engine.getCurrentSubnet();
      expect(sub.networkAddress).toBe('192.168.1.0');
      expect(sub.cidr).toBe(24);
    });

    it('should execute startScan and report progress', async () => {
      const engine = new DiscoveryEngine();
      const miniSubnet = calculateSubnet('192.168.1.1', 30); // 2 hosts

      const progressUpdates: any[] = [];
      const devices = await engine.startScan(
        miniSubnet,
        (p) => progressUpdates.push(p),
        undefined,
        5
      );

      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(engine.getIsScanning()).toBe(false);
      expect(Array.isArray(devices)).toBe(true);
    });

    it('should support stopScan cancellation', () => {
      const engine = new DiscoveryEngine();
      engine.stopScan();
      expect(engine.getIsScanning()).toBe(false);
    });
  });
});
