import SSHClient from '@dylankenneally/react-native-ssh-sftp';

export interface VendorPreset {
  vendor: 'MikroTik' | 'Cisco' | 'Huawei' | 'Ubiquiti' | 'Linux';
  label: string;
  command: string;
}

export const VENDOR_PRESETS: VendorPreset[] = [
  // MikroTik
  {
    vendor: 'MikroTik',
    label: '/system resource print',
    command: '/system resource print',
  },
  {
    vendor: 'MikroTik',
    label: '/interface print detail',
    command: '/interface print detail',
  },
  {
    vendor: 'MikroTik',
    label: '/ip address print',
    command: '/ip address print',
  },
  {
    vendor: 'MikroTik',
    label: '/system identity print',
    command: '/system identity print',
  },

  // Cisco
  {
    vendor: 'Cisco',
    label: 'show version',
    command: 'show version',
  },
  {
    vendor: 'Cisco',
    label: 'show ip int brief',
    command: 'show ip interface brief',
  },

  // Huawei
  {
    vendor: 'Huawei',
    label: 'display version',
    command: 'display version',
  },
  {
    vendor: 'Huawei',
    label: 'display int brief',
    command: 'display interface brief',
  },

  // Ubiquiti
  {
    vendor: 'Ubiquiti',
    label: 'mca-status',
    command: 'mca-status',
  },
  {
    vendor: 'Ubiquiti',
    label: 'ifconfig',
    command: 'ifconfig',
  },
];

export class SshService {
  /**
   * Connects to host via SSH and executes a single command
   */
  async executeCommand(
    host: string,
    port = 22,
    username = 'admin',
    password = '',
    command = '/system resource print'
  ): Promise<string> {
    try {
      const effectivePassword = typeof password === 'string' ? password : '';
      let client: any = null;

      // Prefer the official connectWithPassword static factory
      if (typeof (SSHClient as any)?.connectWithPassword === 'function') {
        client = await (SSHClient as any).connectWithPassword(
          host,
          port,
          username,
          effectivePassword
        );
      } else {
        // Fallback: constructor requires a callback on Android to prevent "undefined is not a function"
        client = await new Promise((resolve, reject) => {
          let resolved = false;
          try {
            const inst = new (SSHClient as any)(
              host,
              port,
              username,
              effectivePassword,
              (error: any) => {
                if (resolved) return;
                resolved = true;
                if (error) {
                  reject(error);
                } else {
                  resolve(inst);
                }
              }
            );

            // In mocked or sync environments
            if (inst && typeof inst.execute === 'function' && !inst.connect) {
              if (!resolved) {
                resolved = true;
                resolve(inst);
              }
            }
          } catch (initErr) {
            if (!resolved) {
              resolved = true;
              reject(initErr);
            }
          }
        });
      }

      if (client && typeof client.execute === 'function') {
        const output = await client.execute(command);
        if (typeof client.disconnect === 'function') {
          try {
            client.disconnect();
          } catch (_) {}
        }
        return output;
      }
      throw new Error('Librería cliente SSH no disponible en este entorno');
    } catch (err: any) {
      throw new Error(
        `Error SSH en ${username}@${host}:${port} — ${err?.message || 'Fallo de autenticación o tiempo de espera agotado'}`
      );
    }
  }

  private simulateCommandOutput(cmd: string, host: string, user: string): string {
    const cleanCmd = cmd.trim();

    if (cleanCmd.includes('/system resource print')) {
      return (
        `  uptime: 14d12h19m\n` +
        `  version: 7.14.3 (stable)\n` +
        `  build-time: 2026-03-12 10:14:02\n` +
        `  factory-software: 7.6\n` +
        `  free-memory: 89.4MiB\n` +
        `  total-memory: 128.0MiB\n` +
        `  cpu: ARM\n` +
        `  cpu-count: 4\n` +
        `  cpu-frequency: 716MHz\n` +
        `  cpu-load: 22%\n` +
        `  free-hdd-space: 14.1MiB\n` +
        `  total-hdd-space: 16.0MiB\n` +
        `  architecture-name: arm\n` +
        `  board-name: hAP ac2\n` +
        `  platform: MikroTik`
      );
    }

    if (cleanCmd.includes('/interface print')) {
      return (
        `Flags: D - DYNAMIC; R - RUNNING; S - SLAVE\n` +
        `Columns: NAME, TYPE, ACTUAL-MTU, MAC-ADDRESS\n` +
        `#     NAME         TYPE    ACTUAL-MTU  MAC-ADDRESS\n` +
        `0  R  ether1-wan   ether         1500  48:8F:5A:21:44:B0\n` +
        `1  RS ether2-lan   ether         1500  48:8F:5A:21:44:B1\n` +
        `2  RS ether3-lan   ether         1500  48:8F:5A:21:44:B2\n` +
        `3  RS wlan1-2.4G   wlan          1500  48:8F:5A:21:44:B5\n` +
        `4  RS wlan2-5G     wlan          1500  48:8F:5A:21:44:B6`
      );
    }

    if (cleanCmd.includes('show version') || cleanCmd.includes('display version')) {
      return (
        `Cisco IOS Software, C2960 Software (C2960-LANBASEK9-M), Version 15.0(2)SE11\n` +
        `System image file is "flash:/c2960-lanbasek9-mz.150-2.SE11.bin"\n` +
        `cisco WS-C2960-24TC-L (PowerPC405) processor with 65536K bytes of memory.\n` +
        `Base ethernet MAC Address: 00:26:98:A4:7B:33`
      );
    }

    return `[${user}@${host}] > ${cmd}\nCommand executed successfully. Exit code: 0`;
  }
}
