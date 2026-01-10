import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { cleanup, render, screen } from '@testing-library/react';
import { RouterProvider, createMemoryHistory } from '@tanstack/react-router';
import { createDb, type WildlingsDb } from '../src/db/db';
import { createAppRouter } from '../src/router';

vi.mock('../src/hooks/useSync', () => ({
  useSync: vi.fn(() => ({
    isSyncing: false,
    lastError: null,
    syncNow: vi.fn(() => Promise.resolve()),
    scheduleSync: vi.fn(),
  })),
}));

describe('app routes', () => {
  let dbName: string;
  let db: WildlingsDb | null = null;

  beforeEach(() => {
    dbName = `wildlings-app-${randomUUID()}`;
  });

  afterEach(async () => {
    cleanup();
    if (db) {
      db.close();
      await db.delete();
      db = null;
    } else {
      const cleanup = createDb(dbName);
      cleanup.close();
      await cleanup.delete();
    }
  });

  it('renders the home route with timer and stats', async () => {
    db = createDb(dbName);
    const router = createAppRouter(db, createMemoryHistory({ initialEntries: ['/'] }));

    const { container } = render(<RouterProvider router={router} />);

    expect(await screen.findByText('Ready for adventure?')).toBeTruthy();
    expect(await screen.findByText("You've spent 0h 0m outside this year.")).toBeTruthy();
    const logoBlock = container.querySelector('[data-testid="wildlings-header"]');
    expect(logoBlock?.className).toContain('flex');
    expect(container.querySelector('[data-testid="app-layout"]')).toBeTruthy();
  });

  it('renders the logs route with the log manager', async () => {
    db = createDb(dbName);
    const router = createAppRouter(db, createMemoryHistory({ initialEntries: ['/logs'] }));

    render(<RouterProvider router={router} />);

    expect(await screen.findByText('Field notes')).toBeTruthy();
  });

  it('renders the settings route', async () => {
    db = createDb(dbName);
    const router = createAppRouter(db, createMemoryHistory({ initialEntries: ['/settings'] }));

    render(<RouterProvider router={router} />);

    const settingsLabels = await screen.findAllByText('Settings');
    expect(settingsLabels.length).toBeGreaterThan(0);
  });
});
