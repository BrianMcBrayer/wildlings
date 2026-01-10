import React from 'react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { randomUUID } from 'node:crypto';
import { createDb, setActiveTimer } from '../src/db/db';
import type { LogRecord } from '../src/db/db';
import { LogsManager } from '../src/components/LogsManager';

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

  afterEach(() => {
    cleanup();
    db.close();
    void db.delete();
  });

  it('renders existing logs from the local database', async () => {
    await db.logs.bulkPut([
      makeLog({
        start_at: '2026-01-02T08:00:00Z',
        end_at: '2026-01-02T09:00:00Z',
        note: 'Creek walk',
        updated_at_local: '2026-01-02T09:00:00Z',
      }),
      makeLog({
        start_at: '2026-01-03T15:00:00Z',
        end_at: '2026-01-03T16:30:00Z',
        note: 'Backyard time',
        updated_at_local: '2026-01-03T16:30:00Z',
      }),
    ]);

    const { container } = render(<LogsManager db={db} />);

    expect(await screen.findByText('Creek walk')).toBeTruthy();
    expect(screen.getByText('Backyard time')).toBeTruthy();
    expect(screen.getByText('Jan 2, 8:00 AM → Jan 2, 9:00 AM')).toBeTruthy();
    expect(screen.getByText('Jan 3, 3:00 PM → Jan 3, 4:30 PM')).toBeTruthy();

    const section = container.querySelector('section');
    expect(section?.className).toContain('bg-[#f6f1e6]');

    const logCard = screen.getByText('Creek walk').closest('article');
    expect(logCard?.className).toContain('bg-[#fbf7ef]');
    expect(logCard?.className).toContain('shadow-sm');
  });

  it('uses datetime-local inputs for manual and edit fields', async () => {
    const log = makeLog({ note: 'Editable log' });
    await db.logs.put(log);

    render(<LogsManager db={db} />);

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
