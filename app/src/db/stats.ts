import type { LogRecord } from './db';

type Totals = {
  yearHours: number;
  allTimeHours: number;
};

const MS_PER_HOUR = 1000 * 60 * 60;

const isDeleted = (log: LogRecord) => Boolean(log.deleted_at_local || log.deleted_at_server);

const parseInstant = (value: string) => {
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : ms;
};

const durationMs = (startMs: number, endMs: number) => Math.max(0, endMs - startMs);

const getYearWindowMs = (year: number) => {
  const start = new Date(year, 0, 1, 0, 0, 0, 0);
  const end = new Date(year + 1, 0, 1, 0, 0, 0, 0);
  return { startMs: start.getTime(), endMs: end.getTime() };
};

const getLogRangeMs = (log: LogRecord) => {
  if (!log.end_at) {
    return null;
  }
  const startMs = parseInstant(log.start_at);
  const endMs = parseInstant(log.end_at);
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
