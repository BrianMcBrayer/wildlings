import Dexie, { type Table } from 'dexie';

export type LogRecord = {
  id: string;
  start_at: string;
  end_at: string | null;
  note: string | null;
  updated_at_local: string;
  deleted_at_local: string | null;
  updated_at_server: string | null;
  deleted_at_server: string | null;
};

export type SyncAction = 'upsert' | 'delete';

export type SyncQueueRecord = {
  op_id: string;
  device_id: string;
  entity: 'log';
  action: SyncAction;
  record_id: string;
  payload: Record<string, unknown>;
  created_at_local: string;
  attempts: number;
  last_error: string | null;
};

export type MetadataRecord = {
  id: string;
  device_id: string | null;
  active_log_id: string | null;
  active_start_at: string | null;
  last_sync_cursor: string | null;
  last_sync_at: string | null;
  yearly_goal_hours: number | null;
  yearly_goal_year: number | null;
};

const METADATA_ID = 'singleton';

class WildlingsDb extends Dexie {
  logs!: Table<LogRecord, string>;
  sync_queue!: Table<SyncQueueRecord, string>;
  metadata!: Table<MetadataRecord, string>;

  constructor(name: string) {
    super(name);
    this.version(1).stores({
      logs: 'id, start_at, end_at, updated_at_local, deleted_at_local, updated_at_server, deleted_at_server',
      sync_queue: 'op_id, device_id, entity, action, record_id, created_at_local',
      metadata: 'id',
    });
  }
}

export const createDb = (name = 'wildlings') => new WildlingsDb(name);

const createUuid = () => {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  throw new Error('crypto.randomUUID is not available');
};

const emptyMetadata = (): MetadataRecord => ({
  id: METADATA_ID,
  device_id: null,
  active_log_id: null,
  active_start_at: null,
  last_sync_cursor: null,
  last_sync_at: null,
  yearly_goal_hours: null,
  yearly_goal_year: null,
});

export const getMetadata = async (db: WildlingsDb) => {
  const existing = await db.metadata.get(METADATA_ID);
  if (existing) {
    return existing;
  }

  const record = emptyMetadata();
  await db.metadata.put(record);
  return record;
};

export const getOrCreateDeviceId = async (db: WildlingsDb) => {
  const metadata = await getMetadata(db);
  if (metadata.device_id) {
    return metadata.device_id;
  }

  const deviceId = createUuid();
  await db.metadata.update(METADATA_ID, { device_id: deviceId });
  return deviceId;
};

export const setActiveTimer = async (
  db: WildlingsDb,
  params: { logId: string; startAt: string },
) => {
  await getMetadata(db);
  await db.metadata.update(METADATA_ID, {
    active_log_id: params.logId,
    active_start_at: params.startAt,
  });
};

export const clearActiveTimer = async (db: WildlingsDb) => {
  await getMetadata(db);
  await db.metadata.update(METADATA_ID, {
    active_log_id: null,
    active_start_at: null,
  });
};

export const setYearlyGoal = async (db: WildlingsDb, params: { year: number; hours: number }) => {
  await getMetadata(db);
  await db.metadata.update(METADATA_ID, {
    yearly_goal_year: params.year,
    yearly_goal_hours: params.hours,
  });
};

const enqueueOp = async (
  db: WildlingsDb,
  params: {
    deviceId: string;
    action: SyncAction;
    recordId: string;
    payload: Record<string, unknown>;
    createdAtLocal: string;
  },
) => {
  const op: SyncQueueRecord = {
    op_id: createUuid(),
    device_id: params.deviceId,
    entity: 'log',
    action: params.action,
    record_id: params.recordId,
    payload: params.payload,
    created_at_local: params.createdAtLocal,
    attempts: 0,
    last_error: null,
  };

  await db.sync_queue.add(op);
};

export const upsertLogWithOutbox = async (db: WildlingsDb, log: LogRecord) => {
  await db.transaction('rw', db.logs, db.sync_queue, db.metadata, async () => {
    const deviceId = await getOrCreateDeviceId(db);
    await db.logs.put(log);
    await enqueueOp(db, {
      deviceId,
      action: 'upsert',
      recordId: log.id,
      payload: log,
      createdAtLocal: log.updated_at_local,
    });
  });
};

export const deleteLogWithOutbox = async (
  db: WildlingsDb,
  logId: string,
  deletedAtLocal: string,
) => {
  await db.transaction('rw', db.logs, db.sync_queue, db.metadata, async () => {
    const deviceId = await getOrCreateDeviceId(db);
    const updated = await db.logs.update(logId, {
      deleted_at_local: deletedAtLocal,
      updated_at_local: deletedAtLocal,
    });

    if (updated === 0) {
      throw new Error(`Log ${logId} not found`);
    }

    await enqueueOp(db, {
      deviceId,
      action: 'delete',
      recordId: logId,
      payload: {
        id: logId,
        deleted_at_local: deletedAtLocal,
      },
      createdAtLocal: deletedAtLocal,
    });
  });
};

export const startTimerWithOutbox = async (db: WildlingsDb, params: { startAt: string }) =>
  (async () => {
    const metadata = await getMetadata(db);
    if (metadata.active_log_id) {
      throw new Error('Timer already active');
    }

    const log: LogRecord = {
      id: createUuid(),
      start_at: params.startAt,
      end_at: null,
      note: null,
      updated_at_local: params.startAt,
      deleted_at_local: null,
      updated_at_server: null,
      deleted_at_server: null,
    };

    const deviceId = await getOrCreateDeviceId(db);
    await db.transaction('rw', db.logs, db.sync_queue, async () => {
      await db.logs.put(log);
      await enqueueOp(db, {
        deviceId,
        action: 'upsert',
        recordId: log.id,
        payload: log,
        createdAtLocal: log.updated_at_local,
      });
    });
    await setActiveTimer(db, { logId: log.id, startAt: log.start_at });

    return log;
  })();

export const stopTimerWithOutbox = async (db: WildlingsDb, params: { endAt: string }) =>
  (async () => {
    const metadata = await getMetadata(db);
    if (!metadata.active_log_id) {
      throw new Error('No active timer');
    }

    const existing = await db.logs.get(metadata.active_log_id);
    if (!existing) {
      throw new Error(`Active log ${metadata.active_log_id} not found`);
    }

    const updated: LogRecord = {
      ...existing,
      end_at: params.endAt,
      updated_at_local: params.endAt,
    };

    const deviceId = await getOrCreateDeviceId(db);
    await db.transaction('rw', db.logs, db.sync_queue, async () => {
      await db.logs.put(updated);
      await enqueueOp(db, {
        deviceId,
        action: 'upsert',
        recordId: updated.id,
        payload: updated,
        createdAtLocal: updated.updated_at_local,
      });
    });
    await clearActiveTimer(db);

    return updated;
  })();

export type { WildlingsDb };
