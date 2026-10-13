export interface QueryResult<T = any> {
  rows: T[];
  insertId?: number;
  rowsAffected: number;
}

export interface DatabasePort {
  execute<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>>;
  executeBatch(statements: { sql: string; params?: any[] }[]): Promise<void>;
  transaction<T>(fn: (tx: DatabasePort) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}
