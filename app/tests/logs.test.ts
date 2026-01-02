import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import {
  createDb,
  createManualLogWithOutbox,
  deleteLogWithOutbox,
  startTimerWithOutbox,
  updateLogWithOutbox,
} from '../src/db/db';

const makeTimestamp = (suffix: string) => `2026-01-01T${suffix}Z`;

describe('log management rules', () => {
  let dbName: string;

  beforeEach(() => {
    dbName = `wildlings-logs-${randomUUID()}`;
  });

  afterEach(async () => {
    const db = createDb(dbName);
    await db.delete();
  });

  it('creates manual logs with end times and enqueues outbox ops', async () => {
    const db = createDb(dbName);

    const created = await createManualLogWithOutbox(db, {
      startAt: makeTimestamp('10:00:00'),
      endAt: makeTimestamp('11:00:00'),
      note: 'Trail walk',
      updatedAtLocal: makeTimestamp('11:05:00'),
    });

    const stored = await db.logs.get(created.id);
    expect(stored?.end_at).toBe(makeTimestamp('11:00:00'));
    expect(stored?.note).toBe('Trail walk');

    const ops = await db.sync_queue.toArray();
    expect(ops).toHaveLength(1);
    expect(ops[0].action).toBe('upsert');
    expect(ops[0].record_id).toBe(created.id);
  });

  it('rejects manual logs missing an end time', async () => {
    const db = createDb(dbName);

    await expect(
      createManualLogWithOutbox(db, {
        startAt: makeTimestamp('12:00:00'),
        endAt: null,
        note: null,
        updatedAtLocal: makeTimestamp('12:05:00'),
      }),
    ).rejects.toThrow('Manual logs require an end time');
  });

  it('blocks edits and deletes for the active log', async () => {
    const db = createDb(dbName);

    const active = await startTimerWithOutbox(db, { startAt: makeTimestamp('08:00:00') });

    await expect(
      updateLogWithOutbox(db, {
        logId: active.id,
        startAt: makeTimestamp('08:00:00'),
        endAt: makeTimestamp('09:00:00'),
        note: 'Sunrise',
        updatedAtLocal: makeTimestamp('09:00:00'),
      }),
    ).rejects.toThrow('Cannot edit an active log');

    await expect(deleteLogWithOutbox(db, active.id, makeTimestamp('09:05:00'))).rejects.toThrow(
      'Cannot delete an active log',
    );
  });

  it('updates existing logs and enqueues outbox ops', async () => {
    const db = createDb(dbName);

    const created = await createManualLogWithOutbox(db, {
      startAt: makeTimestamp('13:00:00'),
      endAt: makeTimestamp('14:00:00'),
      note: null,
      updatedAtLocal: makeTimestamp('14:00:00'),
    });

    const updated = await updateLogWithOutbox(db, {
      logId: created.id,
      startAt: makeTimestamp('13:30:00'),
      endAt: makeTimestamp('14:30:00'),
      note: 'Park visit',
      updatedAtLocal: makeTimestamp('14:35:00'),
    });

    const stored = await db.logs.get(created.id);
    expect(stored?.start_at).toBe(makeTimestamp('13:30:00'));
    expect(stored?.note).toBe('Park visit');
    expect(updated.updated_at_local).toBe(makeTimestamp('14:35:00'));

    const ops = await db.sync_queue.toArray();
    expect(ops).toHaveLength(2);
    const updateOp = ops.find(
      (op) =>
        op.action === 'upsert' &&
        (op.payload as LogRecord).updated_at_local === makeTimestamp('14:35:00'),
    );
    expect(updateOp?.record_id).toBe(created.id);
    expect(updateOp?.payload).toMatchObject({
      start_at: makeTimestamp('13:30:00'),
      end_at: makeTimestamp('14:30:00'),
    });
  });
});
