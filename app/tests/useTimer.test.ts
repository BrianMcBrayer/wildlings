import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { createDb, getMetadata } from "../src/db/db";
import { useTimer } from "../src/hooks/useTimer";

describe("useTimer", () => {
  let dbName: string;

  beforeEach(() => {
    dbName = `wildlings-timer-${crypto.randomUUID()}`;
  });

  afterEach(async () => {
    const db = createDb(dbName);
    await db.delete();
  });

  it("starts a timer by creating a running log and outbox op", async () => {
    const db = createDb(dbName);
    const { result, unmount } = renderHook(() => useTimer(db));

    await act(async () => {
      await result.current.startTimer("2026-01-01T10:00:00Z");
    });

    const metadata = await getMetadata(db);
    expect(metadata.active_log_id).toBeTruthy();
    expect(metadata.active_start_at).toBe("2026-01-01T10:00:00Z");

    const log = await db.logs.get(metadata.active_log_id ?? "");
    expect(log?.start_at).toBe("2026-01-01T10:00:00Z");
    expect(log?.end_at).toBeNull();

    const ops = await db.sync_queue.toArray();
    expect(ops).toHaveLength(1);
    const startOp = ops.find(
      (op) =>
        op.action === "upsert" && op.record_id === metadata.active_log_id,
    );
    expect(startOp).toBeTruthy();

    unmount();
  });

  it("stops a timer by closing the log and clearing metadata", async () => {
    const db = createDb(dbName);
    const { result, unmount } = renderHook(() => useTimer(db));

    await act(async () => {
      await result.current.startTimer("2026-01-01T10:00:00Z");
    });

    await act(async () => {
      await result.current.stopTimer("2026-01-01T11:00:00Z");
    });

    const metadata = await getMetadata(db);
    expect(metadata.active_log_id).toBeNull();
    expect(metadata.active_start_at).toBeNull();

    const logs = await db.logs.toArray();
    expect(logs).toHaveLength(1);
    expect(logs[0].end_at).toBe("2026-01-01T11:00:00Z");
    expect(logs[0].updated_at_local).toBe("2026-01-01T11:00:00Z");

    const ops = await db.sync_queue.toArray();
    expect(ops).toHaveLength(2);
    const stopOp = ops.find(
      (op) =>
        op.action === "upsert" &&
        (op.payload as { end_at?: string }).end_at ===
          "2026-01-01T11:00:00Z",
    );
    expect(stopOp?.record_id).toBe(logs[0].id);

    unmount();
  });

  it("rejects starting a timer when one is already active", async () => {
    const db = createDb(dbName);
    const { result, unmount } = renderHook(() => useTimer(db));

    await act(async () => {
      await result.current.startTimer("2026-01-01T10:00:00Z");
    });

    await expect(
      act(async () => {
        await result.current.startTimer("2026-01-01T12:00:00Z");
      }),
    ).rejects.toThrow("Timer already active");

    const logs = await db.logs.toArray();
    expect(logs).toHaveLength(1);

    unmount();
  });
});
