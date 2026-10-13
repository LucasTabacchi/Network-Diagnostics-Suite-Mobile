import { DatabasePort } from '../db/DatabasePort';
import { Device } from '../models';

export class DeviceRepository {
  constructor(private db: DatabasePort) {}

  async upsert(device: Device): Promise<void> {
    const existing = await this.findByIp(device.ip);
    if (existing) {
      await this.db.execute(
        `UPDATE devices SET
          mac = ?,
          hostname = ?,
          vendor = ?,
          model = ?,
          serial_number = ?,
          is_online = ?,
          last_seen_at = ?,
          cached_sheet_json = ?
        WHERE ip = ?`,
        [
          device.mac ?? existing.mac,
          device.hostname ?? existing.hostname,
          device.vendor ?? existing.vendor,
          device.model ?? existing.model,
          device.serialNumber ?? existing.serialNumber,
          device.isOnline ? 1 : 0,
          device.lastSeenAt,
          device.cachedSheetJson ?? existing.cachedSheetJson,
          device.ip,
        ]
      );
    } else {
      await this.db.execute(
        `INSERT INTO devices (
          id, ip, mac, hostname, vendor, model, serial_number, is_online, last_seen_at, cached_sheet_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          device.id,
          device.ip,
          device.mac ?? null,
          device.hostname ?? null,
          device.vendor ?? null,
          device.model ?? null,
          device.serialNumber ?? null,
          device.isOnline ? 1 : 0,
          device.lastSeenAt,
          device.cachedSheetJson ?? null,
        ]
      );
    }
  }

  async findByIp(ip: string): Promise<Device | null> {
    const res = await this.db.execute<any>(
      `SELECT * FROM devices WHERE ip = ? LIMIT 1`,
      [ip]
    );
    if (res.rows.length === 0) return null;
    return this.mapRowToDevice(res.rows[0]);
  }

  async findByMac(mac: string): Promise<Device | null> {
    const res = await this.db.execute<any>(
      `SELECT * FROM devices WHERE mac = ? LIMIT 1`,
      [mac]
    );
    if (res.rows.length === 0) return null;
    return this.mapRowToDevice(res.rows[0]);
  }

  async listAll(): Promise<Device[]> {
    const res = await this.db.execute<any>(
      `SELECT * FROM devices ORDER BY last_seen_at DESC`
    );
    return res.rows.map(this.mapRowToDevice);
  }

  private mapRowToDevice(row: any): Device {
    return {
      id: row.id,
      ip: row.ip,
      mac: row.mac ?? undefined,
      hostname: row.hostname ?? undefined,
      vendor: row.vendor ?? undefined,
      model: row.model ?? undefined,
      serialNumber: row.serial_number ?? undefined,
      isOnline: Boolean(row.is_online),
      lastSeenAt: Number(row.last_seen_at),
      cachedSheetJson: row.cached_sheet_json ?? undefined,
    };
  }
}
