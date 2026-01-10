import { describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import {
  syncPullResponseSchema,
  syncPushRequestSchema,
  syncPushResponseSchema,
} from '../src/db/syncSchemas';

describe('sync contract schemas', () => {
  it('accepts push request and response payloads', () => {
    const deviceId = randomUUID();
    const opId = randomUUID();
    const logId = randomUUID();

    const requestPayload = {
      device_id: deviceId,
      client_time: '2026-01-01T12:00:00Z',
      ops: [
        {
          op_id: opId,
          entity: 'log',
          action: 'upsert',
          record_id: logId,
          payload: {
            id: logId,
            start_at: '2026-01-01T11:00:00Z',
            end_at: '2026-01-01T12:00:00Z',
            note: 'Played outside',
            updated_at_local: '2026-01-01T12:00:00Z',
            deleted_at_local: null,
            updated_at_server: null,
            deleted_at_server: null,
          },
        },
      ],
    };

    const responsePayload = {
      server_time: '2026-01-01T12:00:01Z',
      ack_op_ids: [opId],
      rejected: [],
      applied: {
        logs: [
          {
            id: logId,
            updated_at_server: '2026-01-01T12:00:01Z',
            deleted_at_server: null,
          },
        ],
      },
      next_cursor: 'cursor-1',
    };

    expect(syncPushRequestSchema.safeParse(requestPayload).success).toBe(true);
    expect(syncPushResponseSchema.safeParse(responsePayload).success).toBe(true);
  });

  it('accepts pull response payloads', () => {
    const logId = randomUUID();

    const responsePayload = {
      server_time: '2026-01-01T12:00:02Z',
      next_cursor: 'cursor-2',
      changes: {
        logs: [
          {
            id: logId,
            start_at: '2026-01-01T11:00:00Z',
            end_at: '2026-01-01T12:00:00Z',
            note: 'Played outside',
            updated_at_server: '2026-01-01T12:00:01Z',
            deleted_at_server: null,
          },
          {
            id: randomUUID(),
            start_at: '2026-01-01T09:00:00Z',
            end_at: '2026-01-01T10:00:00Z',
            note: null,
            updated_at_server: '2026-01-01T12:00:01Z',
            deleted_at_server: '2026-01-01T12:00:01Z',
          },
        ],
      },
    };

    expect(syncPullResponseSchema.safeParse(responsePayload).success).toBe(true);
  });
});
