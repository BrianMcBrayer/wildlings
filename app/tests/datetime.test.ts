import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import dayjs from 'dayjs';
import {
  currentYear,
  getYearWindowMs,
  nowIso,
  parseInstantMs,
  toIsoFromMs,
} from '../src/lib/datetime';

describe('datetime helpers', () => {
  const originalTz = process.env.TZ;

  beforeAll(() => {
    process.env.TZ = 'UTC';
  });

  afterAll(() => {
    process.env.TZ = originalTz;
  });

  it('parses valid instants and returns null for invalid inputs', () => {
    const iso = nowIso();
    const parsed = parseInstantMs(iso);
    expect(parsed).not.toBeNull();
    expect(parseInstantMs('not-a-date')).toBeNull();
  });

  it('formats instants from milliseconds', () => {
    const ms = dayjs('2026-01-01T00:00:00Z').valueOf();
    expect(toIsoFromMs(ms)).toBe('2026-01-01T00:00:00.000Z');
  });

  it('uses local year boundaries for year windows', () => {
    const { startMs, endMs } = getYearWindowMs(2026);
    expect(startMs).toBe(dayjs('2026-01-01T00:00:00').valueOf());
    expect(endMs).toBe(dayjs('2027-01-01T00:00:00').valueOf());
    expect(currentYear()).toBe(dayjs().year());
  });
});
