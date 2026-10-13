export interface Device {
  id: string;
  ip: string;
  mac?: string;
  hostname?: string;
  vendor?: string;
  model?: string;
  serialNumber?: string;
  isOnline: boolean;
  lastSeenAt: number;
  cachedSheetJson?: string;
}

export interface Diagnostic {
  id: string;
  deviceId?: string;
  type: 'snmp' | 'ssh';
  target: string;
  rawOutput?: string;
  parsedTelemetryJson?: string;
  status: 'synced' | 'pending' | 'failed';
  createdAt: number;
}

export interface Installation {
  id: string;
  deviceId?: string;
  deviceName: string;
  deviceIp: string;
  deviceMac?: string;
  siteName: string;
  gpsLat?: number;
  gpsLng?: number;
  gpsAccuracy?: number;
  notes?: string;
  pdfPath?: string;
  status: 'synced' | 'pending' | 'conflict';
  baseVersion: number;
  createdAt: number;
  updatedAt: number;
  photos?: InstallationPhoto[];
}

export interface InstallationPhoto {
  id: string;
  installationId: string;
  filePath: string;
  label?: string;
  capturedAt: number;
}

export interface CredentialMetadata {
  id: string;
  alias: string;
  host: string;
  port: number;
  username: string;
  keychainKey: string;
  createdAt: number;
}

export interface OutboxItem {
  id: string;
  entityType: 'diagnostic' | 'installation' | 'report';
  entityId: string;
  payloadJson: string;
  status: 'pending' | 'processing' | 'conflict' | 'synced';
  attempts: number;
  nextRetryAt: number;
  errorMessage?: string;
  createdAt: number;
  updatedAt: number;
}
