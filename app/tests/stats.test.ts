import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import type { LogRecord } from '../src/db/db';
import { computeTotals } from '../src/db/stats';

const makeTimestamp = (value: string) => value;

const makeLog = (overrides?: Partial<LogRecord>): LogRecord => ({
  id: randomUUID(),
  start_at: '2026-01-01T09:00:00Z',
  end_at: '2026-01-01T10:00:00Z',
  note: null,
  updated_at_local: '2026-01-01T10:00:00Z',
  deleted_at_local: null,
  updated_at_server: null,
  deleted_at_server: null,
  ...overrides,
});

describe('stats totals (UTC)', () => {
  const originalTz = process.env.TZ;

  beforeAll(() => {
    process.env.TZ = 'UTC';
  });

  afterAll(() => {
    process.env.TZ = originalTz;
  });

  it('ignores deleted logs and active timers in all-time totals', () => {
    const logs = [
      makeLog({
        start_at: makeTimestamp('2026-01-01T08:00:00Z'),
        end_at: makeTimestamp('2026-01-01T09:00:00Z'),
      }),
      makeLog({
        id: randomUUID(),
        start_at: makeTimestamp('2026-01-01T10:00:00Z'),
        end_at: null,
      }),
      makeLog({
        id: randomUUID(),
        start_at: makeTimestamp('2026-01-01T11:00:00Z'),
        end_at: makeTimestamp('2026-01-01T12:00:00Z'),
        deleted_at_local: makeTimestamp('2026-01-02T00:00:00Z'),
      }),
    ];

    const totals = computeTotals(logs, 2026);
    expect(totals.allTimeHours).toBeCloseTo(1, 5);
  });

  it('splits log time across calendar years', () => {
    const logs = [
      makeLog({
        start_at: makeTimestamp('2026-12-31T23:00:00Z'),
        end_at: makeTimestamp('2027-01-01T01:00:00Z'),
      }),
    ];

    const totals2026 = computeTotals(logs, 2026);
    const totals2027 = computeTotals(logs, 2027);

    expect(totals2026.yearHours).toBeCloseTo(1, 5);
    expect(totals2027.yearHours).toBeCloseTo(1, 5);
  });
});

describe('stats totals respect local timezone boundaries', () => {
  const originalTz = process.env.TZ;

  beforeAll(() => {
    process.env.TZ = 'America/Los_Angeles';
  });

  afterAll(() => {
    process.env.TZ = originalTz;
  });

  it('uses local year boundaries for overlaps', () => {
    const logs = [
      makeLog({
        start_at: makeTimestamp('2026-01-01T06:00:00Z'),
        end_at: makeTimestamp('2026-01-01T10:00:00Z'),
      }),
    ];

    const totals2025 = computeTotals(logs, 2025);
    const totals2026 = computeTotals(logs, 2026);

    expect(totals2025.yearHours).toBeCloseTo(2, 5);
    expect(totals2026.yearHours).toBeCloseTo(2, 5);
  });
});
