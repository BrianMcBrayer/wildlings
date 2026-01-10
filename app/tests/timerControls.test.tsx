import React from 'react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { randomUUID } from 'node:crypto';
import { createDb, getMetadata } from '../src/db/db';
import { TimerControls } from '../src/components/TimerControls';

const makeTimestamp = (suffix: string) => `2026-01-01T${suffix}Z`;

describe('TimerControls', () => {
  let dbName: string;
  let db: ReturnType<typeof createDb>;
  const originalTz = process.env.TZ;

  beforeAll(() => {
    process.env.TZ = 'UTC';
  });

  afterAll(() => {
    process.env.TZ = originalTz;
  });

  beforeEach(() => {
    dbName = `wildlings-timer-controls-${randomUUID()}`;
    db = createDb(dbName);
  });

  afterEach(() => {
    cleanup();
    db.close();
    void db.delete();
    vi.useRealTimers();
  });

  it('starts and stops the timer with persisted log updates', async () => {
    const now = vi
      .fn()
      .mockReturnValueOnce(makeTimestamp('08:00:00'))
      .mockReturnValueOnce(makeTimestamp('09:00:00'));

    const { container } = render(<TimerControls db={db} now={now} />);

    expect(await screen.findByText('Timer idle')).toBeTruthy();
    const section = container.querySelector('section');
    expect(section?.className).toContain('bg-[#f6f1e6]');

    fireEvent.click(screen.getByRole('button', { name: 'Start timer' }));

    expect(await screen.findByText('Timer running')).toBeTruthy();
    expect(screen.getByText('Started at Jan 1, 8:00 AM')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Stop timer' }));

    expect(await screen.findByText('Timer idle')).toBeTruthy();

    const storedLogs = await db.logs.toArray();
    expect(storedLogs).toHaveLength(1);
    expect(storedLogs[0].end_at).toBe(makeTimestamp('09:00:00'));
  });

  it('shows a brief success message after stopping', async () => {
    const now = vi
      .fn()
      .mockReturnValueOnce(makeTimestamp('10:00:00'))
      .mockReturnValueOnce(makeTimestamp('10:30:00'));

    render(<TimerControls db={db} now={now} />);

    fireEvent.click(screen.getByRole('button', { name: 'Start timer' }));
    expect(await screen.findByText('Timer running')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Stop timer' }));

    expect(await screen.findByText('Timer stopped. Nice work.')).toBeTruthy();

    await waitFor(
      () => {
        expect(screen.queryByText('Timer stopped. Nice work.')).toBeNull();
      },
      { timeout: 3000 },
    );
  });

  it('allows adjusting the start time while the timer is active', async () => {
    const now = vi
      .fn()
      .mockReturnValueOnce(makeTimestamp('08:00:00'))
      .mockReturnValueOnce(makeTimestamp('08:10:00'));

    render(<TimerControls db={db} now={now} />);

    fireEvent.click(screen.getByRole('button', { name: 'Start timer' }));
    expect(await screen.findByText('Timer running')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Adjust start time'), {
      target: { value: '2026-01-01T07:30' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Update start time' }));

    expect(await screen.findByText('Started at Jan 1, 7:30 AM')).toBeTruthy();

    const storedLogs = await db.logs.toArray();
    expect(storedLogs[0].start_at).toBe('2026-01-01T07:30:00.000Z');

    const metadata = await getMetadata(db);
    expect(metadata.active_start_at).toBe('2026-01-01T07:30:00.000Z');
  });
});
