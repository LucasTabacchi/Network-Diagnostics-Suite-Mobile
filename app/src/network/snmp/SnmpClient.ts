import dgram from 'react-native-udp';
import { Buffer } from 'buffer';
import { buildGetRequest, parseSnmpPacket, SnmpPacket } from './pdu';
import {
  OIDS,
  DeviceTelemetry,
  InterfaceTelemetry,
  formatUptime,
  detectVendor,
} from './oids';

export interface UdpSocketPort {
  send(
    data: any,
    offset: number,
    length: number,
    port: number,
    address: string,
    callback?: (err?: any) => void
  ): void;
  on(event: 'message', callback: (msg: any, rinfo: { address: string; port: number }) => void): void;
  on(event: 'error', callback: (err: any) => void): void;
  bind(port?: number, address?: string, callback?: () => void): void;
  close(): void;
}

export class SnmpClient {
  constructor(
    private socketFactory: () => UdpSocketPort = () =>
      (dgram as any).createSocket({ type: 'udp4' }) as UdpSocketPort
  ) {}

  /**
   * Send an SNMP GET request to host:port and await response
   */
  async get(
    host: string,
    oids: string[],
    community = 'public',
    timeoutMs = 3000,
    port = 161
  ): Promise<SnmpPacket> {
    return new Promise((resolve, reject) => {
      const socket = this.socketFactory();
      const requestId = Math.floor(Math.random() * 0x7fffffff);
      const packet = buildGetRequest(oids, community, requestId);

      let timer: ReturnType<typeof setTimeout> | null = null;

      const cleanup = () => {
        if (timer) clearTimeout(timer);
        try {
          socket.close();
        } catch (_) {}
      };

      timer = setTimeout(() => {
        cleanup();
        reject(new Error(`SNMP request timeout to ${host}:${port}`));
      }, timeoutMs);

      socket.on('error', (err) => {
        cleanup();
        reject(err);
      });

      socket.on('message', (msg, rinfo) => {
        try {
          // Normalize msg to Uint8Array
          let uint8: Uint8Array;
          if (Buffer.isBuffer(msg)) {
            uint8 = new Uint8Array(msg);
          } else if (msg instanceof Uint8Array) {
            uint8 = msg;
          } else {
            uint8 = new Uint8Array(msg);
          }

          const response = parseSnmpPacket(uint8);
          if (response.requestId === requestId) {
            if (response.errorStatus !== 0) {
              const errNames: Record<number, string> = {
                1: 'tooBig',
                2: 'noSuchName',
                3: 'badValue',
                4: 'readOnly',
                5: 'genErr',
              };
              const errDesc = errNames[response.errorStatus] || `código ${response.errorStatus}`;
              cleanup();
              reject(
                new Error(
                  `Error SNMP ${errDesc} en índice ${response.errorIndex} devuelto por ${host}`
                )
              );
              return;
            }
            cleanup();
            resolve(response);
          }
        } catch (err) {
          cleanup();
          reject(err);
        }
      });

      // Bind to an ephemeral port then send
      socket.bind(0, '0.0.0.0', () => {
        const buf = Buffer.from(packet);
        socket.send(buf, 0, buf.length, port, host, (err) => {
          if (err) {
            cleanup();
            reject(err);
          }
        });
      });
    });
  }

  /**
   * Perform comprehensive telemetry query for system, CPU and first interface
   */
  async queryDeviceTelemetry(host: string, community = 'public'): Promise<DeviceTelemetry> {
    try {
      const response = await this.get(
        host,
        [
          OIDS.SYS_DESCR,
          OIDS.SYS_UPTIME,
          OIDS.SYS_NAME,
          OIDS.MIKROTIK_CPU_LOAD,
          OIDS.HR_PROCESSOR_LOAD,
          `${OIDS.IF_DESCR}.1`,
          `${OIDS.IF_PHYS_ADDRESS}.1`,
          `${OIDS.IF_IN_OCTETS}.1`,
          `${OIDS.IF_OUT_OCTETS}.1`,
          `${OIDS.IF_ADMIN_STATUS}.1`,
          `${OIDS.IF_OPER_STATUS}.1`,
        ],
        community,
        3500
      );

      const findVal = (oid: string) =>
        response.varbinds.find((vb) => vb.oid === oid || vb.oid.startsWith(oid))?.value;

      const sysDescr = (findVal(OIDS.SYS_DESCR) as string) || '';
      const sysUptime = (findVal(OIDS.SYS_UPTIME) as number) || 0;
      const sysName = (findVal(OIDS.SYS_NAME) as string) || '';

      const cpuLoad =
        (findVal(OIDS.MIKROTIK_CPU_LOAD) as number) ??
        (findVal(OIDS.HR_PROCESSOR_LOAD) as number) ??
        undefined;

      const ifName = (findVal(`${OIDS.IF_DESCR}.1`) as string) || 'ether1';
      const ifMac = (findVal(`${OIDS.IF_PHYS_ADDRESS}.1`) as string) || undefined;
      const rxBytes = (findVal(`${OIDS.IF_IN_OCTETS}.1`) as number) || 0;
      const txBytes = (findVal(`${OIDS.IF_OUT_OCTETS}.1`) as number) || 0;
      const adminUp = Number(findVal(`${OIDS.IF_ADMIN_STATUS}.1`)) === 1;
      const operUp = Number(findVal(`${OIDS.IF_OPER_STATUS}.1`)) === 1;

      const ifaces: InterfaceTelemetry[] = [
        {
          index: 1,
          name: ifName,
          mac: ifMac,
          adminUp,
          operUp,
          rxBytes,
          txBytes,
        },
      ];

      return {
        sysName,
        sysDescr,
        sysUptime,
        uptimeFormatted: sysUptime ? formatUptime(sysUptime) : '—',
        vendor: detectVendor(sysDescr),
        cpuLoad,
        interfaces: ifaces,
      };
    } catch (error: any) {
      throw new Error(
        `Error de telemetría SNMP en ${host}: ${error?.message || 'Equipo no responde'}`
      );
    }
  }
}
