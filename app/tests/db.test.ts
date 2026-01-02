import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { randomUUID } from "node:crypto";
import {
  clearActiveTimer,
  createDb,
  deleteLogWithOutbox,
  getMetadata,
  getOrCreateDeviceId,
  setActiveTimer,
  setYearlyGoal,
  upsertLogWithOutbox,
} from "../src/db/db";
import type { LogRecord } from "../src/db/db";

const makeLog = (overrides?: Partial<LogRecord>): LogRecord => ({
  id: randomUUID(),
  start_at: "2026-01-01T10:00:00Z",
  end_at: "2026-01-01T11:00:00Z",
  note: null,
  updated_at_local: "2026-01-01T11:00:00Z",
  deleted_at_local: null,
  updated_at_server: null,
  deleted_at_server: null,
  ...overrides,
});

describe("Dexie local data foundation", () => {
  let dbName: string;

  beforeEach(() => {
    dbName = `wildlings-test-${randomUUID()}`;
  });

  afterEach(async () => {
    const db = createDb(dbName);
    await db.delete();
  });

  it("creates and updates logs while enqueueing outbox ops", async () => {
    const db = createDb(dbName);
    const log = makeLog();

    await upsertLogWithOutbox(db, log);

    const stored = await db.logs.get(log.id);
    expect(stored?.note).toBeNull();

    const opsAfterCreate = await db.sync_queue.toArray();
    expect(opsAfterCreate).toHaveLength(1);
    expect(opsAfterCreate[0].action).toBe("upsert");
    expect(opsAfterCreate[0].record_id).toBe(log.id);
    expect(opsAfterCreate[0].payload).toEqual(log);

    const updatedLog = {
      ...log,
      note: "Snow day",
      updated_at_local: "2026-01-01T12:00:00Z",
    };

    await upsertLogWithOutbox(db, updatedLog);

    const storedUpdated = await db.logs.get(log.id);
    expect(storedUpdated?.note).toBe("Snow day");

    const opsAfterUpdate = await db.sync_queue.toArray();
    expect(opsAfterUpdate).toHaveLength(2);
    const updateOp = opsAfterUpdate.find(
      (op) =>
        op.action === "upsert" &&
        (op.payload as LogRecord).updated_at_local ===
          "2026-01-01T12:00:00Z",
    );
    expect(updateOp?.payload).toEqual(updatedLog);
  });

  it("tombstones deletes and enqueues delete ops", async () => {
    const db = createDb(dbName);
    const log = makeLog();

    await upsertLogWithOutbox(db, log);

    const deletedAt = "2026-01-01T12:30:00Z";
    await deleteLogWithOutbox(db, log.id, deletedAt);

    const stored = await db.logs.get(log.id);
    expect(stored?.deleted_at_local).toBe(deletedAt);

    const ops = await db.sync_queue.toArray();
    expect(ops).toHaveLength(2);
    const deleteOp = ops.find((op) => op.action === "delete");
    expect(deleteOp?.record_id).toBe(log.id);
    expect(deleteOp?.payload).toEqual({
      id: log.id,
      deleted_at_local: deletedAt,
    });
  });

  it("persists metadata helpers", async () => {
    const db = createDb(dbName);

    const deviceId = await getOrCreateDeviceId(db);
    expect(deviceId).toBeTruthy();

    const deviceIdAgain = await getOrCreateDeviceId(db);
    expect(deviceIdAgain).toBe(deviceId);

    await setActiveTimer(db, {
      logId: "log-123",
      startAt: "2026-01-02T09:00:00Z",
    });

    let metadata = await getMetadata(db);
    expect(metadata.active_log_id).toBe("log-123");
    expect(metadata.active_start_at).toBe("2026-01-02T09:00:00Z");

    await clearActiveTimer(db);
    metadata = await getMetadata(db);
    expect(metadata.active_log_id).toBeNull();
    expect(metadata.active_start_at).toBeNull();

    await setYearlyGoal(db, { year: 2026, hours: 250 });
    metadata = await getMetadata(db);
    expect(metadata.yearly_goal_year).toBe(2026);
    expect(metadata.yearly_goal_hours).toBe(250);
  });
});
