import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { randomUUID } from 'node:crypto';
import { createDb } from '../src/db/db';
import { useSync } from '../src/hooks/useSync';

describe('useSync', () => {
  let dbName: string;

  beforeEach(() => {
    dbName = `wildlings-use-sync-${randomUUID()}`;
  });

  afterEach(async () => {
    vi.useRealTimers();
    const db = createDb(dbName);
    await db.delete();
  });

  it('runs sync on mount and on visibility changes', async () => {
    const db = createDb(dbName);
    const syncFn = vi.fn().mockResolvedValue({ skipped: false });

    const { unmount } = renderHook(() => useSync(db, { syncFn }));

    await waitFor(() => expect(syncFn).toHaveBeenCalled());
    const initialCalls = syncFn.mock.calls.length;

    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      configurable: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(syncFn).toHaveBeenCalledTimes(initialCalls);

    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      configurable: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));

    await waitFor(() => expect(syncFn).toHaveBeenCalledTimes(initialCalls + 1));

    unmount();
  });

  it('debounces scheduled sync requests', async () => {
    const db = createDb(dbName);
    const syncFn = vi.fn().mockResolvedValue({ skipped: false });

    const { result, unmount } = renderHook(() => useSync(db, { syncFn, debounceMs: 250 }));

    await waitFor(() => expect(syncFn).toHaveBeenCalled());
    const initialCalls = syncFn.mock.calls.length;

    vi.useFakeTimers();

    act(() => {
      result.current.scheduleSync();
      result.current.scheduleSync();
      result.current.scheduleSync();
    });

    await act(async () => {
      vi.advanceTimersByTime(249);
    });

    expect(syncFn).toHaveBeenCalledTimes(initialCalls);

    await act(async () => {
      vi.advanceTimersByTime(1);
    });

    expect(syncFn).toHaveBeenCalledTimes(initialCalls + 1);

    unmount();
  });

  it('runs sync when the browser comes online', async () => {
    const db = createDb(dbName);
    const syncFn = vi.fn().mockResolvedValue({ skipped: false });

    const { unmount } = renderHook(() => useSync(db, { syncFn }));

    await waitFor(() => expect(syncFn).toHaveBeenCalled());
    const initialCalls = syncFn.mock.calls.length;

    window.dispatchEvent(new Event('online'));

    await waitFor(() => expect(syncFn).toHaveBeenCalledTimes(initialCalls + 1));

    unmount();
  });
});
