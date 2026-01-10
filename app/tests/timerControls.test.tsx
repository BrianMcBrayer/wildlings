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

  afterEach(async () => {
    cleanup();
    await db.delete();
    vi.useRealTimers();
  });

  it('starts and stops the timer with persisted log updates', async () => {
    let currentNow = makeTimestamp('08:00:00');
    const now = vi.fn(() => currentNow);

    const { container } = render(<TimerControls db={db} now={now} />);

    expect(await screen.findByText('Ready for your next adventure?')).toBeTruthy();
    expect(screen.getByText('00:00:00')).toBeTruthy();
    const section = container.querySelector('section');
    expect(section?.className).toContain('animate-fade-in');

    fireEvent.click(screen.getByRole('button', { name: /Start/i }));

    expect(await screen.findByText('Active Session')).toBeTruthy();

    currentNow = makeTimestamp('09:00:00');
    fireEvent.click(screen.getByRole('button', { name: /Finish/i }));

    expect(await screen.findByText('Ready for your next adventure?')).toBeTruthy();

    const storedLogs = await db.logs.toArray();
    expect(storedLogs).toHaveLength(1);
    expect(storedLogs[0].end_at).toBe(makeTimestamp('09:00:00'));
  });

  it('reveals edit controls only after toggling edit mode', async () => {
    const now = vi.fn().mockReturnValueOnce(makeTimestamp('10:00:00'));

    render(<TimerControls db={db} now={now} />);

    fireEvent.click(screen.getByRole('button', { name: /Start/i }));
    expect(await screen.findByText('Active Session')).toBeTruthy();

    expect(screen.queryByLabelText('Started at')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Adjust start time/i }));

    expect(await screen.findByLabelText('Started at')).toBeTruthy();
  });

  it('allows adjusting the start time while the timer is active', async () => {
    const now = vi
      .fn()
      .mockReturnValueOnce(makeTimestamp('08:00:00'))
      .mockReturnValueOnce(makeTimestamp('08:10:00'));

    render(<TimerControls db={db} now={now} />);

    fireEvent.click(screen.getByRole('button', { name: /Start/i }));
    expect(await screen.findByText('Active Session')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Adjust start time/i }));
    fireEvent.change(await screen.findByLabelText('Started at'), {
      target: { value: '2026-01-01T07:30' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Update' }));

    await waitFor(async () => {
      const storedLogs = await db.logs.toArray();
      expect(storedLogs[0].start_at).toBe('2026-01-01T07:30:00.000Z');

      const metadata = await getMetadata(db);
      expect(metadata.active_start_at).toBe('2026-01-01T07:30:00.000Z');
    });
  });
});
