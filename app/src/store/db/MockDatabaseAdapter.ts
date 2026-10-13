import { DatabasePort, QueryResult } from './DatabasePort';

export class MockDatabaseAdapter implements DatabasePort {
  public tables: Record<string, any[]> = {};
  public executedStatements: { sql: string; params: any[] }[] = [];

  constructor() {
    this.reset();
  }

  reset(): void {
    this.tables = {
      sites: [],
      devices: [],
      diagnostics: [],
      installations: [],
      installation_photos: [],
      credentials: [],
      outbox: [],
    };
    this.executedStatements = [];
  }

  async execute<T = any>(sql: string, params: any[] = []): Promise<QueryResult<T>> {
    this.executedStatements.push({ sql, params });
    const trimmed = sql.trim();

    // DDL
    if (trimmed.startsWith('CREATE TABLE') || trimmed.startsWith('CREATE INDEX')) {
      return { rows: [], rowsAffected: 0 };
    }

    // INSERT INTO <table> VALUES / (cols)
    if (trimmed.startsWith('INSERT INTO')) {
      const match = trimmed.match(/INSERT INTO\s+(\w+)/i);
      if (match) {
        const table = match[1];
        if (!this.tables[table]) this.tables[table] = [];

        const colMatch = trimmed.match(/INSERT INTO\s+\w+\s*\(([^)]+)\)/i);
        if (colMatch) {
          const cols = colMatch[1].split(',').map((c) => c.trim());
          const obj: any = {};
          cols.forEach((col, idx) => {
            obj[col] = params[idx];
          });
          this.tables[table].push(obj);
          return { rows: [], rowsAffected: 1 };
        }
      }
    }

    // SELECT COUNT(*)
    if (trimmed.toUpperCase().includes('SELECT COUNT(*)')) {
      const fromMatch = trimmed.match(/FROM\s+(\w+)/i);
      if (fromMatch) {
        const table = fromMatch[1];
        let data = this.tables[table] || [];
        if (trimmed.includes("WHERE status != 'synced'")) {
          data = data.filter((row) => row.status !== 'synced');
        }
        return { rows: [{ count: data.length }] as any, rowsAffected: 0 };
      }
    }

    // General SELECT
    if (trimmed.startsWith('SELECT')) {
      const fromMatch = trimmed.match(/FROM\s+(\w+)/i);
      if (fromMatch) {
        const table = fromMatch[1];
        let data = [...(this.tables[table] || [])];

        // Status and next_retry_at (for outbox peekPending)
        if (trimmed.includes("status = 'pending'") && trimmed.includes('next_retry_at <= ?')) {
          const maxRetry = params[0];
          data = data.filter(
            (row) => row.status === 'pending' && Number(row.next_retry_at || 0) <= maxRetry
          );
        } else {
          // Simple single condition WHERE col = ?
          const whereMatch = trimmed.match(/WHERE\s+(\w+)\s*=\s*\?/i);
          if (whereMatch && params.length > 0) {
            const col = whereMatch[1];
            data = data.filter((row) => row[col] === params[0]);
          }
        }

        // Limit
        if (trimmed.includes('LIMIT ?') && params.length > 0) {
          const limit = params[params.length - 1];
          if (typeof limit === 'number') {
            data = data.slice(0, limit);
          }
        } else if (trimmed.includes('LIMIT 1')) {
          data = data.slice(0, 1);
        }

        return { rows: data as T[], rowsAffected: 0 };
      }
    }

    // UPDATE <table> SET ... WHERE <col> = ?
    if (trimmed.startsWith('UPDATE')) {
      const updateMatch = trimmed.match(/UPDATE\s+(\w+)/i);
      if (updateMatch) {
        const table = updateMatch[1];
        const rows = this.tables[table] || [];
        const whereMatch = trimmed.match(/WHERE\s+(\w+)\s*=\s*\?/i);
        if (whereMatch && params.length > 0) {
          const whereCol = whereMatch[1];
          const targetVal = params[params.length - 1];
          let updatedCount = 0;

          // Parse SET clause
          const setMatch = trimmed.match(/SET\s+([\s\S]+?)\s+WHERE/i);
          if (setMatch) {
            const setClauses = setMatch[1].split(',').map((p) => p.trim());
            rows.forEach((row) => {
              if (row[whereCol] === targetVal) {
                updatedCount++;
                let paramIndex = 0;
                setClauses.forEach((clause) => {
                  if (clause.includes('=')) {
                    const [col, expr] = clause.split('=').map((c) => c.trim());
                    if (expr === '?') {
                      row[col] = params[paramIndex++];
                    } else if (clause.includes('attempts + 1')) {
                      row[col] = (Number(row[col]) || 0) + 1;
                    } else {
                      // Static value or other expression
                      const cleanExpr = expr.replace(/'/g, '');
                      row[col] = cleanExpr;
                    }
                  }
                });
              }
            });
          }
          return { rows: [], rowsAffected: updatedCount };
        }
      }
    }

    // DELETE FROM <table> WHERE <col> = ?
    if (trimmed.startsWith('DELETE FROM')) {
      const delMatch = trimmed.match(/DELETE FROM\s+(\w+)/i);
      if (delMatch) {
        const table = delMatch[1];
        const whereMatch = trimmed.match(/WHERE\s+(\w+)\s*=\s*\?/i);
        if (whereMatch && params.length > 0) {
          const col = whereMatch[1];
          const initialLen = this.tables[table]?.length || 0;
          this.tables[table] = (this.tables[table] || []).filter(
            (row) => row[col] !== params[0]
          );
          return { rows: [], rowsAffected: initialLen - this.tables[table].length };
        }
      }
    }

    return { rows: [], rowsAffected: 0 };
  }

  async executeBatch(statements: { sql: string; params?: any[] }[]): Promise<void> {
    for (const stmt of statements) {
      await this.execute(stmt.sql, stmt.params || []);
    }
  }

  async transaction<T>(fn: (tx: DatabasePort) => Promise<T>): Promise<T> {
    return fn(this);
  }

  async close(): Promise<void> {}
}
