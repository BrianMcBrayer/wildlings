import React from 'react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { randomUUID } from 'node:crypto';
import { createDb } from '../src/db/db';
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
    expect(screen.getByText('00:00:00.000')).toBeTruthy();
    const section = container.querySelector('section');
    expect(section?.className).toContain('animate-fade-in');

    fireEvent.click(screen.getByRole('button', { name: /Start/i }));

    expect(await screen.findByRole('button', { name: /Finish/i })).toBeTruthy();

    currentNow = makeTimestamp('09:00:00');
    fireEvent.click(screen.getByRole('button', { name: /Finish/i }));

    expect(await screen.findByText('Ready for your next adventure?')).toBeTruthy();

    const storedLogs = await db.logs.toArray();
    expect(storedLogs).toHaveLength(1);
    expect(storedLogs[0].end_at).toBe(makeTimestamp('09:00:00'));
  });
});
