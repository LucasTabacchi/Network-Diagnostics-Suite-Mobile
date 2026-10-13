import { DatabasePort } from './db/DatabasePort';
import { OpSqliteAdapter } from './db/OpSqliteAdapter';
import { MockDatabaseAdapter } from './db/MockDatabaseAdapter';
import { initializeSchema, SCHEMA_SQL } from './schema';
import { DeviceRepository } from './repositories/DeviceRepository';
import { DiagnosticRepository } from './repositories/DiagnosticRepository';
import { InstallationRepository } from './repositories/InstallationRepository';
import { CredentialRepository } from './repositories/CredentialRepository';
import { OutboxRepository } from './repositories/OutboxRepository';

export * from './models';
export * from './schema';
export * from './db/DatabasePort';
export * from './db/OpSqliteAdapter';
export * from './db/MockDatabaseAdapter';
export * from './repositories/DeviceRepository';
export * from './repositories/DiagnosticRepository';
export * from './repositories/InstallationRepository';
export * from './repositories/CredentialRepository';
export * from './repositories/OutboxRepository';

export interface DatabaseRepositories {
  db: DatabasePort;
  devices: DeviceRepository;
  diagnostics: DiagnosticRepository;
  installations: InstallationRepository;
  credentials: CredentialRepository;
  outbox: OutboxRepository;
}

export function createRepositories(db: DatabasePort): DatabaseRepositories {
  return {
    db,
    devices: new DeviceRepository(db),
    diagnostics: new DiagnosticRepository(db),
    installations: new InstallationRepository(db),
    credentials: new CredentialRepository(db),
    outbox: new OutboxRepository(db),
  };
}

let activeRepos: DatabaseRepositories | null = null;

export async function initDatabase(customDb?: DatabasePort): Promise<DatabaseRepositories> {
  const db = customDb || new OpSqliteAdapter();
  await initializeSchema(db);
  activeRepos = createRepositories(db);
  return activeRepos;
}

export function getRepositories(): DatabaseRepositories {
  if (!activeRepos) {
    throw new Error('Database has not been initialized. Call initDatabase() first.');
  }
  return activeRepos;
}
