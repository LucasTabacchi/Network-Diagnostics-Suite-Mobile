import NetInfo from '@react-native-community/netinfo';
import { DatabaseRepositories, getRepositories } from '../store';
import { OutboxItem, Installation } from '../store/models';

export interface ConflictRecord {
  conflictId: string;
  entityId: string;
  entityType: string;
  localVersion: {
    deviceName?: string;
    notes?: string;
    updatedAt?: number;
    [key: string]: any;
  };
  serverVersion: {
    deviceName?: string;
    notes?: string;
    updatedAt?: number;
    version?: number;
    [key: string]: any;
  };
}

// In-memory conflict store for active sessions
export const conflictStore = new Map<string, ConflictRecord>();

export class SyncWorker {
  private static defaultBackendUrl = 'http://10.0.2.2:3000'; // Standard Android emulator localhost
  private static unsubscribeNetInfo: (() => void) | null = null;

  /**
   * Sets custom backend URL (e.g. for testing or local LAN IP)
   */
  public static setBackendUrl(url: string) {
    this.defaultBackendUrl = url;
  }

  public static getBackendUrl(): string {
    return this.defaultBackendUrl;
  }

  /**
   * Subscribes to network connectivity changes to trigger auto-sync on recovery
   */
  public static startAutoSync(repos?: DatabaseRepositories) {
    if (this.unsubscribeNetInfo) return;

    this.unsubscribeNetInfo = NetInfo.addEventListener((state) => {
      const isOnline = Boolean(state.isConnected && state.isInternetReachable !== false);
      if (isOnline) {
        this.syncAll({ repos }).catch((err) => {
          console.warn('[SyncWorker] Auto-sync attempt error:', err);
        });
      }
    });
  }

  public static stopAutoSync() {
    if (this.unsubscribeNetInfo) {
      this.unsubscribeNetInfo();
      this.unsubscribeNetInfo = null;
    }
  }

  /**
   * Calculates exponential retry backoff in milliseconds
   */
  public static calculateBackoff(attempts: number): number {
    return Math.min(300000, 2000 * Math.pow(2, attempts));
  }

  /**
   * Synchronizes all eligible outbox items with the backend
   */
  public static async syncAll(options?: {
    backendUrl?: string;
    force?: boolean;
    repos?: DatabaseRepositories;
  }): Promise<{ syncedCount: number; conflictCount: number; errorCount: number }> {
    const repos = options?.repos || getRepositories();
    const backendUrl = options?.backendUrl || this.defaultBackendUrl;
    const now = Date.now();

    const pendingItems = await repos.outbox.peekPending(now, 50);

    if (pendingItems.length === 0) {
      return { syncedCount: 0, conflictCount: 0, errorCount: 0 };
    }

    let syncedCount = 0;
    let conflictCount = 0;
    let errorCount = 0;

    try {
      const response = await fetch(`${backendUrl}/sync/push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: pendingItems,
          force: options?.force ?? false,
        }),
      });

      if (response.status === 200) {
        const body = await response.json();
        for (const item of pendingItems) {
          await repos.outbox.markSuccess(item.id);
          if (item.entityType === 'installation') {
            await repos.installations.updateStatus(item.entityId, 'synced');
          }
          syncedCount++;
        }
      } else if (response.status === 409) {
        // Conflict response
        const conflictData = await response.json();
        conflictCount++;

        const conflictItem = pendingItems.find((p) => p.id === conflictData.conflictId) || pendingItems[0];
        
        const conflictRecord: ConflictRecord = {
          conflictId: conflictItem.id,
          entityId: conflictItem.entityId,
          entityType: conflictItem.entityType,
          localVersion: conflictData.localVersion || JSON.parse(conflictItem.payloadJson),
          serverVersion: conflictData.serverVersion,
        };

        conflictStore.set(conflictItem.id, conflictRecord);

        // Mark item as conflict in SQLite with persisted conflict details
        await repos.db.execute(
          `UPDATE outbox SET status = 'conflict', error_message = ?, updated_at = ? WHERE id = ?`,
          [JSON.stringify(conflictRecord), Date.now(), conflictItem.id]
        );

        if (conflictItem.entityType === 'installation') {
          await repos.installations.updateStatus(conflictItem.entityId, 'conflict');
        }
      } else {
        throw new Error(`Server returned HTTP ${response.status}`);
      }
    } catch (err: any) {
      errorCount = pendingItems.length;
      const errorMsg = err?.message || 'Network error during sync';

      for (const item of pendingItems) {
        const nextRetry = now + this.calculateBackoff(item.attempts);
        await repos.outbox.markRetry(item.id, nextRetry, errorMsg);
      }
    }

    return { syncedCount, conflictCount, errorCount };
  }

  /**
   * Resets retry timers for a specific item to retry immediately
   */
  public static async retryItem(itemId: string, repos?: DatabaseRepositories): Promise<void> {
    const activeRepos = repos || getRepositories();
    await activeRepos.db.execute(
      `UPDATE outbox SET status = 'pending', next_retry_at = 0, updated_at = ? WHERE id = ?`,
      [Date.now(), itemId]
    );
    await this.syncAll({ repos: activeRepos });
  }

  /**
   * Resolves a version conflict
   */
  public static async resolveConflict(
    conflictId: string,
    resolution: 'keep_local' | 'use_server',
    repos?: DatabaseRepositories
  ): Promise<void> {
    const activeRepos = repos || getRepositories();
    let conflict = conflictStore.get(conflictId);

    if (!conflict) {
      try {
        const res = await activeRepos.db.execute(
          `SELECT id, entity_id, entity_type, payload_json, error_message FROM outbox WHERE id = ?`,
          [conflictId]
        );
        if (res.rows.length > 0 && res.rows[0].error_message && res.rows[0].error_message.startsWith('{')) {
          conflict = JSON.parse(res.rows[0].error_message);
          if (conflict) {
            conflictStore.set(conflictId, conflict);
          }
        }
      } catch (_) {}
    }

    if (resolution === 'keep_local') {
      // Re-enable item in outbox so peekPending picks it up
      await activeRepos.db.execute(
        `UPDATE outbox SET status = 'pending', next_retry_at = 0, error_message = NULL, updated_at = ? WHERE id = ?`,
        [Date.now(), conflictId]
      );
      if (conflict?.entityType === 'installation') {
        await activeRepos.installations.updateStatus(conflict.entityId, 'pending');
      }

      // Force push local version to backend
      await this.syncAll({ force: true, repos: activeRepos });
      await activeRepos.outbox.markSuccess(conflictId);
      if (conflict?.entityType === 'installation') {
        await activeRepos.installations.updateStatus(conflict.entityId, 'synced');
      }
    } else {
      // Adopt server version
      if (conflict && conflict.entityType === 'installation' && conflict.serverVersion) {
        const existing = await activeRepos.installations.findById(conflict.entityId);
        if (existing) {
          await activeRepos.installations.update({
            id: conflict.entityId,
            notes: conflict.serverVersion.notes || existing.notes,
            status: 'synced',
            baseVersion: (conflict.serverVersion.version || 1) + 1,
          });
        }
      }
      await activeRepos.outbox.markSuccess(conflictId);
    }

    conflictStore.delete(conflictId);
  }
}
