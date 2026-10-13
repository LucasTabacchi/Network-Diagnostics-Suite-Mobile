import { DatabasePort } from '../db/DatabasePort';
import { Installation, InstallationPhoto } from '../models';

export class InstallationRepository {
  constructor(private db: DatabasePort) {}

  async create(inst: Installation): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.execute(
        `INSERT INTO installations (
          id, device_id, device_name, device_ip, device_mac, site_name,
          gps_lat, gps_lng, gps_accuracy, notes, pdf_path, status,
          base_version, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          inst.id,
          inst.deviceId ?? null,
          inst.deviceName,
          inst.deviceIp,
          inst.deviceMac ?? null,
          inst.siteName,
          inst.gpsLat ?? null,
          inst.gpsLng ?? null,
          inst.gpsAccuracy ?? null,
          inst.notes ?? null,
          inst.pdfPath ?? null,
          inst.status,
          inst.baseVersion,
          inst.createdAt,
          inst.updatedAt,
        ]
      );

      if (inst.photos && inst.photos.length > 0) {
        for (const photo of inst.photos) {
          await tx.execute(
            `INSERT INTO installation_photos (
              id, installation_id, file_path, label, captured_at
            ) VALUES (?, ?, ?, ?, ?)`,
            [photo.id, inst.id, photo.filePath, photo.label ?? null, photo.capturedAt]
          );
        }
      }
    });
  }

  async findById(id: string): Promise<Installation | null> {
    const res = await this.db.execute<any>(
      `SELECT * FROM installations WHERE id = ? LIMIT 1`,
      [id]
    );
    if (res.rows.length === 0) return null;

    const photosRes = await this.db.execute<any>(
      `SELECT * FROM installation_photos WHERE installation_id = ?`,
      [id]
    );

    const photos: InstallationPhoto[] = photosRes.rows.map((p) => ({
      id: p.id,
      installationId: p.installation_id,
      filePath: p.file_path,
      label: p.label ?? undefined,
      capturedAt: Number(p.captured_at),
    }));

    return this.mapRowToInstallation(res.rows[0], photos);
  }

  async listAll(): Promise<Installation[]> {
    const res = await this.db.execute<any>(
      `SELECT * FROM installations ORDER BY created_at DESC`
    );
    return res.rows.map((row) => this.mapRowToInstallation(row));
  }

  async update(inst: Partial<Installation> & { id: string }): Promise<void> {
    const updatedAt = Date.now();
    const existing = await this.findById(inst.id);
    if (!existing) return;

    await this.db.execute(
      `UPDATE installations SET 
        device_name = ?,
        notes = ?,
        status = ?,
        base_version = ?,
        updated_at = ?
      WHERE id = ?`,
      [
        inst.deviceName ?? existing.deviceName,
        inst.notes ?? existing.notes ?? null,
        inst.status ?? existing.status,
        inst.baseVersion ?? existing.baseVersion,
        updatedAt,
        inst.id,
      ]
    );
  }

  async updateStatus(
    id: string,
    status: 'synced' | 'pending' | 'conflict',
    updatedAt: number = Date.now()
  ): Promise<void> {
    await this.db.execute(
      `UPDATE installations SET status = ?, updated_at = ? WHERE id = ?`,
      [status, updatedAt, id]
    );
  }

  private mapRowToInstallation(row: any, photos?: InstallationPhoto[]): Installation {
    return {
      id: row.id,
      deviceId: row.device_id ?? undefined,
      deviceName: row.device_name,
      deviceIp: row.device_ip,
      deviceMac: row.device_mac ?? undefined,
      siteName: row.site_name,
      gpsLat: row.gps_lat != null ? Number(row.gps_lat) : undefined,
      gpsLng: row.gps_lng != null ? Number(row.gps_lng) : undefined,
      gpsAccuracy: row.gps_accuracy != null ? Number(row.gps_accuracy) : undefined,
      notes: row.notes ?? undefined,
      pdfPath: row.pdf_path ?? undefined,
      status: row.status as 'synced' | 'pending' | 'conflict',
      baseVersion: Number(row.base_version || 1),
      createdAt: Number(row.created_at),
      updatedAt: Number(row.updated_at),
      photos,
    };
  }
}
