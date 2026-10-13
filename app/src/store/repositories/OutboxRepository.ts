import { DatabasePort } from '../db/DatabasePort';
import { OutboxItem } from '../models';

export class OutboxRepository {
  constructor(private db: DatabasePort) {}

  async enqueue(
    item: Omit<OutboxItem, 'attempts' | 'nextRetryAt' | 'createdAt' | 'updatedAt'>
  ): Promise<void> {
    const now = Date.now();
    await this.db.execute(
      `INSERT INTO outbox (
        id, entity_type, entity_id, payload_json, status, attempts, next_retry_at, error_message, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        item.id,
        item.entityType,
        item.entityId,
        item.payloadJson,
        item.status || 'pending',
        0,
        0,
        null,
        now,
        now,
      ]
    );
  }

  async peekPending(now = Date.now(), limit = 10): Promise<OutboxItem[]> {
    const res = await this.db.execute<any>(
      `SELECT * FROM outbox 
       WHERE status = 'pending' AND next_retry_at <= ? 
       ORDER BY created_at ASC LIMIT ?`,
      [now, limit]
    );
    return res.rows.map(this.mapRow);
  }

  async markSuccess(id: string): Promise<void> {
    const now = Date.now();
    await this.db.execute(
      `UPDATE outbox SET status = 'synced', updated_at = ? WHERE id = ?`,
      [now, id]
    );
  }

  async markRetry(id: string, nextRetryAt: number, errorMessage: string): Promise<void> {
    const now = Date.now();
    await this.db.execute(
      `UPDATE outbox SET 
        attempts = attempts + 1,
        next_retry_at = ?,
        error_message = ?,
        updated_at = ?
      WHERE id = ?`,
      [nextRetryAt, errorMessage, now, id]
    );
  }

  async markConflict(id: string, errorMessage: string): Promise<void> {
    const now = Date.now();
    await this.db.execute(
      `UPDATE outbox SET 
        status = 'conflict',
        error_message = ?,
        updated_at = ?
      WHERE id = ?`,
      [errorMessage, now, id]
    );
  }

  async countPending(): Promise<number> {
    const res = await this.db.execute<any>(
      `SELECT COUNT(*) as count FROM outbox WHERE status != 'synced'`
    );
    return res.rows[0]?.count ? Number(res.rows[0].count) : 0;
  }

  async listAll(limit = 50): Promise<OutboxItem[]> {
    const res = await this.db.execute<any>(
      `SELECT * FROM outbox ORDER BY created_at DESC LIMIT ?`,
      [limit]
    );
    return res.rows.map(this.mapRow);
  }

  private mapRow(row: any): OutboxItem {
    return {
      id: row.id,
      entityType: row.entity_type as 'diagnostic' | 'installation' | 'report',
      entityId: row.entity_id,
      payloadJson: row.payload_json,
      status: row.status as 'pending' | 'processing' | 'conflict' | 'synced',
      attempts: Number(row.attempts),
      nextRetryAt: Number(row.next_retry_at),
      errorMessage: row.error_message ?? undefined,
      createdAt: Number(row.created_at),
      updatedAt: Number(row.updated_at),
    };
  }
}
