import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { createDb, getMetadata, setEditingLogId, upsertLogWithOutbox } from '../src/db/db';
import type { LogRecord } from '../src/db/db';
import { pullChanges, syncOnce } from '../src/db/sync';

const server = setupServer();

const makeLog = (overrides?: Partial<LogRecord>): LogRecord => ({
  id: randomUUID(),
  start_at: '2026-01-01T10:00:00Z',
  end_at: '2026-01-01T11:00:00Z',
  note: 'Local log',
  updated_at_local: '2026-01-01T11:00:00Z',
  deleted_at_local: null,
  updated_at_server: null,
  deleted_at_server: null,
  ...overrides,
});

describe('sync engine', () => {
  let dbName: string;

  beforeAll(() => {
    server.listen();
  });

  afterAll(() => {
    server.close();
  });

  beforeEach(() => {
    dbName = `wildlings-sync-${randomUUID()}`;
  });

  afterEach(async () => {
    server.resetHandlers();
    const db = createDb(dbName);
    await db.delete();
  });

  it('pushes outbox ops, applies server fields, and pulls changes', async () => {
    const db = createDb(dbName);
    const log = makeLog();

    await upsertLogWithOutbox(db, log);

    const [op] = await db.sync_queue.toArray();
    const pulledLogId = randomUUID();
    let receivedPushBody: unknown;

    server.use(
      http.post('http://localhost/sync/push', async ({ request }) => {
        receivedPushBody = await request.json();
        return HttpResponse.json({
          server_time: '2026-01-01T12:00:01Z',
          ack_op_ids: [op.op_id],
          rejected: [],
          applied: {
            logs: [
              {
                id: log.id,
                updated_at_server: '2026-01-01T12:00:01Z',
                deleted_at_server: null,
              },
            ],
          },
          next_cursor: 'cursor-1',
        });
      }),
      http.get('http://localhost/sync/pull', () =>
        HttpResponse.json({
          server_time: '2026-01-01T12:00:02Z',
          next_cursor: 'cursor-2',
          changes: {
            logs: [
              {
                id: pulledLogId,
                start_at: '2026-01-02T08:00:00Z',
                end_at: '2026-01-02T09:00:00Z',
                note: 'Server log',
                updated_at_server: '2026-01-01T12:00:02Z',
                deleted_at_server: null,
              },
            ],
          },
        }),
      ),
    );

    await syncOnce(db, {
      baseUrl: 'http://localhost',
      now: () => '2026-01-01T12:00:00Z',
    });

    const remainingOps = await db.sync_queue.toArray();
    expect(remainingOps).toHaveLength(0);

    const storedLog = await db.logs.get(log.id);
    expect(storedLog?.updated_at_server).toBe('2026-01-01T12:00:01Z');

    const pulledLog = await db.logs.get(pulledLogId);
    expect(pulledLog?.note).toBe('Server log');

    const metadata = await getMetadata(db);
    expect(metadata.last_sync_cursor).toBe('cursor-2');
    expect(metadata.last_sync_at).toBe('2026-01-01T12:00:02Z');

    const pushBody = receivedPushBody as {
      device_id: string;
      ops: Array<{ op_id: string }>;
    };
    expect(pushBody.ops).toHaveLength(1);
    expect(pushBody.ops[0].op_id).toBe(op.op_id);
    expect(pushBody.device_id).toBe(metadata.device_id);
  });

  it('skips applying pulled logs that have pending outbox ops', async () => {
    const db = createDb(dbName);
    const log = makeLog({ note: 'Local note' });

    await upsertLogWithOutbox(db, log);

    server.use(
      http.get('http://localhost/sync/pull', () =>
        HttpResponse.json({
          server_time: '2026-01-03T10:00:00Z',
          next_cursor: 'cursor-3',
          changes: {
            logs: [
              {
                id: log.id,
                start_at: log.start_at,
                end_at: log.end_at,
                note: 'Server note',
                updated_at_server: '2026-01-03T10:00:00Z',
                deleted_at_server: null,
              },
            ],
          },
        }),
      ),
    );

    await pullChanges(db, { baseUrl: 'http://localhost' });

    const stored = await db.logs.get(log.id);
    expect(stored?.note).toBe('Local note');
  });

  it('skips applying pulled logs that are being edited', async () => {
    const db = createDb(dbName);
    const log = makeLog({ note: 'Draft note' });

    await db.logs.put(log);
    await setEditingLogId(db, log.id);

    server.use(
      http.get('http://localhost/sync/pull', () =>
        HttpResponse.json({
          server_time: '2026-01-05T10:00:00Z',
          next_cursor: 'cursor-4',
          changes: {
            logs: [
              {
                id: log.id,
                start_at: log.start_at,
                end_at: log.end_at,
                note: 'Server note',
                updated_at_server: '2026-01-05T10:00:00Z',
                deleted_at_server: null,
              },
            ],
          },
        }),
      ),
    );

    await pullChanges(db, { baseUrl: 'http://localhost' });

    const stored = await db.logs.get(log.id);
    expect(stored?.note).toBe('Draft note');
    expect(stored?.updated_at_server).toBeNull();
  });

  it('records backoff metadata after a sync failure', async () => {
    const db = createDb(dbName);

    server.use(
      http.get(
        'http://localhost/sync/pull',
        () => new HttpResponse('Server error', { status: 500 }),
      ),
    );

    await expect(
      syncOnce(db, {
        baseUrl: 'http://localhost',
        now: () => '2026-01-04T10:00:00.000Z',
        random: () => 0,
      }),
    ).rejects.toThrow();

    const metadata = await getMetadata(db);
    expect(metadata.sync_backoff_ms).toBe(1000);
    expect(metadata.next_sync_at).toBe('2026-01-04T10:00:01.000Z');
  });
});
