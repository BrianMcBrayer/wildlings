import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';

vi.mock('../src/db/db', () => ({
  createDb: vi.fn(() => ({})),
}));

vi.mock('../src/hooks/useSync', () => ({
  useSync: vi.fn(),
}));

vi.mock('@tanstack/react-router', () => ({
  RouterProvider: () => null,
  createBrowserHistory: vi.fn(() => ({})),
}));

vi.mock('../src/router', () => ({
  createAppRouter: vi.fn(() => ({})),
}));

import { App } from '../src/app';
import { createAppRouter } from '../src/router';

describe('App router stability', () => {
  afterEach(() => {
    cleanup();
  });

  it('creates the app router once for multiple mounts', () => {
    render(<App />);
    render(<App />);

    expect(createAppRouter).toHaveBeenCalledTimes(1);
  });
});
