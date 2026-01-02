import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { randomUUID } from 'node:crypto';
import { createDb, createManualLogWithOutbox, getMetadata, setActiveTimer } from '../src/db/db';
import type { LogRecord } from '../src/db/db';
import { useLogs } from '../src/hooks/useLogs';

const makeTimestamp = (suffix: string) => `2026-01-01T${suffix}Z`;

const makeLog = (overrides?: Partial<LogRecord>): LogRecord => ({
  id: randomUUID(),
  start_at: makeTimestamp('09:00:00'),
  end_at: makeTimestamp('10:00:00'),
  note: null,
  updated_at_local: makeTimestamp('10:00:00'),
  deleted_at_local: null,
  updated_at_server: null,
  deleted_at_server: null,
  ...overrides,
});

describe('useLogs', () => {
  let dbName: string;

  beforeEach(() => {
    dbName = `wildlings-logs-hook-${randomUUID()}`;
  });

  afterEach(async () => {
    const db = createDb(dbName);
    await db.delete();
  });

  it('loads only non-deleted logs and exposes active timer metadata', async () => {
    const db = createDb(dbName);
    const keep = makeLog();
    const deletedLocal = makeLog({
      id: randomUUID(),
      deleted_at_local: makeTimestamp('12:00:00'),
    });
    const deletedServer = makeLog({
      id: randomUUID(),
      deleted_at_server: makeTimestamp('12:05:00'),
    });

    await db.logs.bulkPut([keep, deletedLocal, deletedServer]);
    await setActiveTimer(db, {
      logId: 'active-log',
      startAt: makeTimestamp('08:00:00'),
    });

    const { result, unmount } = renderHook(() => useLogs(db));

    await waitFor(() => expect(result.current.logs).toHaveLength(1));
    expect(result.current.logs[0].id).toBe(keep.id);

    const metadata = await getMetadata(db);
    expect(result.current.activeLogId).toBe(metadata.active_log_id);
    expect(result.current.activeStartAt).toBe(metadata.active_start_at);

    unmount();
  });

  it('creates manual logs and refreshes the list', async () => {
    const db = createDb(dbName);
    const { result, unmount } = renderHook(() => useLogs(db));

    await act(async () => {
      await result.current.createManualLog({
        startAt: makeTimestamp('13:00:00'),
        endAt: makeTimestamp('14:00:00'),
        note: 'Lake visit',
        updatedAtLocal: makeTimestamp('14:05:00'),
      });
    });

    await waitFor(() => expect(result.current.logs).toHaveLength(1));
    expect(result.current.logs[0].note).toBe('Lake visit');

    unmount();
  });

  it('updates logs and refreshes the list', async () => {
    const db = createDb(dbName);
    const existing = await createManualLogWithOutbox(db, {
      startAt: makeTimestamp('15:00:00'),
      endAt: makeTimestamp('16:00:00'),
      note: null,
      updatedAtLocal: makeTimestamp('16:00:00'),
    });

    const { result, unmount } = renderHook(() => useLogs(db));

    await waitFor(() => expect(result.current.logs).toHaveLength(1));

    await act(async () => {
      await result.current.updateLog({
        logId: existing.id,
        startAt: makeTimestamp('15:30:00'),
        endAt: makeTimestamp('16:30:00'),
        note: 'River walk',
        updatedAtLocal: makeTimestamp('16:35:00'),
      });
    });

    await waitFor(() => expect(result.current.logs[0].note).toBe('River walk'));

    unmount();
  });

  it('tombstones deletes and hides them from the list', async () => {
    const db = createDb(dbName);
    const existing = await createManualLogWithOutbox(db, {
      startAt: makeTimestamp('17:00:00'),
      endAt: makeTimestamp('18:00:00'),
      note: null,
      updatedAtLocal: makeTimestamp('18:00:00'),
    });

    const { result, unmount } = renderHook(() => useLogs(db));

    await waitFor(() => expect(result.current.logs).toHaveLength(1));

    await act(async () => {
      await result.current.deleteLog(existing.id, makeTimestamp('18:05:00'));
    });

    await waitFor(() => expect(result.current.logs).toHaveLength(0));

    unmount();
  });
});
