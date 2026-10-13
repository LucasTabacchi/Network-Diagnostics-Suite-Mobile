import TcpSocket from 'react-native-tcp-socket';
import { SnmpClient } from '../snmp/SnmpClient';
import { detectVendor, OIDS } from '../snmp/oids';

export interface DiscoveredDevice {
  ip: string;
  mac?: string;
  name: string;
  vendor: string;
  type: 'ont' | 'router' | 'antenna' | 'switch' | 'unknown';
  openPorts: number[];
  isOnline: boolean;
  responseTimeMs: number;
}

export const STRATEGIC_PORTS = [80, 443, 8291, 22, 23, 8080, 3000];

/**
 * Probes a TCP port on a target host with a short timeout
 */
export function probeTcpPort(
  host: string,
  port: number,
  timeoutMs = 400
): Promise<boolean> {
  return new Promise((resolve) => {
    let resolved = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let client: any = null;

    const cleanup = () => {
      if (timer) clearTimeout(timer);
      if (client) {
        try {
          client.destroy();
        } catch (_) {}
      }
    };

    timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        cleanup();
        resolve(false);
      }
    }, timeoutMs);

    try {
      client = TcpSocket.createConnection({ port, host }, () => {
        if (!resolved) {
          resolved = true;
          cleanup();
          resolve(true);
        }
      });
      if (client?.setTimeout) {
        client.setTimeout(timeoutMs);
      }

      client.on('error', () => {
        if (!resolved) {
          resolved = true;
          cleanup();
          resolve(false);
        }
      });

      client.on('timeout', () => {
        if (!resolved) {
          resolved = true;
          cleanup();
          resolve(false);
        }
      });
    } catch (_) {
      if (!resolved) {
        resolved = true;
        cleanup();
        resolve(false);
      }
    }
  });
}

/**
 * Probes a host across strategic ports and SNMP
 */
export async function probeHost(
  host: string,
  snmpClient: SnmpClient = new SnmpClient(),
  ports: number[] = STRATEGIC_PORTS
): Promise<DiscoveredDevice | null> {
  const startTime = Date.now();
  const openPorts: number[] = [];

  // 1. Probe strategic ports in parallel
  const portChecks = ports.map(async (p) => {
    const isOpen = await probeTcpPort(host, p, 350);
    if (isOpen) openPorts.push(p);
  });

  await Promise.all(portChecks);

  // 2. Probe SNMP
  let snmpSuccess = false;
  let sysDescr = '';
  let sysName = '';
  let mac: string | undefined;

  try {
    const snmpRes = await snmpClient.get(
      host,
      [OIDS.SYS_DESCR, OIDS.SYS_NAME, `${OIDS.IF_PHYS_ADDRESS}.1`],
      'public',
      600
    );
    snmpSuccess = true;
    const findVal = (oid: string) =>
      snmpRes.varbinds.find((vb) => vb.oid === oid || vb.oid.startsWith(oid))?.value;

    sysDescr = (findVal(OIDS.SYS_DESCR) as string) || '';
    sysName = (findVal(OIDS.SYS_NAME) as string) || '';
    mac = (findVal(`${OIDS.IF_PHYS_ADDRESS}.1`) as string) || undefined;
  } catch (_) {
    // SNMP timeout or disabled
  }

  const isOnline = openPorts.length > 0 || snmpSuccess;
  if (!isOnline) {
    return null;
  }

  const responseTimeMs = Date.now() - startTime;
  let vendor = detectVendor(sysDescr);

  // Classify device type based on open ports and vendor
  let type: DiscoveredDevice['type'] = 'unknown';
  if (openPorts.includes(8291) || vendor === 'MikroTik') {
    type = 'router';
  } else if (sysDescr.toLowerCase().includes('ont') || sysDescr.toLowerCase().includes('hg8245')) {
    type = 'ont';
  } else if (vendor === 'Ubiquiti' || sysDescr.toLowerCase().includes('airmax')) {
    type = 'antenna';
  } else if (openPorts.includes(22) && openPorts.includes(80)) {
    type = 'router';
  } else if (openPorts.includes(80) || openPorts.includes(443)) {
    type = 'switch';
  } else if (openPorts.includes(3000)) {
    type = 'router';
  }

  if (vendor === 'Genérico / Desconocido' && openPorts.includes(3000)) {
    vendor = 'NetDiag Core';
  }

  const name =
    sysName ||
    (openPorts.includes(3000) && !sysName
      ? `Nodo Central Sync (${host})`
      : vendor !== 'Genérico / Desconocido'
      ? `${vendor} (${host})`
      : `Equipo ${host}`);

  return {
    ip: host,
    mac,
    name,
    vendor,
    type,
    openPorts,
    isOnline: true,
    responseTimeMs,
  };
}
