export const OIDS = {
  // MIB-II System Group
  SYS_DESCR: '1.3.6.1.2.1.1.1.0',
  SYS_OBJECT_ID: '1.3.6.1.2.1.1.2.0',
  SYS_UPTIME: '1.3.6.1.2.1.1.3.0',
  SYS_CONTACT: '1.3.6.1.2.1.1.4.0',
  SYS_NAME: '1.3.6.1.2.1.1.5.0',
  SYS_LOCATION: '1.3.6.1.2.1.1.6.0',

  // Interfaces Table Prefix
  IF_NUMBER: '1.3.6.1.2.1.2.1.0',
  IF_DESCR: '1.3.6.1.2.1.2.2.1.2',
  IF_TYPE: '1.3.6.1.2.1.2.2.1.3',
  IF_SPEED: '1.3.6.1.2.1.2.2.1.5',
  IF_PHYS_ADDRESS: '1.3.6.1.2.1.2.2.1.6',
  IF_ADMIN_STATUS: '1.3.6.1.2.1.2.2.1.7',
  IF_OPER_STATUS: '1.3.6.1.2.1.2.2.1.8',
  IF_IN_OCTETS: '1.3.6.1.2.1.2.2.1.10',
  IF_OUT_OCTETS: '1.3.6.1.2.1.2.2.1.16',

  // Host Resources / Vendor Specific
  HR_PROCESSOR_LOAD: '1.3.6.1.2.1.25.3.3.1.2.1',
  MIKROTIK_CPU_LOAD: '1.3.6.1.4.1.14988.1.1.1.3.1.0',
  MIKROTIK_TEMP: '1.3.6.1.4.1.14988.1.1.3.10.0',
  CISCO_CPU_5MIN: '1.3.6.1.4.1.9.9.109.1.1.1.1.8.1',
} as const;

export interface InterfaceTelemetry {
  index: number;
  name: string;
  mac?: string;
  adminUp: boolean;
  operUp: boolean;
  rxBytes: number;
  txBytes: number;
}

export interface DeviceTelemetry {
  sysName?: string;
  sysDescr?: string;
  sysUptime?: number;
  uptimeFormatted?: string;
  vendor?: string;
  cpuLoad?: number;
  temperature?: number;
  interfaces: InterfaceTelemetry[];
}

/**
 * Converts timeticks (hundredths of a second) to a human-readable duration
 */
export function formatUptime(timeticks: number): string {
  const totalSeconds = Math.floor(timeticks / 100);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Formats byte counts into human-readable strings (KB, MB, GB)
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(2)} GB`;
}

/**
 * Detects network hardware vendor from sysDescr string
 */
export function detectVendor(sysDescr = ''): string {
  const lower = sysDescr.toLowerCase();
  if (lower.includes('routeros') || lower.includes('mikrotik')) return 'MikroTik';
  if (lower.includes('cisco') || lower.includes('ios-xe') || lower.includes('ios')) return 'Cisco';
  if (lower.includes('huawei') || lower.includes('vrp')) return 'Huawei';
  if (lower.includes('ubiquiti') || lower.includes('edgerouter') || lower.includes('unifi') || lower.includes('edgeos')) return 'Ubiquiti';
  if (lower.includes('linux')) return 'Linux / Generic';
  return 'Genérico / Desconocido';
}
