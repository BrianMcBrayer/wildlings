import { useCallback, useEffect, useMemo, useState } from 'react';
import type { LogRecord, WildlingsDb } from '../db/db';
import { getMetadata } from '../db/db';
import { computeTotals } from '../db/stats';
import { currentYear } from '../lib/datetime';

type UseStatsOptions = {
  year?: number;
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

  const refresh = useCallback(async () => {
    const [storedLogs, metadata] = await Promise.all([db.logs.toArray(), getMetadata(db)]);
    const targetYear = options.year ?? currentYear();
    setLogs(storedLogs);
    setYear(targetYear);

    if (metadata.yearly_goal_year === targetYear) {
      setYearlyGoalYear(metadata.yearly_goal_year);
      setYearlyGoalHours(metadata.yearly_goal_hours);
    } else {
      setYearlyGoalYear(null);
      setYearlyGoalHours(null);
    }
  }, [db, options.year]);

  useEffect(() => {
    let mounted = true;
    refresh().catch(() => {
      if (!mounted) {
        return;
      }
      setLogs([]);
      setYear(options.year ?? currentYear());
      setYearlyGoalHours(null);
      setYearlyGoalYear(null);
    });

    return () => {
      mounted = false;
    };
  }, [options.year, refresh]);

  const totals = useMemo(() => computeTotals(logs, year), [logs, year]);

  return {
    year,
    yearHours: totals.yearHours,
    allTimeHours: totals.allTimeHours,
    yearlyGoalHours,
    yearlyGoalYear,
    refresh,
  };
};
