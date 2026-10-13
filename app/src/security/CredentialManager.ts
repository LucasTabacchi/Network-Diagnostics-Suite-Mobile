import * as Keychain from 'react-native-keychain';
import { CredentialMetadata } from '../store/models';
import { CredentialRepository } from '../store/repositories/CredentialRepository';

export interface NewCredentialInput {
  alias: string;
  host: string;
  port?: number;
  username: string;
  password: string;
}

export class CredentialManager {
  constructor(private credRepo: CredentialRepository) {}

  async saveCredential(input: NewCredentialInput): Promise<CredentialMetadata> {
    const id = `cred_${Date.now()}`;
    const keychainKey = `cred:${id}`;

    // 1. Store secret strictly in Android Keystore / iOS Keychain
    await Keychain.setGenericPassword(input.username, input.password, {
      service: keychainKey,
    });

    // 2. Store only non-sensitive metadata in SQLite
    const meta: CredentialMetadata = {
      id,
      alias: input.alias.trim(),
      host: input.host.trim(),
      port: input.port || 22,
      username: input.username.trim(),
      keychainKey,
      createdAt: Date.now(),
    };

    await this.credRepo.create(meta);
    return meta;
  }

  async getSecret(id: string): Promise<string | null> {
    const meta = await this.credRepo.findById(id);
    if (!meta) return null;

    const creds = await Keychain.getGenericPassword({
      service: meta.keychainKey,
    });

    if (creds && typeof creds === 'object' && 'password' in creds) {
      return creds.password;
    }
    return null;
  }

  async getSecretForHost(
    host: string
  ): Promise<{ meta: CredentialMetadata; secret: string } | null> {
    const list = await this.credRepo.findByHost(host);
    if (list.length === 0) return null;

    const meta = list[0];
    const secret = await this.getSecret(meta.id);
    if (secret === null) return null;

    return { meta, secret };
  }

  async listAll(): Promise<CredentialMetadata[]> {
    return this.credRepo.listAll();
  }

  async deleteCredential(id: string): Promise<void> {
    const meta = await this.credRepo.findById(id);
    if (meta) {
      await Keychain.resetGenericPassword({ service: meta.keychainKey });
      await this.credRepo.delete(id);
    }
  }
}
