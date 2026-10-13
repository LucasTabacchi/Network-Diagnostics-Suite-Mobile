import { open, DB, SQLBatchTuple } from '@op-engineering/op-sqlite';
import { DatabasePort, QueryResult } from './DatabasePort';

export class OpSqliteAdapter implements DatabasePort {
  private db: DB;

  constructor(dbName = 'netdiag.sqlite') {
    this.db = open({ name: dbName });
  }

  async execute<T = any>(sql: string, params: any[] = []): Promise<QueryResult<T>> {
    const res = await this.db.execute(sql, params);
    return {
      rows: (res.rows as unknown as T[]) ?? [],
      insertId: res.insertId,
      rowsAffected: res.rowsAffected ?? 0,
    };
  }

  async executeBatch(statements: { sql: string; params?: any[] }[]): Promise<void> {
    const formatted: SQLBatchTuple[] = statements.map((s) => [s.sql, s.params ?? []]);
    await this.db.executeBatch(formatted);
  }

  async transaction<T>(fn: (tx: DatabasePort) => Promise<T>): Promise<T> {
    let result: T;
    await this.db.transaction(async (rawTx) => {
      const txAdapter: DatabasePort = {
        execute: async <U = any>(sql: string, params: any[] = []): Promise<QueryResult<U>> => {
          const res = await rawTx.execute(sql, params);
          return {
            rows: (res.rows as unknown as U[]) ?? [],
            insertId: res.insertId,
            rowsAffected: res.rowsAffected ?? 0,
          };
        },
        executeBatch: async () => {
          throw new Error('executeBatch is not supported inside an existing transaction');
        },
        transaction: () => {
          throw new Error('Nested transactions are not supported');
        },
        close: async () => {},
      };
      result = await fn(txAdapter);
    });
    return result!;
  }

  async close(): Promise<void> {
    await this.db.closeAsync();
  }
}
