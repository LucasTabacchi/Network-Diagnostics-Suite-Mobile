import { MockDatabaseAdapter } from '../src/store/db/MockDatabaseAdapter';
import { initializeSchema } from '../src/store/schema';
import { CredentialRepository } from '../src/store/repositories/CredentialRepository';
import { CredentialManager } from '../src/security/CredentialManager';
import { SshService, VENDOR_PRESETS } from '../src/network/ssh/SshService';

describe('Credentials & SSH Service', () => {
  let mockDb: MockDatabaseAdapter;
  let credRepo: CredentialRepository;
  let credManager: CredentialManager;

  beforeEach(async () => {
    mockDb = new MockDatabaseAdapter();
    await initializeSchema(mockDb);
    credRepo = new CredentialRepository(mockDb);
    credManager = new CredentialManager(credRepo);
  });

  describe('CredentialManager', () => {
    it('should save credential to SQLite metadata and Keychain secret', async () => {
      const saved = await credManager.saveCredential({
        alias: 'MikroTik Core Router',
        host: '192.168.1.1',
        port: 22,
        username: 'admin',
        password: 'SuperSecretPassword123!',
      });

      expect(saved.id).toBeDefined();
      expect(saved.alias).toBe('MikroTik Core Router');
      expect(saved.keychainKey).toContain('cred:');

      // Verify metadata does NOT contain the password
      expect((saved as any).password).toBeUndefined();

      // Retrieve secret via Keychain
      const secret = await credManager.getSecret(saved.id);
      expect(secret).toBe('SuperSecretPassword123!');
    });

    it('should find credential and secret by host', async () => {
      await credManager.saveCredential({
        alias: 'Switch Principal',
        host: '10.0.0.1',
        port: 2222,
        username: 'cisco',
        password: 'ciscoPassword!',
      });

      const found = await credManager.getSecretForHost('10.0.0.1');
      expect(found).not.toBeNull();
      expect(found?.meta.username).toBe('cisco');
      expect(found?.meta.port).toBe(2222);
      expect(found?.secret).toBe('ciscoPassword!');
    });

    it('should delete credential from both SQLite and Keychain', async () => {
      const saved = await credManager.saveCredential({
        alias: 'Temp Device',
        host: '192.168.1.99',
        username: 'root',
        password: 'temp',
      });

      await credManager.deleteCredential(saved.id);

      const secret = await credManager.getSecret(saved.id);
      expect(secret).toBeNull();

      const list = await credManager.listAll();
      expect(list.find((c) => c.id === saved.id)).toBeUndefined();
    });
  });

  describe('SshService', () => {
    it('should expose vendor presets for MikroTik, Cisco, Huawei and Ubiquiti', () => {
      const vendors = new Set(VENDOR_PRESETS.map((p) => p.vendor));
      expect(vendors.has('MikroTik')).toBe(true);
      expect(vendors.has('Cisco')).toBe(true);
      expect(vendors.has('Huawei')).toBe(true);
      expect(vendors.has('Ubiquiti')).toBe(true);
    });

    it('should execute command and return output', async () => {
      const ssh = new SshService();
      const output = await ssh.executeCommand(
        '192.168.1.1',
        22,
        'admin',
        'secret',
        '/system resource print'
      );
      expect(output).toContain('/system resource print');
      expect(output).toContain('OK');
    });
  });
});
