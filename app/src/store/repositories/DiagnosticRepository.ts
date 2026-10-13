import { DatabasePort } from '../db/DatabasePort';
import { Diagnostic } from '../models';

export class DiagnosticRepository {
  constructor(private db: DatabasePort) {}

  async create(diag: Diagnostic): Promise<void> {
    await this.db.execute(
      `INSERT INTO diagnostics (
        id, device_id, type, target, raw_output, parsed_telemetry_json, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        diag.id,
        diag.deviceId ?? null,
        diag.type,
        diag.target,
        diag.rawOutput ?? null,
        diag.parsedTelemetryJson ?? null,
        diag.status,
        diag.createdAt,
      ]
    );
  }

  async listByDeviceId(deviceId: string): Promise<Diagnostic[]> {
    const res = await this.db.execute<any>(
      `SELECT * FROM diagnostics WHERE device_id = ? ORDER BY created_at DESC`,
      [deviceId]
    );
    return res.rows.map(this.mapRow);
  }

  async findById(id: string): Promise<Diagnostic | null> {
    const res = await this.db.execute<any>(
      `SELECT * FROM diagnostics WHERE id = ? LIMIT 1`,
      [id]
    );
    if (!res.rows.length) return null;
    return this.mapRow(res.rows[0]);
  }

  async listAll(limit = 50): Promise<Diagnostic[]> {
    const res = await this.db.execute<any>(
      `SELECT * FROM diagnostics ORDER BY created_at DESC LIMIT ?`,
      [limit]
    );
    return res.rows.map(this.mapRow);
  }

  private mapRow(row: any): Diagnostic {
    return {
      id: row.id,
      deviceId: row.device_id ?? undefined,
      type: row.type as 'snmp' | 'ssh',
      target: row.target,
      rawOutput: row.raw_output ?? undefined,
      parsedTelemetryJson: row.parsed_telemetry_json ?? undefined,
      status: row.status as 'synced' | 'pending' | 'failed',
      createdAt: Number(row.created_at),
    };
  }
}
