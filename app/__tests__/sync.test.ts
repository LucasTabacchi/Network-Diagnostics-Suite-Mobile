import { SyncWorker, conflictStore } from '../src/sync/SyncWorker';
import { MockDatabaseAdapter } from '../src/store/db/MockDatabaseAdapter';
import { initializeSchema } from '../src/store/schema';
import { createRepositories, DatabaseRepositories } from '../src/store';
import { Installation } from '../src/store/models';

describe('T8: Sync Worker & Conflict Handling', () => {
  let db: MockDatabaseAdapter;
  let repos: DatabaseRepositories;

  const originalFetch = globalThis.fetch;

  beforeEach(async () => {
    db = new MockDatabaseAdapter();
    await initializeSchema(db);
    repos = createRepositories(db);
    conflictStore.clear();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('Exponential Backoff Calculation', () => {
    it('calculates correct backoff intervals with 5-minute cap', () => {
      expect(SyncWorker.calculateBackoff(0)).toBe(2000);
      expect(SyncWorker.calculateBackoff(1)).toBe(4000);
      expect(SyncWorker.calculateBackoff(2)).toBe(8000);
      expect(SyncWorker.calculateBackoff(3)).toBe(16000);
      expect(SyncWorker.calculateBackoff(10)).toBe(300000); // capped at 5 minutes
    });
  });

  describe('Sync Process with Backend', () => {
    it('successfully pushes pending outbox items and marks them synced', async () => {
      const instId = 'inst-sync-01';
      const outboxId = 'outbox-sync-01';

      // Seed installation
      const inst: Installation = {
        id: instId,
        deviceName: 'Router MikroTik hAP ac2',
        deviceIp: '192.168.1.1',
        siteName: 'Sitio Azotea Norte',
        status: 'pending',
        baseVersion: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await repos.installations.create(inst);

      // Seed outbox
      await repos.outbox.enqueue({
        id: outboxId,
        entityType: 'installation',
        entityId: instId,
        payloadJson: JSON.stringify(inst),
        status: 'pending',
      });

      // Mock fetch 200 OK
      globalThis.fetch = jest.fn().mockImplementation(async () => ({
        status: 200,
        json: async () => ({
          status: 'success',
          processed: 1,
          results: [{ id: outboxId, status: 'synced', version: 2 }],
        }),
      }));

      const res = await SyncWorker.syncAll({ repos });
      expect(res.syncedCount).toBe(1);
      expect(res.conflictCount).toBe(0);

      // Verify outbox updated
      const pendingAfter = await repos.outbox.peekPending(Date.now(), 10);
      expect(pendingAfter.length).toBe(0);

      // Verify installation status updated
      const updatedInst = await repos.installations.findById(instId);
      expect(updatedInst?.status).toBe('synced');
    });

    it('handles 409 conflict, stores conflict details and marks status conflict', async () => {
      const instId = 'inst-conflict-01';
      const outboxId = 'outbox-conflict-01';

      const inst: Installation = {
        id: instId,
        deviceName: 'Router MikroTik hAP ac2',
        deviceIp: '192.168.1.1',
        siteName: 'Sitio Azotea Norte',
        notes: 'Notas locales del técnico',
        status: 'pending',
        baseVersion: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await repos.installations.create(inst);

      await repos.outbox.enqueue({
        id: outboxId,
        entityType: 'installation',
        entityId: instId,
        payloadJson: JSON.stringify(inst),
        status: 'pending',
      });

      // Mock fetch 409 Conflict
      globalThis.fetch = jest.fn().mockImplementation(async () => ({
        status: 409,
        json: async () => ({
          error: 'Conflict detected',
          conflictId: outboxId,
          entityId: instId,
          serverVersion: {
            id: instId,
            deviceName: 'Router MikroTik hAP ac2',
            notes: 'Notas distintas en el servidor',
            version: 2,
          },
          localVersion: inst,
        }),
      }));

      const res = await SyncWorker.syncAll({ repos });
      expect(res.conflictCount).toBe(1);

      // Check conflict store
      expect(conflictStore.has(outboxId)).toBe(true);
      const conf = conflictStore.get(outboxId);
      expect(conf?.serverVersion.notes).toBe('Notas distintas en el servidor');

      // Check installation updated to conflict
      const instAfter = await repos.installations.findById(instId);
      expect(instAfter?.status).toBe('conflict');
    });

    it('resolves conflict using keep_local or use_server', async () => {
      const conflictId = 'outbox-conf-resolve';
      const entityId = 'inst-conf-resolve';

      const inst: Installation = {
        id: entityId,
        deviceName: 'Switch Cisco',
        deviceIp: '192.168.1.10',
        siteName: 'Central',
        notes: 'Notas locales',
        status: 'conflict',
        baseVersion: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await repos.installations.create(inst);

      conflictStore.set(conflictId, {
        conflictId,
        entityId,
        entityType: 'installation',
        localVersion: inst,
        serverVersion: {
          deviceName: 'Switch Cisco',
          notes: 'Notas aprobadas en NOC central',
          version: 3,
        },
      });

      // Resolve with 'use_server'
      await SyncWorker.resolveConflict(conflictId, 'use_server', repos);
      expect(conflictStore.has(conflictId)).toBe(false);

      const resolvedInst = await repos.installations.findById(entityId);
      expect(resolvedInst?.notes).toBe('Notas aprobadas en NOC central');
      expect(resolvedInst?.status).toBe('synced');
    });

    it('resolves conflict using keep_local by re-pushing local data', async () => {
      const conflictId = 'outbox-conf-keep-local';
      const entityId = 'inst-conf-keep-local';

      const inst: Installation = {
        id: entityId,
        deviceName: 'Switch Ubiquiti',
        deviceIp: '192.168.1.20',
        siteName: 'Nodo Sur',
        notes: 'Notas locales críticas',
        status: 'conflict',
        baseVersion: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await repos.installations.create(inst);
      await repos.outbox.enqueue({
        id: conflictId,
        entityType: 'installation',
        entityId,
        payloadJson: JSON.stringify(inst),
        status: 'conflict',
      });

      conflictStore.set(conflictId, {
        conflictId,
        entityId,
        entityType: 'installation',
        localVersion: inst,
        serverVersion: {
          deviceName: 'Switch Ubiquiti',
          notes: 'Notas desactualizadas del servidor',
          version: 2,
        },
      });

      // Mock fetch 200 OK on force push
      globalThis.fetch = jest.fn().mockImplementation(async () => ({
        status: 200,
        json: async () => ({
          status: 'success',
          processed: 1,
          results: [{ id: conflictId, status: 'synced', version: 3 }],
        }),
      }));

      await SyncWorker.resolveConflict(conflictId, 'keep_local', repos);
      expect(conflictStore.has(conflictId)).toBe(false);

      const resolvedInst = await repos.installations.findById(entityId);
      expect(resolvedInst?.notes).toBe('Notas locales críticas');
      expect(resolvedInst?.status).toBe('synced');
    });

    it('retries with exponential backoff on network failure', async () => {
      const outboxId = 'outbox-err-01';

      await repos.outbox.enqueue({
        id: outboxId,
        entityType: 'diagnostic',
        entityId: 'diag-01',
        payloadJson: JSON.stringify({ test: true }),
        status: 'pending',
      });

      // Mock network exception
      globalThis.fetch = jest.fn().mockImplementation(async () => {
        throw new Error('Network request failed');
      });

      const res = await SyncWorker.syncAll({ repos });
      expect(res.errorCount).toBe(1);

      // Items with future next_retry_at are not immediately pending at current moment
      const pendingRightNow = await repos.outbox.peekPending(Date.now(), 10);
      expect(pendingRightNow.length).toBe(0);

      // But should be visible in future query
      const pendingFuture = await repos.outbox.peekPending(Date.now() + 10000, 10);
      expect(pendingFuture.length).toBe(1);
    });
  });
});
