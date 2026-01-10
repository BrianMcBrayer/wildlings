import type { WildlingsDb, LogRecord } from './db';
import { getMetadata, getOrCreateDeviceId } from './db';
import {
  syncPullResponseSchema,
  syncPushResponseSchema,
  type SyncPullLog,
  type SyncPushResponse,
} from './syncSchemas';
import { nowIso, nowMs, parseInstantMs, toIsoFromMs } from '../lib/datetime';

const BASE_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 60000;
const JITTER_RATIO = 0.2;
const DEFAULT_BATCH_SIZE = 50;

type SyncOptions = {
  baseUrl?: string;
  fetcher?: typeof fetch;
  now?: () => string;
  random?: () => number;
  batchSize?: number;
};

type SyncOutcome = {
  skipped: boolean;
  pushed: number;
  pulled: number;
};

const resolveUrl = (baseUrl: string | undefined, path: string) =>
  baseUrl ? new URL(path, baseUrl).toString() : path;

const isSyncDue = (nextSyncAt: string | null, nowMs: number) => {
  if (!nextSyncAt) {
    return true;
  }
  const nextMs = parseInstantMs(nextSyncAt);
  if (nextMs === null) {
    return true;
  }
  return nextMs <= nowMs;
};

const computeBackoffMs = (previous: number | null) => {
  if (!previous) {
    return BASE_BACKOFF_MS;
  }
  return Math.min(MAX_BACKOFF_MS, previous * 2);
};

const computeNextSyncAt = (nowMs: number, backoffMs: number, random: () => number) => {
  const jitter = Math.round(backoffMs * JITTER_RATIO * random());
  return toIsoFromMs(nowMs + backoffMs + jitter);
};

const touchSyncFailure = async (
  db: WildlingsDb,
  params: { nowIso: string; random: () => number },
) => {
  const metadata = await getMetadata(db);
  const currentMs = parseInstantMs(params.nowIso) ?? nowMs();
  const backoffMs = computeBackoffMs(metadata.sync_backoff_ms);
  const nextSyncAt = computeNextSyncAt(currentMs, backoffMs, params.random);
  await db.metadata.update(metadata.id, {
    sync_backoff_ms: backoffMs,
    next_sync_at: nextSyncAt,
  });
};

const clearSyncBackoff = async (db: WildlingsDb, lastSyncAt: string | null) => {
  const metadata = await getMetadata(db);
  await db.metadata.update(metadata.id, {
    last_sync_at: lastSyncAt,
    sync_backoff_ms: null,
    next_sync_at: null,
  });
};

const recordOpFailure = async (db: WildlingsDb, opIds: string[], errorMessage: string) => {
  if (opIds.length === 0) {
    return;
  }
  await db.sync_queue
    .where('op_id')
    .anyOf(opIds)
    .modify((op) => {
      op.attempts += 1;
      op.last_error = errorMessage;
    });
};

const applyPushResponse = async (db: WildlingsDb, response: SyncPushResponse, opIds: string[]) => {
  const acked = new Set(response.ack_op_ids);
  const rejected = new Map(response.rejected.map((item) => [item.op_id, item.message]));
  const unacknowledged = opIds.filter((id) => !acked.has(id) && !rejected.has(id));

  await db.transaction('rw', db.sync_queue, db.logs, async () => {
    if (acked.size > 0) {
      await db.sync_queue
        .where('op_id')
        .anyOf([...acked])
        .delete();
    }

    if (unacknowledged.length > 0) {
      await recordOpFailure(db, unacknowledged, 'NO_ACK');
    }

    for (const [opId, message] of rejected.entries()) {
      const existing = await db.sync_queue.get(opId);
      if (!existing) {
        continue;
      }
      await db.sync_queue.update(opId, {
        attempts: existing.attempts + 1,
        last_error: message,
      });
    }

    for (const appliedLog of response.applied.logs) {
      await db.logs.update(appliedLog.id, {
        updated_at_server: appliedLog.updated_at_server,
        deleted_at_server: appliedLog.deleted_at_server,
      });
    }
  });
};

