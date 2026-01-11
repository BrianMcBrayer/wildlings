import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { randomUUID } from 'node:crypto';
import { createDb, setActiveTimer, setYearlyGoal } from '../src/db/db';
import type { LogRecord } from '../src/db/db';
import { useStats } from '../src/hooks/useStats';

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

describe('useStats', () => {
  let dbName: string;

  beforeEach(() => {
    dbName = `wildlings-stats-${randomUUID()}`;
  });

  afterEach(async () => {
    const db = createDb(dbName);
    await db.delete();
  });

  it('computes totals and exposes matching yearly goal', async () => {
    const db = createDb(dbName);

    await db.logs.bulkPut([
      makeLog({
        start_at: makeTimestamp('2026-01-01T08:00:00Z'),
        end_at: makeTimestamp('2026-01-01T09:00:00Z'),
      }),
      makeLog({
        start_at: makeTimestamp('2026-01-02T08:00:00Z'),
        end_at: makeTimestamp('2026-01-02T10:00:00Z'),
      }),
      makeLog({
        id: randomUUID(),
        start_at: makeTimestamp('2026-01-03T08:00:00Z'),
        end_at: null,
      }),
    ]);

    await setYearlyGoal(db, { year: 2026, hours: 250 });

    const { result, unmount } = renderHook(() => useStats(db, { year: 2026 }));

    await waitFor(() => expect(result.current.yearHours).toBeGreaterThan(0));
    expect(result.current.yearHours).toBeCloseTo(3, 5);
    expect(result.current.allTimeHours).toBeCloseTo(3, 5);
    expect(result.current.yearlyGoalYear).toBe(2026);
    expect(result.current.yearlyGoalHours).toBe(250);

    unmount();
  });

  it('clears yearly goal when it does not match the active year', async () => {
    const db = createDb(dbName);
    await setYearlyGoal(db, { year: 2025, hours: 100 });

    const { result, unmount } = renderHook(() => useStats(db, { year: 2026 }));

    await waitFor(() => expect(result.current.year).toBe(2026));
    expect(result.current.yearlyGoalHours).toBeNull();
    expect(result.current.yearlyGoalYear).toBeNull();

    unmount();
  });

  it('refreshes totals after log changes', async () => {
    const db = createDb(dbName);
    const { result, unmount } = renderHook(() => useStats(db, { year: 2026 }));

    await waitFor(() => expect(result.current.yearHours).toBe(0));

    await db.logs.put(
      makeLog({
        start_at: makeTimestamp('2026-02-01T10:00:00Z'),
        end_at: makeTimestamp('2026-02-01T11:00:00Z'),
      }),
    );

    await waitFor(() => expect(result.current.yearHours).toBeCloseTo(1, 5));

    unmount();
  });

  it('includes active timer duration while running', async () => {
    const db = createDb(dbName);
    const logId = randomUUID();
    let nowValue = new Date('2026-01-01T08:00:00Z').valueOf();

    await db.logs.put(
      makeLog({
        id: logId,
        start_at: makeTimestamp('2026-01-01T08:00:00Z'),
        end_at: null,
        updated_at_local: makeTimestamp('2026-01-01T08:00:00Z'),
      }),
    );
    await setActiveTimer(db, { logId, startAt: makeTimestamp('2026-01-01T08:00:00Z') });

    const { result, unmount } = renderHook(() =>
      useStats(db, {
        year: 2026,
        now: () => new Date(nowValue).toISOString(),
        tickMs: 10,
      }),
    );

    await waitFor(() => expect(result.current.yearHours).toBeCloseTo(0, 5));

    act(() => {
      nowValue += 60 * 60 * 1000;
    });

    await waitFor(() => expect(result.current.yearHours).toBeCloseTo(1, 2));

    unmount();
  });
});
