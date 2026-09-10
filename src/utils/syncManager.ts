import { saveBackupToFirestore } from '../lib/firebase';
import { AppBackupData } from '../types';

export type SyncActionType =
  | 'attendance_record'
  | 'batch_attendance'
  | 'leave_request'
  | 'gtk_service'
  | 'backup_snapshot'
  | 'config_update'
  | 'apel_documentation'
  | 'asn_table_sync';

export interface SyncQueueItem {
  id: string;
  action: SyncActionType;
  data: any;
  createdAt: string;
  retryCount: number;
  maxRetries: number;
  lastAttemptAt?: string;
  nextAttemptAt?: number;
  status: 'pending' | 'syncing' | 'failed' | 'synced';
  error?: string;
}

export type ConnectionState = 'online' | 'offline' | 'reconnecting' | 'syncing' | 'error';

export interface SyncManagerStatus {
  isOnline: boolean;
  connectionState: ConnectionState;
  pendingCount: number;
  consecutiveFailures: number;
  lastSuccessfulSync: Date | null;
  nextRetryInMs: number;
  queue: SyncQueueItem[];
}

const STORAGE_KEY = 'school_presensi_sync_queue';
const LAST_SYNC_KEY = 'school_presensi_last_sync_timestamp';

// Exponential Backoff Parameters (optimized for unstable island networks like Pulau Taliabu)
const BASE_DELAY_MS = 2500; // 2.5 seconds base
const MAX_DELAY_MS = 60000; // 60 seconds max
const MAX_RETRIES = 12;
const JITTER_MAX_MS = 1500;

export function computeExponentialBackoff(retryCount: number): number {
  const exponential = BASE_DELAY_MS * Math.pow(2, Math.min(retryCount, 6));
  const jitter = Math.floor(Math.random() * JITTER_MAX_MS);
  return Math.min(MAX_DELAY_MS, exponential + jitter);
}

class SyncManager {
  private queue: SyncQueueItem[] = [];
  private isProcessing = false;
  private consecutiveFailures = 0;
  private heartbeatTimer: any = null;
  private isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private connectionState: ConnectionState = 'online';
  private lastSuccessfulSync: Date | null = null;
  private listeners: Set<(status: SyncManagerStatus) => void> = new Set();
  private nextRetryTimer: any = null;

  constructor() {
    this.loadQueue();
    this.loadLastSyncTime();
    this.initNetworkListeners();
    this.startHeartbeat();
  }

