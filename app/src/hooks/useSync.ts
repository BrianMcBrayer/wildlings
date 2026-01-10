import { useCallback, useEffect, useRef, useState } from 'react';
import type { WildlingsDb } from '../db/db';
import { syncOnce } from '../db/sync';
import type { SyncOptions, SyncOutcome } from '../db/sync';

type UseSyncOptions = SyncOptions & {
  debounceMs?: number;
  syncFn?: (db: WildlingsDb, options?: SyncOptions) => Promise<SyncOutcome>;
};

type UseSyncResult = {
  isSyncing: boolean;
  lastError: string | null;
  syncNow: () => Promise<void>;
  scheduleSync: () => void;
};

const DEFAULT_DEBOUNCE_MS = 1500;

export const useSync = (db: WildlingsDb, options: UseSyncOptions = {}): UseSyncResult => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const { baseUrl, fetcher, now, random, batchSize, debounceMs, syncFn } = options;
  const resolvedDebounceMs = debounceMs ?? DEFAULT_DEBOUNCE_MS;
  const resolvedSyncFn = syncFn ?? syncOnce;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncingRef = useRef(false);

  const syncNow = useCallback(async () => {
    if (syncingRef.current) {
      return;
    }
    syncingRef.current = true;
    setIsSyncing(true);

    try {
      await resolvedSyncFn(db, { baseUrl, fetcher, now, random, batchSize });
      setLastError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sync failed';
      setLastError(message);
    } finally {
      syncingRef.current = false;
      setIsSyncing(false);
    }
  }, [db, resolvedSyncFn, baseUrl, fetcher, now, random, batchSize]);

  const scheduleSync = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      void syncNow();
    }, resolvedDebounceMs);
  }, [resolvedDebounceMs, syncNow]);

  useEffect(() => {
    void syncNow();
  }, [syncNow]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void syncNow();
      }
    };
    const handleOnline = () => {
      void syncNow();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('online', handleOnline);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('online', handleOnline);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [syncNow]);

  return {
    isSyncing,
    lastError,
    syncNow,
    scheduleSync,
  };
};
