import { z } from 'zod';

const isoInstant = z.string();

const logPayloadSchema = z.object({
  id: z.string().uuid(),
  start_at: isoInstant,
  end_at: isoInstant.nullable(),
  note: z.string().nullable(),
  updated_at_local: isoInstant,
  deleted_at_local: isoInstant.nullable(),
  updated_at_server: isoInstant.nullable(),
  deleted_at_server: isoInstant.nullable(),
});

const deletePayloadSchema = z.object({
  id: z.string().uuid(),
  deleted_at_local: isoInstant,
});

const syncOpSchema = z.discriminatedUnion('action', [
  z.object({
    op_id: z.string().uuid(),
    entity: z.literal('log'),
    action: z.literal('upsert'),
    record_id: z.string().uuid(),
    payload: logPayloadSchema,
  }),
  z.object({
    op_id: z.string().uuid(),
    entity: z.literal('log'),
    action: z.literal('delete'),
    record_id: z.string().uuid(),
    payload: deletePayloadSchema,
  }),
]);

const pushRequestSchema = z.object({
  device_id: z.string().uuid(),
  client_time: isoInstant,
  ops: z.array(syncOpSchema),
});

const rejectedOpSchema = z.object({
  op_id: z.string().uuid(),
  code: z.string(),
  message: z.string(),
});

const appliedLogSchema = z.object({
  id: z.string().uuid(),
  updated_at_server: isoInstant,
  deleted_at_server: isoInstant.nullable(),
});

const pushResponseSchema = z.object({
  server_time: isoInstant,
  ack_op_ids: z.array(z.string().uuid()),
  rejected: z.array(rejectedOpSchema),
  applied: z.object({
    logs: z.array(appliedLogSchema),
  }),
  next_cursor: z.string(),
});

const pullLogSchema = z.object({
  id: z.string().uuid(),
  start_at: isoInstant,
  end_at: isoInstant.nullable(),
  note: z.string().nullable(),
  updated_at_server: isoInstant,
  deleted_at_server: isoInstant.nullable(),
});

const pullResponseSchema = z.object({
  server_time: isoInstant,
  next_cursor: z.string(),
  changes: z.object({
    logs: z.array(pullLogSchema),
  }),
});

export type SyncPushRequest = z.infer<typeof pushRequestSchema>;
export type SyncPushResponse = z.infer<typeof pushResponseSchema>;
export type SyncPullResponse = z.infer<typeof pullResponseSchema>;
export type SyncOp = z.infer<typeof syncOpSchema>;
export type SyncPullLog = z.infer<typeof pullLogSchema>;

export {
  logPayloadSchema,
  pushRequestSchema as syncPushRequestSchema,
  pushResponseSchema as syncPushResponseSchema,
  pullResponseSchema as syncPullResponseSchema,
  syncOpSchema,
  pullLogSchema,
};
