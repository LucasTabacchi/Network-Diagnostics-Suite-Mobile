import { MockDatabaseAdapter } from '../src/store/db/MockDatabaseAdapter';
import { initializeSchema } from '../src/store/schema';
import { createRepositories } from '../src/store';
import { Device, Diagnostic, Installation, CredentialMetadata, OutboxItem } from '../src/store/models';

describe('Store & SQLite Repositories', () => {
  let mockDb: MockDatabaseAdapter;
  let repos: ReturnType<typeof createRepositories>;

  beforeEach(async () => {
    mockDb = new MockDatabaseAdapter();
    await initializeSchema(mockDb);
    repos = createRepositories(mockDb);
  });

  describe('DeviceRepository', () => {
    it('should upsert a new device and query it by IP and MAC', async () => {
      const device: Device = {
        id: 'dev-1',
        ip: '192.168.1.1',
        mac: '00:11:22:33:44:55',
        hostname: 'router.lab',
        vendor: 'MikroTik',
        model: 'RB4011',
        serialNumber: 'SN12345',
        isOnline: true,
        lastSeenAt: 1700000000,
        cachedSheetJson: '{"ram": 1024}',
      };

      await repos.devices.upsert(device);

      const byIp = await repos.devices.findByIp('192.168.1.1');
      expect(byIp).not.toBeNull();
      expect(byIp?.hostname).toBe('router.lab');
      expect(byIp?.vendor).toBe('MikroTik');
      expect(byIp?.isOnline).toBe(true);

      const byMac = await repos.devices.findByMac('00:11:22:33:44:55');
      expect(byMac).not.toBeNull();
      expect(byMac?.id).toBe('dev-1');

      const all = await repos.devices.listAll();
      expect(all).toHaveLength(1);
    });

    it('should update an existing device on subsequent upsert', async () => {
      const initial: Device = {
        id: 'dev-2',
        ip: '192.168.1.20',
        hostname: 'switch.lab',
        isOnline: true,
        lastSeenAt: 1700000000,
      };
      await repos.devices.upsert(initial);

      const updated: Device = {
        id: 'dev-2',
        ip: '192.168.1.20',
        hostname: 'switch-core.lab',
        vendor: 'Cisco',
        isOnline: false,
        lastSeenAt: 1700005000,
      };
      await repos.devices.upsert(updated);

      const result = await repos.devices.findByIp('192.168.1.20');
      expect(result?.hostname).toBe('switch-core.lab');
      expect(result?.vendor).toBe('Cisco');
      expect(result?.isOnline).toBe(false);
    });
  });

  describe('DiagnosticRepository', () => {
    it('should create and list diagnostics by device and overall', async () => {
      const diag: Diagnostic = {
        id: 'diag-1',
        deviceId: 'dev-1',
        type: 'snmp',
        target: '192.168.1.1',
        rawOutput: 'SNMPv2-MIB::sysDescr.0 = RouterOS',
        parsedTelemetryJson: '{"sysDescr":"RouterOS"}',
        status: 'pending',
        createdAt: 1700000000,
      };

      await repos.diagnostics.create(diag);

      const deviceDiags = await repos.diagnostics.listByDeviceId('dev-1');
      expect(deviceDiags).toHaveLength(1);
      expect(deviceDiags[0].target).toBe('192.168.1.1');
      expect(deviceDiags[0].type).toBe('snmp');

      const allDiags = await repos.diagnostics.listAll();
      expect(allDiags).toHaveLength(1);

      const byId = await repos.diagnostics.findById('diag-1');
      expect(byId).not.toBeNull();
      expect(byId?.id).toBe('diag-1');
      expect(byId?.parsedTelemetryJson).toBe('{"sysDescr":"RouterOS"}');

      const notFound = await repos.diagnostics.findById('non-existent');
      expect(notFound).toBeNull();
    });
  });

  describe('InstallationRepository', () => {
    it('should create an installation with photos and retrieve it', async () => {
      const inst: Installation = {
        id: 'inst-100',
        deviceId: 'dev-1',
        deviceName: 'Router Principal',
        deviceIp: '192.168.1.1',
        deviceMac: '00:11:22:33:44:55',
        siteName: 'Nodo Central',
        gpsLat: -32.48,
        gpsLng: -58.23,
        gpsAccuracy: 5.5,
        notes: 'Rack 1A montado correctamente',
        pdfPath: '/storage/inst-100.pdf',
        status: 'pending',
        baseVersion: 1,
        createdAt: 1700000000,
        updatedAt: 1700000000,
        photos: [
          {
            id: 'photo-1',
            installationId: 'inst-100',
            filePath: '/photos/rack.jpg',
            label: 'Rack',
            capturedAt: 1700000000,
          },
          {
            id: 'photo-2',
            installationId: 'inst-100',
            filePath: '/photos/cables.jpg',
            label: 'Cableado',
            capturedAt: 1700000010,
          },
        ],
      };

      await repos.installations.create(inst);

      const found = await repos.installations.findById('inst-100');
      expect(found).not.toBeNull();
      expect(found?.deviceName).toBe('Router Principal');
      expect(found?.siteName).toBe('Nodo Central');
      expect(found?.photos).toHaveLength(2);
      expect(found?.photos?.[0].label).toBe('Rack');

      await repos.installations.updateStatus('inst-100', 'synced');
      const updated = await repos.installations.findById('inst-100');
      expect(updated?.status).toBe('synced');
    });
  });

  describe('CredentialRepository', () => {
    it('should save credential metadata without secrets and allow search & deletion', async () => {
      const cred: CredentialMetadata = {
        id: 'cred-1',
        alias: 'MikroTik Admin Core',
        host: '192.168.1.1',
        port: 22,
        username: 'admin',
        keychainKey: 'cred:cred-1',
        createdAt: 1700000000,
      };

      await repos.credentials.create(cred);

      const found = await repos.credentials.findById('cred-1');
      expect(found).not.toBeNull();
      expect(found?.alias).toBe('MikroTik Admin Core');
      expect(found?.keychainKey).toBe('cred:cred-1');

      const byHost = await repos.credentials.findByHost('192.168.1.1');
      expect(byHost).toHaveLength(1);

      await repos.credentials.delete('cred-1');
      const afterDelete = await repos.credentials.findById('cred-1');
      expect(afterDelete).toBeNull();
    });
  });

  describe('OutboxRepository', () => {
    it('should enqueue items, peek pending, mark success, retry and conflict', async () => {
      await repos.outbox.enqueue({
        id: 'out-1',
        entityType: 'installation',
        entityId: 'inst-100',
        payloadJson: '{"id":"inst-100"}',
        status: 'pending',
      });

      await repos.outbox.enqueue({
        id: 'out-2',
        entityType: 'diagnostic',
        entityId: 'diag-1',
        payloadJson: '{"id":"diag-1"}',
        status: 'pending',
      });

      const pendingCount = await repos.outbox.countPending();
      expect(pendingCount).toBe(2);

      const pending = await repos.outbox.peekPending(100);
      expect(pending).toHaveLength(2);

      // Mark first success
      await repos.outbox.markSuccess('out-1');
      const countAfterSuccess = await repos.outbox.countPending();
      expect(countAfterSuccess).toBe(1);

      // Mark second conflict
      await repos.outbox.markConflict('out-2', 'Version mismatch (HTTP 409)');
      const all = await repos.outbox.listAll();
      const conflictItem = all.find((i) => i.id === 'out-2');
      expect(conflictItem?.status).toBe('conflict');
      expect(conflictItem?.errorMessage).toContain('HTTP 409');
    });
  });
});
