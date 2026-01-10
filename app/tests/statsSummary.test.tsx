import React from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { randomUUID } from 'node:crypto';
import { createDb, setYearlyGoal } from '../src/db/db';
import type { LogRecord } from '../src/db/db';
import { StatsSummary } from '../src/components/StatsSummary';

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

describe('StatsSummary', () => {
  let dbName: string;
  let db: ReturnType<typeof createDb>;

  beforeEach(() => {
    dbName = `wildlings-stats-summary-${randomUUID()}`;
    db = createDb(dbName);
  });

  afterEach(async () => {
    cleanup();
    await db.delete();
  });

  it('renders totals and yearly goal progress', async () => {
    await db.logs.bulkPut([
      makeLog({
        start_at: '2026-01-01T08:00:00Z',
        end_at: '2026-01-01T10:00:00Z',
        updated_at_local: '2026-01-01T10:00:00Z',
      }),
    ]);
    await setYearlyGoal(db, { year: 2026, hours: 4 });

    const { container } = render(<StatsSummary db={db} year={2026} />);

    expect(await screen.findByText('Goal 4h')).toBeTruthy();

    expect(screen.getByText('Year 2026')).toBeTruthy();
    expect(screen.getByText('Your Outdoor Journal')).toBeTruthy();
    expect(screen.getByText('Year hours')).toBeTruthy();
    expect(screen.getByText('All time')).toBeTruthy();
    expect(screen.getAllByText('2h 0m')).toHaveLength(2);
    expect(screen.getByText('50%')).toBeTruthy();

    const section = container.querySelector('section');
    expect(section?.className).toContain('bg-wild-paper');
    expect(section?.className).toContain('animate-fade-in');
  });

  it('renders a no-goal message when the year has no configured goal', async () => {
    render(<StatsSummary db={db} year={2026} />);

    expect(await screen.findByText('Set a goal to map your year in the wild.')).toBeTruthy();
    expect(screen.getByText('Year 2026')).toBeTruthy();
  });
});
