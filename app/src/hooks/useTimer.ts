import { useCallback, useEffect, useState } from 'react';
import type { WildlingsDb, LogRecord } from '../db/db';
import {
  getMetadata,
  startTimerWithOutbox,
  stopTimerWithOutbox,
  updateActiveTimerStartWithOutbox,
} from '../db/db';
import { nowIso } from '../lib/datetime';

type UseTimerOptions = {
  now?: () => string;
};

type UseTimerResult = {
  activeLogId: string | null;
  activeStartAt: string | null;
  isActive: boolean;
  startTimer: (startAt?: string) => Promise<LogRecord>;
  stopTimer: (endAt?: string) => Promise<LogRecord>;
  updateActiveStartAt: (startAt: string) => Promise<LogRecord>;
};

export const useTimer = (db: WildlingsDb, options: UseTimerOptions = {}): UseTimerResult => {
  const [activeLogId, setActiveLogId] = useState<string | null>(null);
  const [activeStartAt, setActiveStartAt] = useState<string | null>(null);
  const now = options.now ?? nowIso;

  useEffect(() => {
    let mounted = true;
    getMetadata(db)
      .then((metadata) => {
        if (!mounted) {
          return;
        }
        setActiveLogId(metadata.active_log_id);
        setActiveStartAt(metadata.active_start_at);
      })
      .catch(() => {
        if (!mounted) {
          return;
        }
        setActiveLogId(null);
        setActiveStartAt(null);
      });

    return () => {
      mounted = false;
    };
  }, [db]);

  const startTimer = useCallback(
    async (startAt?: string) => {
      const log = await startTimerWithOutbox(db, {
        startAt: startAt ?? now(),
      });
      setActiveLogId(log.id);
      setActiveStartAt(log.start_at);
      return log;
    },
    [db, now],
  );

  const stopTimer = useCallback(
    async (endAt?: string) => {
      const log = await stopTimerWithOutbox(db, {
        endAt: endAt ?? now(),
      });
      setActiveLogId(null);
      setActiveStartAt(null);
      return log;
    },
    [db, now],
  );

  const updateActiveStartAt = useCallback(
    async (startAt: string) => {
      const log = await updateActiveTimerStartWithOutbox(db, {
        startAt,
        updatedAtLocal: now(),
      });
      setActiveStartAt(log.start_at);
      return log;
    },
    [db, now],
  );

  return {
    activeLogId,
    activeStartAt,
    isActive: activeLogId !== null,
    startTimer,
    stopTimer,
    updateActiveStartAt,
  };
};
