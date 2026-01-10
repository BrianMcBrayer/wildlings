import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SyncStatus } from '../src/components/SyncStatus';
import type { WildlingsDb } from '../src/db/db';
import { useSync } from '../src/hooks/useSync';

vi.mock('../src/hooks/useSync', () => ({
  useSync: vi.fn(),
}));

const makeResult = (overrides: Partial<ReturnType<typeof useSync>> = {}) => ({
  isSyncing: false,
  lastError: null,
  syncNow: vi.fn(),
  scheduleSync: vi.fn(),
  ...overrides,
});

describe('SyncStatus', () => {
  const db = {} as WildlingsDb;

  it('shows syncing state', () => {
    vi.mocked(useSync).mockReturnValue(makeResult({ isSyncing: true }));

    render(<SyncStatus db={db} />);

    expect(screen.getByText('Syncing')).toBeTruthy();
  });

  it('shows error state with retry action', () => {
    vi.mocked(useSync).mockReturnValue(makeResult({ lastError: 'Network down' }));

    render(<SyncStatus db={db} />);

    expect(screen.getByText('Sync issue')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Retry sync' })).toBeTruthy();
  });

  it('shows success state when idle', () => {
    vi.mocked(useSync).mockReturnValue(makeResult());

    render(<SyncStatus db={db} />);

    expect(screen.getByText('All synced')).toBeTruthy();
  });
});
