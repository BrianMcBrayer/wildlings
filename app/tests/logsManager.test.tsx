import React from 'react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { randomUUID } from 'node:crypto';
import dayjs from 'dayjs';
import { createDb, setActiveTimer } from '../src/db/db';
import type { LogRecord } from '../src/db/db';
import { LogsManager } from '../src/components/LogsManager';
import { formatLocalDateTime } from '../src/lib/datetime';

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

describe('LogsManager', () => {
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
    dbName = `wildlings-logs-manager-${randomUUID()}`;
    db = createDb(dbName);
  });

  afterEach(async () => {
    cleanup();
    await db.delete();
    vi.useRealTimers();
  });

  it('renders existing logs from the local database', async () => {
    const today = dayjs().startOf('day');
    const yesterday = today.subtract(1, 'day');
    const todayStart = today.add(15, 'hour').toISOString();
    const todayEnd = today.add(16, 'hour').toISOString();
    const yesterdayStart = yesterday.add(8, 'hour').toISOString();
    const yesterdayEnd = yesterday.add(9, 'hour').toISOString();

    await db.logs.bulkPut([
      makeLog({
        start_at: yesterdayStart,
        end_at: yesterdayEnd,
        note: 'Creek walk',
        updated_at_local: yesterdayEnd,
      }),
      makeLog({
        start_at: todayStart,
        end_at: todayEnd,
        note: 'Backyard time',
        updated_at_local: todayEnd,
      }),
    ]);

    const { container } = render(<LogsManager db={db} />);

    expect(await screen.findByText('Creek walk')).toBeTruthy();
    expect(screen.getByText('Backyard time')).toBeTruthy();
    expect(screen.getByText('Yesterday')).toBeTruthy();
    expect(screen.getByText('Today')).toBeTruthy();
    expect(
      screen.getByText(
        `${formatLocalDateTime(yesterdayStart)} → ${formatLocalDateTime(yesterdayEnd)}`,
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(`${formatLocalDateTime(todayStart)} → ${formatLocalDateTime(todayEnd)}`),
    ).toBeTruthy();

    const section = container.querySelector('section');
    expect(section?.className).toContain('bg-wild-paper');
    expect(section?.className).toContain('animate-fade-in');

    const logCard = screen.getByText('Creek walk').closest('article');
    expect(logCard?.className).toContain('bg-white');
    expect(logCard?.className).toContain('shadow-sm');
  });

  it('uses datetime-local inputs for manual and edit fields', async () => {
    const log = makeLog({ note: 'Editable log' });
    await db.logs.put(log);

    render(<LogsManager db={db} />);

    fireEvent.click(screen.getByRole('button', { name: 'Add past log' }));

    const startInput = screen.getByLabelText('Start time') as HTMLInputElement;
    const endInput = screen.getByLabelText('End time') as HTMLInputElement;
    expect(startInput.type).toBe('datetime-local');
    expect(endInput.type).toBe('datetime-local');

    fireEvent.click(await screen.findByRole('button', { name: 'Edit log' }));

    const editStartInput = screen.getByLabelText('Edit start time') as HTMLInputElement;
    const editEndInput = screen.getByLabelText('Edit end time') as HTMLInputElement;
    expect(editStartInput.type).toBe('datetime-local');
    expect(editEndInput.type).toBe('datetime-local');
  });

  it('creates a manual log and refreshes the list', async () => {
    const now = vi.fn().mockReturnValue('2026-02-01T11:00:00Z');

    render(<LogsManager db={db} now={now} />);

    fireEvent.click(screen.getByRole('button', { name: 'Add past log' }));

    fireEvent.change(screen.getByLabelText('Start time'), {
      target: { value: '2026-02-01T09:00' },
    });
    fireEvent.change(screen.getByLabelText('End time'), {
      target: { value: '2026-02-01T11:00' },
    });
    fireEvent.change(screen.getByLabelText('Note'), {
      target: { value: 'Garden play' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Add log' }));

    expect(await screen.findByText('Garden play')).toBeTruthy();
    const storedLogs = await db.logs.toArray();
    expect(storedLogs).toHaveLength(1);
    expect(storedLogs[0].updated_at_local).toBe('2026-02-01T11:00:00Z');
    expect(storedLogs[0].start_at).toBe('2026-02-01T09:00:00.000Z');
    expect(storedLogs[0].end_at).toBe('2026-02-01T11:00:00.000Z');
  });

  it('tombstones a log when delete is clicked', async () => {
    const log = makeLog({ note: 'Snow hike' });
    await db.logs.put(log);

    render(<LogsManager db={db} />);

    expect(await screen.findByText('Snow hike')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Delete log' }));

    await waitFor(() => {
      expect(screen.queryByText('Snow hike')).toBeNull();
    });

    const stored = await db.logs.get(log.id);
    expect(stored?.deleted_at_local).not.toBeNull();
  });

  it('edits a log and refreshes the list', async () => {
    const log = makeLog({ note: 'Before update' });
    await db.logs.put(log);

    render(<LogsManager db={db} />);

    expect(await screen.findByText('Before update')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Edit log' }));

    fireEvent.change(screen.getByLabelText('Edit note'), {
      target: { value: 'After update' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('After update')).toBeTruthy();
    expect(screen.queryByText('Before update')).toBeNull();
  });

  it('disables editing for the active log', async () => {
    const log = makeLog({ note: 'Active log' });
    await db.logs.put(log);
    await setActiveTimer(db, { logId: log.id, startAt: log.start_at });

    render(<LogsManager db={db} />);

    expect(await screen.findByText('Active log')).toBeTruthy();
    expect(screen.getByText('Active timer')).toBeTruthy();
    const editButton = screen.getByRole('button', { name: 'Edit log' }) as HTMLButtonElement;
    expect(editButton.disabled).toBe(true);
  });
});
