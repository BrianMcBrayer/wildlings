import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { cleanup, render, screen } from '@testing-library/react';
import { RouterProvider, createMemoryHistory } from '@tanstack/react-router';
import { createDb, type WildlingsDb } from '../src/db/db';
import { createAppRouter } from '../src/router';

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

    expect(await screen.findByText('Timer')).toBeTruthy();
    expect(await screen.findByText('Your Outdoor Adventure')).toBeTruthy();
    expect(container.querySelector('[data-testid="app-layout"]')).toBeTruthy();
  });

  it('renders the logs route with the log manager', async () => {
    db = createDb(dbName);
    const router = createAppRouter(db, createMemoryHistory({ initialEntries: ['/logs'] }));

    render(<RouterProvider router={router} />);

    expect(await screen.findByText('Outdoor entries')).toBeTruthy();
  });

  it('renders the settings route', async () => {
    db = createDb(dbName);
    const router = createAppRouter(db, createMemoryHistory({ initialEntries: ['/settings'] }));

    render(<RouterProvider router={router} />);

    const settingsLabels = await screen.findAllByText('Settings');
    expect(settingsLabels.length).toBeGreaterThan(0);
  });
});
