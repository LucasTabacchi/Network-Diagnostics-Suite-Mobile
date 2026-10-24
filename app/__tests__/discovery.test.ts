import {
  ipToInt,
  intToIp,
  cidrToMask,
  maskToCidr,
  calculateSubnet,
  DiscoveryEngine,
} from '../src/network/discovery';
import TcpSocket from 'react-native-tcp-socket';
import * as scanner from '../src/network/discovery/scanner';

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

    it('limits native host probes even when a higher concurrency is requested', async () => {
      let active = 0;
      let peak = 0;
      const probe = jest.spyOn(scanner, 'probeHost').mockImplementation(async () => {
        active++;
        peak = Math.max(peak, active);
        await new Promise<void>((resolve) => setTimeout(resolve, 5));
        active--;
        return null;
      });

      try {
        await new DiscoveryEngine().startScan(calculateSubnet('192.168.1.1', 29), undefined, undefined, 15);
        expect(peak).toBeLessThanOrEqual(4);
        expect(peak).toBe(4);
      } finally {
        probe.mockRestore();
      }
    });
  });

  describe('TCP scanner', () => {
    it('overlaps TCP and SNMP timeouts for an unresponsive host', async () => {
      jest.useFakeTimers();
      const socket = {
        on: jest.fn(),
        setTimeout: jest.fn(),
        destroy: jest.fn(),
      };
      const connect = jest.spyOn(TcpSocket, 'createConnection').mockReturnValueOnce(socket as any);
      const get = jest.fn().mockImplementation(() => new Promise((_, reject) => {
        setTimeout(() => reject(new Error('SNMP timeout')), 600);
      }));

      try {
        const startedAt = Date.now();
        const settledAt = scanner.probeHost('192.168.1.254', { get } as any, [80])
          .then((device) => ({ device, elapsedMs: Date.now() - startedAt }));

        expect(get).toHaveBeenCalledTimes(1);
        await jest.advanceTimersByTimeAsync(scanner.SCAN_TCP_TIMEOUT_MS);
        await expect(settledAt).resolves.toEqual({
          device: null,
          elapsedMs: scanner.SCAN_TCP_TIMEOUT_MS,
        });
        expect(socket.destroy).toHaveBeenCalled();
      } finally {
        connect.mockRestore();
        jest.useRealTimers();
      }
    });

    it('discovers a host that only responds to SNMP', async () => {
      const get = jest.fn().mockResolvedValue({
        varbinds: [
          { oid: '1.3.6.1.2.1.1.1.0', value: 'MikroTik RouterOS' },
          { oid: '1.3.6.1.2.1.1.5.0', value: 'RTR-TEST' },
          { oid: '1.3.6.1.2.1.2.2.1.6.1', value: 'AA:BB:CC:DD:EE:FF' },
        ],
      });

      const device = await scanner.probeHost('192.168.1.8', { get } as any, []);
      expect(device).toMatchObject({
        ip: '192.168.1.8',
        name: 'RTR-TEST',
        mac: 'AA:BB:CC:DD:EE:FF',
        isOnline: true,
      });
    });

    it('accepts a real connection delayed beyond the old 350 ms deadline', async () => {
      jest.useFakeTimers();
      const socket = {
        on: jest.fn(),
        setTimeout: jest.fn(),
        destroy: jest.fn(),
      };
      const connect = jest.spyOn(TcpSocket, 'createConnection').mockImplementationOnce((_, callback) => {
        setTimeout(() => callback?.(), 500);
        return socket as any;
      });

      try {
        const devicePromise = scanner.probeHost(
          '192.168.1.1',
          { get: jest.fn().mockRejectedValue(new Error('SNMP unavailable')) } as any,
          [80]
        );
        await jest.advanceTimersByTimeAsync(500);
        const device = await devicePromise;
        expect(device?.ip).toBe('192.168.1.1');
        expect(device?.openPorts).toEqual([80]);
        expect(socket.destroy).toHaveBeenCalled();
      } finally {
        connect.mockRestore();
        jest.useRealTimers();
      }
    });
  });
});
