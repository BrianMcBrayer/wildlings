import { liveQuery } from 'dexie';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { LogRecord, WildlingsDb } from '../db/db';
import { computeTotals } from '../db/stats';
import { currentYear, getYearWindowMs, nowIso, parseInstantMs } from '../lib/datetime';

type UseStatsOptions = {
  year?: number;
  now?: () => string;
  tickMs?: number;
};

type UseStatsResult = {
  year: number;
  yearHours: number;
  allTimeHours: number;
  yearlyGoalHours: number | null;
  yearlyGoalYear: number | null;
  refresh: () => Promise<void>;
};

export const useStats = (db: WildlingsDb, options: UseStatsOptions = {}): UseStatsResult => {
  const [logs, setLogs] = useState<LogRecord[]>([]);
  const [year, setYear] = useState<number>(options.year ?? currentYear());
  const [yearlyGoalHours, setYearlyGoalHours] = useState<number | null>(null);
  const [yearlyGoalYear, setYearlyGoalYear] = useState<number | null>(null);
  const [activeLogId, setActiveLogId] = useState<string | null>(null);
  const [activeStartAt, setActiveStartAt] = useState<string | null>(null);
  const [activeNow, setActiveNow] = useState<string>(() =>
    options.now ? options.now() : nowIso(),
  );

  const tickMs = options.tickMs ?? 1000;

  const getNow = useCallback(() => (options.now ? options.now() : nowIso()), [options.now]);

  useEffect(() => {
    const targetYear = options.year ?? currentYear();
    setYear(targetYear);

    const subscription = liveQuery(async () => {
      const [storedLogs, metadata] = await Promise.all([
        db.logs.toArray(),
        db.metadata.get('singleton'),
      ]);
      return { storedLogs, metadata };
    }).subscribe({
      next: ({ storedLogs, metadata }) => {
        setLogs(storedLogs);
        setActiveLogId(metadata?.active_log_id ?? null);
        setActiveStartAt(metadata?.active_start_at ?? null);
        if (metadata?.yearly_goal_year === targetYear) {
          setYearlyGoalYear(metadata.yearly_goal_year);
          setYearlyGoalHours(metadata.yearly_goal_hours);
        } else {
          setYearlyGoalYear(null);
          setYearlyGoalHours(null);
        }
      },
      error: (error) => {
        console.error('Failed to query stats:', error);
      },
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [db, options.year]);

  useEffect(() => {
    if (!activeLogId || !activeStartAt) {
      return;
    }

    const updateNow = () => {
      setActiveNow(getNow());
    };

    updateNow();
    const intervalId = window.setInterval(updateNow, tickMs);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [activeLogId, activeStartAt, getNow, tickMs]);

  const refresh = useCallback(async () => {
    // No-op: liveQuery handles updates automatically
  }, []);

  const totals = useMemo(() => {
    const baseTotals = computeTotals(logs, year);

    if (!activeLogId || !activeStartAt) {
      return baseTotals;
    }

    const activeLog = logs.find((log) => log.id === activeLogId);
    if (!activeLog || activeLog.end_at) {
      return baseTotals;
    }

    if (activeLog.deleted_at_local || activeLog.deleted_at_server) {
      return baseTotals;
    }

    const startMs = parseInstantMs(activeLog.start_at);
    const endMs = parseInstantMs(activeNow);
    if (startMs === null || endMs === null) {
      return baseTotals;
    }

    const activeMs = Math.max(0, endMs - startMs);
    const { startMs: yearStartMs, endMs: yearEndMs } = getYearWindowMs(year);
    const overlapStart = Math.max(startMs, yearStartMs);
    const overlapEnd = Math.min(endMs, yearEndMs);
    const activeYearMs = Math.max(0, overlapEnd - overlapStart);

    return {
      yearHours: baseTotals.yearHours + activeYearMs / 3600000,
      allTimeHours: baseTotals.allTimeHours + activeMs / 3600000,
    };
  }, [logs, year, activeLogId, activeStartAt, activeNow]);

  return {
    year,
    yearHours: totals.yearHours,
    allTimeHours: totals.allTimeHours,
    yearlyGoalHours,
    yearlyGoalYear,
    refresh,
  };
};