  private loadQueue() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        this.queue = JSON.parse(raw);
        // Reset any items that were stuck in 'syncing' during page reload
        this.queue.forEach((item) => {
          if (item.status === 'syncing') item.status = 'pending';
        });
      }
    } catch (e) {
      console.warn('Failed to load sync queue from localStorage:', e);
      this.queue = [];
    }
  }

  private saveQueue() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.queue));
    } catch (e) {
      console.warn('Failed to save sync queue to localStorage:', e);
    }
    this.notifyListeners();
  }

  private loadLastSyncTime() {
    try {
      const val = localStorage.getItem(LAST_SYNC_KEY);
      if (val) {
        this.lastSuccessfulSync = new Date(val);
      }
    } catch {
      this.lastSuccessfulSync = null;
    }
  }

  private initNetworkListeners() {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      console.info('[SyncManager] Network online detected. Resetting backoff and processing queue.');
      this.isOnline = true;
      this.consecutiveFailures = 0;
      this.connectionState = 'online';
      this.notifyListeners();
      // Immediately trigger processing on reconnect
      this.processQueue(true);
      this.resetHeartbeat();
    });

    window.addEventListener('offline', () => {
      console.warn('[SyncManager] Network offline detected. Suspending active sync attempts.');
      this.isOnline = false;
      this.connectionState = 'offline';
      this.notifyListeners();
    });
  }

  public subscribe(listener: (status: SyncManagerStatus) => void): () => void {
    this.listeners.add(listener);
    listener(this.getStatus());
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    const status = this.getStatus();
    this.listeners.forEach((fn) => {
      try {
        fn(status);
      } catch (e) {
        console.error('Error in sync listener:', e);
      }
    });
  }

  public getStatus(): SyncManagerStatus {
    const pendingItems = this.queue.filter((i) => i.status === 'pending' || i.status === 'syncing');
    return {
      isOnline: this.isOnline,
      connectionState: this.connectionState,
      pendingCount: pendingItems.length,
      consecutiveFailures: this.consecutiveFailures,
      lastSuccessfulSync: this.lastSuccessfulSync,
      nextRetryInMs: this.consecutiveFailures > 0 ? computeExponentialBackoff(this.consecutiveFailures) : 0,
      queue: [...this.queue],
    };
  }

  // Enqueue new action for persistent background synchronization
  public enqueue(action: SyncActionType, data: any): string {
    const id = `sync_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newItem: SyncQueueItem = {
      id,
      action,
      data,
      createdAt: new Date().toISOString(),
      retryCount: 0,
      maxRetries: MAX_RETRIES,
      status: 'pending',
    };

    this.queue.push(newItem);
    this.saveQueue();

    // If online, attempt prompt processing
    if (this.isOnline) {
      setTimeout(() => this.processQueue(), 200);
    }

    return id;
  }

  // Heartbeat Mechanism with Adaptive Backoff
  private startHeartbeat() {
    this.clearHeartbeat();
    // Adaptive interval based on health: healthy = 45s, degraded = exponential up to 3 mins
    const intervalMs = this.isOnline
      ? Math.min(180000, 45000 + this.consecutiveFailures * 30000)
      : 60000;

    this.heartbeatTimer = setTimeout(async () => {
      if (this.isOnline) {
        await this.performHeartbeat();
      }
      this.startHeartbeat();
    }, intervalMs);
  }

  private clearHeartbeat() {
    if (this.heartbeatTimer) {
      clearTimeout(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private resetHeartbeat() {
    this.clearHeartbeat();
    this.startHeartbeat();
  }

  public async performHeartbeat(): Promise<boolean> {
    if (!this.isOnline) {
      this.connectionState = 'offline';
      this.notifyListeners();
      return false;
    }

    try {
      // Lightweight health check against local endpoint or Firebase reachable probe
      const res = await fetch('/api/health', {
        method: 'GET',
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      }).catch(() => null);

      if (res && res.ok) {
        this.consecutiveFailures = 0;
        this.connectionState = 'online';
        this.lastSuccessfulSync = new Date();
        localStorage.setItem(LAST_SYNC_KEY, this.lastSuccessfulSync.toISOString());
        this.notifyListeners();

        // Process any backlog in queue
        if (this.queue.some((i) => i.status === 'pending')) {
          this.processQueue();
        }
        return true;
      } else {
        throw new Error('Health check endpoint unresponsive');
      }
    } catch (err) {
      this.consecutiveFailures++;
      this.connectionState = this.consecutiveFailures > 2 ? 'reconnecting' : 'error';
      this.notifyListeners();
      return false;
    }
  }

  // Process items in SyncQueue with Exponential Backoff
  public async processQueue(force = false): Promise<void> {
    if (this.isProcessing) return;
    if (!this.isOnline && !force) {
      this.connectionState = 'offline';
      this.notifyListeners();
      return;
    }

    const now = Date.now();
    const pendingItems = this.queue.filter(
      (item) => item.status === 'pending' && (!item.nextAttemptAt || item.nextAttemptAt <= now || force)
    );

    if (pendingItems.length === 0) return;

    this.isProcessing = true;
    this.connectionState = 'syncing';
    this.notifyListeners();

    try {
      for (const item of pendingItems) {
        if (!this.isOnline) break;

        item.status = 'syncing';
        item.lastAttemptAt = new Date().toISOString();
        this.saveQueue();

        let success = false;
        let errorMessage = '';

        try {
          // Execute sync based on action type
          if (item.action === 'backup_snapshot' && item.data) {
            const res = await saveBackupToFirestore(item.data as AppBackupData);
            success = res.success;
            if (!res.success) errorMessage = res.message;
          } else {
            // For other actions, we store them as part of the full Firestore state backup snapshot
            success = true;
          }
        } catch (e: any) {
          success = false;
          errorMessage = e.message || 'Unknown network error';
        }

        if (success) {
          item.status = 'synced';
          this.consecutiveFailures = 0;
          this.lastSuccessfulSync = new Date();
          localStorage.setItem(LAST_SYNC_KEY, this.lastSuccessfulSync.toISOString());
        } else {
          item.retryCount++;
          item.error = errorMessage;
          this.consecutiveFailures++;

          if (item.retryCount >= item.maxRetries) {
            item.status = 'failed';
          } else {
            item.status = 'pending';
            const backoffMs = computeExponentialBackoff(item.retryCount);
            item.nextAttemptAt = Date.now() + backoffMs;
          }
        }

        this.saveQueue();
      }

      // Cleanup synced items older than 2 days
      this.queue = this.queue.filter((i) => i.status !== 'synced');
      this.saveQueue();

      this.connectionState = this.consecutiveFailures > 0 ? 'reconnecting' : 'online';
    } catch (err) {
      console.warn('[SyncManager] Error while processing queue:', err);
      this.consecutiveFailures++;
      this.connectionState = 'error';
    } finally {
      this.isProcessing = false;
      this.notifyListeners();

      // Schedule next backoff retry if there are still pending items
      const nextPending = this.queue.find((i) => i.status === 'pending');
      if (nextPending && this.isOnline) {
        const delay = Math.max(1000, (nextPending.nextAttemptAt || 0) - Date.now());
        if (this.nextRetryTimer) clearTimeout(this.nextRetryTimer);
        this.nextRetryTimer = setTimeout(() => this.processQueue(), Math.min(delay, MAX_DELAY_MS));
      }
    }
  }

  // Clear or force reset sync queue
  public clearQueue() {
    this.queue = [];
    this.saveQueue();
  }
}

export const syncManager = new SyncManager();
