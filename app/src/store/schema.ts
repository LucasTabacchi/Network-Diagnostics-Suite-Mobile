import { DatabasePort } from './db/DatabasePort';

export const SCHEMA_SQL = [
  // 1. Sites
  `CREATE TABLE IF NOT EXISTS sites (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    location TEXT,
    created_at INTEGER NOT NULL
  );`,

  // 2. Devices
  `CREATE TABLE IF NOT EXISTS devices (
    id TEXT PRIMARY KEY,
    ip TEXT NOT NULL,
    mac TEXT,
    hostname TEXT,
    vendor TEXT,
    model TEXT,
    serial_number TEXT,
    is_online INTEGER NOT NULL DEFAULT 1,
    last_seen_at INTEGER NOT NULL,
    cached_sheet_json TEXT
  );`,
  `CREATE INDEX IF NOT EXISTS idx_devices_ip ON devices(ip);`,
  `CREATE INDEX IF NOT EXISTS idx_devices_mac ON devices(mac);`,
  `CREATE INDEX IF NOT EXISTS idx_devices_sn ON devices(serial_number);`,

  // 3. Diagnostics
  `CREATE TABLE IF NOT EXISTS diagnostics (
    id TEXT PRIMARY KEY,
    device_id TEXT,
    type TEXT NOT NULL, -- 'snmp' | 'ssh'
    target TEXT NOT NULL, -- IP address
    raw_output TEXT,
    parsed_telemetry_json TEXT,
    status TEXT NOT NULL DEFAULT 'pending', -- 'synced' | 'pending' | 'failed'
    created_at INTEGER NOT NULL,
    FOREIGN KEY(device_id) REFERENCES devices(id) ON DELETE SET NULL
  );`,
  `CREATE INDEX IF NOT EXISTS idx_diagnostics_device ON diagnostics(device_id);`,
  `CREATE INDEX IF NOT EXISTS idx_diagnostics_status ON diagnostics(status);`,

  // 4. Installations
  `CREATE TABLE IF NOT EXISTS installations (
    id TEXT PRIMARY KEY,
    device_id TEXT,
    device_name TEXT NOT NULL,
    device_ip TEXT NOT NULL,
    device_mac TEXT,
    site_name TEXT NOT NULL,
    gps_lat REAL,
    gps_lng REAL,
    gps_accuracy REAL,
    notes TEXT,
    pdf_path TEXT,
    status TEXT NOT NULL DEFAULT 'pending', -- 'synced' | 'pending' | 'conflict'
    base_version INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY(device_id) REFERENCES devices(id) ON DELETE SET NULL
  );`,
  `CREATE INDEX IF NOT EXISTS idx_installations_status ON installations(status);`,

  // 5. Installation Photos
  `CREATE TABLE IF NOT EXISTS installation_photos (
    id TEXT PRIMARY KEY,
    installation_id TEXT NOT NULL,
    file_path TEXT NOT NULL,
    label TEXT,
    captured_at INTEGER NOT NULL,
    FOREIGN KEY(installation_id) REFERENCES installations(id) ON DELETE CASCADE
  );`,
  `CREATE INDEX IF NOT EXISTS idx_photos_installation ON installation_photos(installation_id);`,

  // 6. Credentials (passwords stored strictly in Keychain/Keystore by key "cred:" + id)
  `CREATE TABLE IF NOT EXISTS credentials (
    id TEXT PRIMARY KEY,
    alias TEXT NOT NULL,
    host TEXT NOT NULL,
    port INTEGER NOT NULL DEFAULT 22,
    username TEXT NOT NULL,
    keychain_key TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );`,
  `CREATE INDEX IF NOT EXISTS idx_credentials_host ON credentials(host);`,

  // 7. Outbox (Offline-first sync queue)
  `CREATE TABLE IF NOT EXISTS outbox (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL, -- 'diagnostic' | 'installation' | 'report'
    entity_id TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'processing' | 'conflict' | 'synced'
    attempts INTEGER NOT NULL DEFAULT 0,
    next_retry_at INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );`,
  `CREATE INDEX IF NOT EXISTS idx_outbox_status_retry ON outbox(status, next_retry_at);`,
];

export async function initializeSchema(db: DatabasePort): Promise<void> {
  for (const sql of SCHEMA_SQL) {
    await db.execute(sql);
  }
}
