import NetInfo from '@react-native-community/netinfo';
import Zeroconf from 'react-native-zeroconf';
import { calculateSubnet, SubnetInfo } from './subnet';
import { probeHost, DiscoveredDevice } from './scanner';
import { SnmpClient } from '../snmp/SnmpClient';
import { getRepositories, initDatabase } from '../../store';

export interface ScanProgress {
  scanned: number;
  total: number;
  currentIp: string;
  foundCount: number;
  percent: number;
}

export type ScanProgressCallback = (progress: ScanProgress) => void;
export type DeviceFoundCallback = (device: DiscoveredDevice) => void;

export class DiscoveryEngine {
  private isScanning = false;
  private shouldCancel = false;
  private zeroconf = new Zeroconf();
  private snmpClient = new SnmpClient();

  /**
   * Resolves the current WiFi subnet using NetInfo
   */
  async getCurrentSubnet(): Promise<SubnetInfo> {
    try {
      const state = await NetInfo.fetch();
      if (state.type === 'wifi' && state.details && 'ipAddress' in state.details) {
        const ip = state.details.ipAddress || '192.168.1.100';
        const netmask = state.details.subnet || '255.255.255.0';
        return calculateSubnet(ip, netmask);
      }
    } catch (_) {}

    // Default lab subnet
    return calculateSubnet('192.168.1.100', '255.255.255.0');
  }

  /**
   * Starts a concurrent scan across the given subnet
   */
  async startScan(
    subnet: SubnetInfo,
    onProgress?: ScanProgressCallback,
    onDeviceFound?: DeviceFoundCallback,
    concurrency = 15
  ): Promise<DiscoveredDevice[]> {
    if (this.isScanning) {
      throw new Error('Un escaneo ya se encuentra en ejecución');
    }

    this.isScanning = true;
    this.shouldCancel = false;
    const discovered: DiscoveredDevice[] = [];
    const hosts = subnet.hosts;
    let scanned = 0;

    // Start Zeroconf mDNS in parallel
    try {
      this.zeroconf.scan('http', 'tcp', 'local.');
      this.zeroconf.on('resolved', (service: any) => {
        if (service?.addresses?.[0]) {
          const ip = service.addresses[0];
          const existing = discovered.find((d) => d.ip === ip);
          if (existing && service.name) {
            existing.name = `${service.name} (mDNS)`;
            if (onDeviceFound) onDeviceFound(existing);
          } else if (!existing && service.name) {
            const mdnsDevice: DiscoveredDevice = {
              ip,
              name: `${service.name} (mDNS)`,
              vendor: 'Dispositivo mDNS',
              type: 'unknown',
              isOnline: true,
              responseTimeMs: 5,
              openPorts: [service.port || 80],
            };
            discovered.push(mdnsDevice);
            if (onDeviceFound) onDeviceFound(mdnsDevice);
          }
        }
      });
    } catch (_) {}

    try {
      // Chunk-based concurrency queue
      for (let i = 0; i < hosts.length; i += concurrency) {
        if (this.shouldCancel) break;

        const chunk = hosts.slice(i, i + concurrency);
        const promises = chunk.map(async (ip) => {
          if (this.shouldCancel) return;

          const dev = await probeHost(ip, this.snmpClient);
          scanned++;

          if (dev) {
            discovered.push(dev);
            if (onDeviceFound) onDeviceFound(dev);

            // Persist to SQLite store
            try {
              const repos = getRepositories();
              await repos.devices.upsert({
                id: `dev_${dev.ip.replace(/\./g, '_')}`,
                ip: dev.ip,
                mac: dev.mac,
                hostname: dev.name,
                vendor: dev.vendor,
                isOnline: true,
                lastSeenAt: Date.now(),
              });
            } catch (_) {
              try {
                const repos = await initDatabase();
                await repos.devices.upsert({
                  id: `dev_${dev.ip.replace(/\./g, '_')}`,
                  ip: dev.ip,
                  mac: dev.mac,
                  hostname: dev.name,
                  vendor: dev.vendor,
                  isOnline: true,
                  lastSeenAt: Date.now(),
                });
              } catch (_) {}
            }
          }

          if (onProgress) {
            onProgress({
              scanned,
              total: hosts.length,
              currentIp: ip,
              foundCount: discovered.length,
              percent: Math.min(100, Math.round((scanned / hosts.length) * 100)),
            });
          }
        });

        await Promise.all(promises);
      }
    } finally {
      this.isScanning = false;
      try {
        this.zeroconf.stop();
        if (typeof (this.zeroconf as any).removeAllListeners === 'function') {
          (this.zeroconf as any).removeAllListeners();
        }
      } catch (_) {}
    }

    return discovered;
  }

  stopScan(): void {
    this.shouldCancel = true;
    try {
      this.zeroconf.stop();
      if (typeof (this.zeroconf as any).removeAllListeners === 'function') {
        (this.zeroconf as any).removeAllListeners();
      }
    } catch (_) {}
  }

  getIsScanning(): boolean {
    return this.isScanning;
  }
}