export const pushOutbox = async (db: WildlingsDb, options: SyncOptions = {}) => {
  const fetcher = options.fetcher ?? fetch;
  const now = options.now ?? nowIso;
  const batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE;

  const ops = await db.sync_queue.orderBy('created_at_local').limit(batchSize).toArray();
  if (ops.length === 0) {
    return { pushed: 0, serverTime: null, nextCursor: null };
  }

  const deviceId = await getOrCreateDeviceId(db);
  const payload = {
    device_id: deviceId,
    client_time: now(),
    ops: ops.map((op) => ({
      op_id: op.op_id,
      entity: op.entity,
      action: op.action,
      record_id: op.record_id,
      payload: op.payload,
    })),
  };

  const opIds = ops.map((op) => op.op_id);

  try {
    const response = await fetcher(resolveUrl(options.baseUrl, '/sync/push'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Push failed with status ${response.status}`);
    }

    const data = syncPushResponseSchema.parse(await response.json());
    await applyPushResponse(db, data, opIds);

    return {
      pushed: ops.length,
      serverTime: data.server_time,
      nextCursor: data.next_cursor,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Push failed';
    await recordOpFailure(db, opIds, message);
    throw error;
  }
};

const upsertServerLog = async (db: WildlingsDb, log: SyncPullLog, editingLogId: string | null) => {
  const pendingCount = await db.sync_queue.where('record_id').equals(log.id).count();
  if (pendingCount > 0) {
    return false;
  }
  if (editingLogId && log.id === editingLogId) {
    return false;
  }

  const existing = await db.logs.get(log.id);
  if (existing) {
    await db.logs.update(log.id, {
      start_at: log.start_at,
      end_at: log.end_at,
      note: log.note,
      updated_at_server: log.updated_at_server,
      deleted_at_server: log.deleted_at_server,
    });
    return true;
  }

  const record: LogRecord = {
    id: log.id,
    start_at: log.start_at,
    end_at: log.end_at,
    note: log.note,
    updated_at_local: log.updated_at_server,
    deleted_at_local: null,
    updated_at_server: log.updated_at_server,
    deleted_at_server: log.deleted_at_server,
  };

  await db.logs.put(record);
  return true;
};

export const pullChanges = async (db: WildlingsDb, options: SyncOptions = {}) => {
  const fetcher = options.fetcher ?? fetch;
  const metadata = await getMetadata(db);
  const base =
    options.baseUrl ??
    (typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
  const url = new URL('/sync/pull', base);
  if (metadata.last_sync_cursor) {
    url.searchParams.set('cursor', metadata.last_sync_cursor);
  }

  const response = await fetcher(url.toString(), { method: 'GET' });
  if (!response.ok) {
    throw new Error(`Pull failed with status ${response.status}`);
  }

  const data = syncPullResponseSchema.parse(await response.json());

  await db.transaction('rw', db.logs, db.sync_queue, db.metadata, async () => {
    for (const log of data.changes.logs) {
      await upsertServerLog(db, log, metadata.editing_log_id);
    }
    await db.metadata.update(metadata.id, { last_sync_cursor: data.next_cursor });
  });

  return { pulled: data.changes.logs.length, serverTime: data.server_time };
};

export const syncOnce = async (
  db: WildlingsDb,
  options: SyncOptions = {},
): Promise<SyncOutcome> => {
  const now = options.now ?? nowIso;
  const random = options.random ?? Math.random;
  const currentIso = now();
  const currentMs = parseInstantMs(currentIso) ?? nowMs();

  const metadata = await getMetadata(db);
  if (!isSyncDue(metadata.next_sync_at, currentMs)) {
    return { skipped: true, pushed: 0, pulled: 0 };
  }

  try {
    const pushResult = await pushOutbox(db, options);
    const pullResult = await pullChanges(db, options);
    const lastSyncAt = pullResult.serverTime ?? pushResult.serverTime ?? currentIso;
    await clearSyncBackoff(db, lastSyncAt);

    return {
      skipped: false,
      pushed: pushResult.pushed,
      pulled: pullResult.pulled,
    };
  } catch (error) {
    await touchSyncFailure(db, { nowIso: currentIso, random });
    throw error;
  }
};

export type { SyncOutcome, SyncOptions };
