import type { LogRecord } from './db';
import { getYearWindowMs, parseInstantMs } from '../lib/datetime';

type Totals = {
  yearHours: number;
  allTimeHours: number;
};

const MS_PER_HOUR = 1000 * 60 * 60;
const MINUTES_PER_HOUR = 60;

const isDeleted = (log: LogRecord) => Boolean(log.deleted_at_local || log.deleted_at_server);

const durationMs = (startMs: number, endMs: number) => Math.max(0, endMs - startMs);

const getLogRangeMs = (log: LogRecord) => {
  if (!log.end_at) {
    return null;
  }
  const startMs = parseInstantMs(log.start_at);
  const endMs = parseInstantMs(log.end_at);
  if (startMs === null || endMs === null) {
    return null;
  }
  return { startMs, endMs };
};

const sumAllTimeMs = (logs: LogRecord[]) =>
  logs.reduce((total, log) => {
    if (isDeleted(log)) {
      return total;
    }

    const range = getLogRangeMs(log);
    if (!range) {
      return total;
    }

    return total + durationMs(range.startMs, range.endMs);
  }, 0);

const sumYearMs = (logs: LogRecord[], year: number) => {
  const { startMs, endMs } = getYearWindowMs(year);
  return logs.reduce((total, log) => {
    if (isDeleted(log)) {
      return total;
    }

    const range = getLogRangeMs(log);
    if (!range) {
      return total;
    }

    const overlapStart = Math.max(range.startMs, startMs);
    const overlapEnd = Math.min(range.endMs, endMs);
    return total + durationMs(overlapStart, overlapEnd);
  }, 0);
};

export const computeTotals = (logs: LogRecord[], year: number): Totals => {
  const allTimeMs = sumAllTimeMs(logs);
  const yearMs = sumYearMs(logs, year);

  return {
    yearHours: yearMs / MS_PER_HOUR,
    allTimeHours: allTimeMs / MS_PER_HOUR,
  };
};

export const formatDurationHours = (hours: number) => {
  const safeHours = Number.isFinite(hours) ? Math.max(0, hours) : 0;
  const totalMinutes = Math.round(safeHours * MINUTES_PER_HOUR);
  const wholeHours = Math.floor(totalMinutes / MINUTES_PER_HOUR);
  const minutes = totalMinutes % MINUTES_PER_HOUR;

  return `${wholeHours}h ${minutes}m`;
};
