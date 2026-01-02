import { useCallback, useEffect, useState } from 'react';
import type { LogRecord, WildlingsDb } from '../db/db';
import {
  createManualLogWithOutbox,
  deleteLogWithOutbox,
  getMetadata,
  updateLogWithOutbox,
} from '../db/db';

type UseLogsOptions = {
  now?: () => string;
};

type CreateLogParams = {
  startAt: string;
  endAt: string | null;
  note?: string | null;
  updatedAtLocal?: string;
};

type UpdateLogParams = {
  logId: string;
  startAt: string;
  endAt: string | null;
  note?: string | null;
  updatedAtLocal?: string;
};

type UseLogsResult = {
  logs: LogRecord[];
  activeLogId: string | null;
  activeStartAt: string | null;
  refresh: () => Promise<void>;
  createManualLog: (params: CreateLogParams) => Promise<LogRecord>;
  updateLog: (params: UpdateLogParams) => Promise<LogRecord>;
  deleteLog: (logId: string, deletedAtLocal?: string) => Promise<void>;
};

const isVisibleLog = (log: LogRecord) => !log.deleted_at_local && !log.deleted_at_server;

export const useLogs = (db: WildlingsDb, options: UseLogsOptions = {}): UseLogsResult => {
  const [logs, setLogs] = useState<LogRecord[]>([]);
  const [activeLogId, setActiveLogId] = useState<string | null>(null);
  const [activeStartAt, setActiveStartAt] = useState<string | null>(null);
  const now = options.now ?? (() => new Date().toISOString());

  const refresh = useCallback(async () => {
    const [allLogs, metadata] = await Promise.all([db.logs.toArray(), getMetadata(db)]);
    setLogs(allLogs.filter(isVisibleLog));
    setActiveLogId(metadata.active_log_id);
    setActiveStartAt(metadata.active_start_at);
  }, [db]);

  useEffect(() => {
    let mounted = true;
    refresh().catch(() => {
      if (!mounted) {
        return;
      }
      setLogs([]);
      setActiveLogId(null);
      setActiveStartAt(null);
    });

    return () => {
      mounted = false;
    };
  }, [refresh]);

  const createManualLog = useCallback(
    async (params: CreateLogParams) => {
      const log = await createManualLogWithOutbox(db, {
        startAt: params.startAt,
        endAt: params.endAt,
        note: params.note,
        updatedAtLocal: params.updatedAtLocal ?? now(),
      });
      await refresh();
      return log;
    },
    [db, now, refresh],
  );

  const updateLog = useCallback(
    async (params: UpdateLogParams) => {
      const log = await updateLogWithOutbox(db, {
        logId: params.logId,
        startAt: params.startAt,
        endAt: params.endAt,
        note: params.note,
        updatedAtLocal: params.updatedAtLocal ?? now(),
      });
      await refresh();
      return log;
    },
    [db, now, refresh],
  );

  const deleteLog = useCallback(
    async (logId: string, deletedAtLocal?: string) => {
      await deleteLogWithOutbox(db, logId, deletedAtLocal ?? now());
      await refresh();
    },
    [db, now, refresh],
  );

  return {
    logs,
    activeLogId,
    activeStartAt,
    refresh,
    createManualLog,
    updateLog,
    deleteLog,
  };
};
