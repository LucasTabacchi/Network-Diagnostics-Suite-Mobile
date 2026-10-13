import { DatabasePort } from '../db/DatabasePort';
import { CredentialMetadata } from '../models';

export class CredentialRepository {
  constructor(private db: DatabasePort) {}

  async create(cred: CredentialMetadata): Promise<void> {
    await this.db.execute(
      `INSERT INTO credentials (
        id, alias, host, port, username, keychain_key, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        cred.id,
        cred.alias,
        cred.host,
        cred.port,
        cred.username,
        cred.keychainKey,
        cred.createdAt,
      ]
    );
  }

  async findById(id: string): Promise<CredentialMetadata | null> {
    const res = await this.db.execute<any>(
      `SELECT * FROM credentials WHERE id = ? LIMIT 1`,
      [id]
    );
    if (res.rows.length === 0) return null;
    return this.mapRow(res.rows[0]);
  }

  async findByHost(host: string): Promise<CredentialMetadata[]> {
    const res = await this.db.execute<any>(
      `SELECT * FROM credentials WHERE host = ? ORDER BY created_at DESC`,
      [host]
    );
    return res.rows.map(this.mapRow);
  }

  async listAll(): Promise<CredentialMetadata[]> {
    const res = await this.db.execute<any>(
      `SELECT * FROM credentials ORDER BY created_at DESC`
    );
    return res.rows.map(this.mapRow);
  }

  async delete(id: string): Promise<void> {
    await this.db.execute(`DELETE FROM credentials WHERE id = ?`, [id]);
  }

  private mapRow(row: any): CredentialMetadata {
    return {
      id: row.id,
      alias: row.alias,
      host: row.host,
      port: Number(row.port),
      username: row.username,
      keychainKey: row.keychain_key,
      createdAt: Number(row.created_at),
    };
  }
}
