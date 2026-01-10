import React from 'react';
import { Link, Outlet, createRootRouteWithContext } from '@tanstack/react-router';
import type { WildlingsDb } from '../db/db';
import { SyncStatus } from '../components/SyncStatus';

export const Route = createRootRouteWithContext<{ db: WildlingsDb }>()({
  component: RootLayout,
});

const navStyles = {
  base: 'rounded-full px-3 py-1 text-sm font-semibold transition',
  active: 'bg-emerald-600 text-white',
  inactive: 'text-slate-600 hover:text-slate-900',
};

function RootLayout() {
  const { db } = Route.useRouteContext();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f5f2e8] via-white to-[#e6f2ed] text-slate-900">
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6" data-testid="app-layout">
        <header className="flex w-full flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Wildlings</p>
            <h1 className="text-2xl font-semibold">Outside time, counted.</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <SyncStatus db={db} />
            <nav className="flex items-center gap-2 rounded-full bg-white/80 p-2 shadow-sm ring-1 ring-slate-200">
              <Link
                to="/"
                className={`${navStyles.base} ${navStyles.inactive}`}
                activeOptions={{ exact: true }}
                activeProps={{ className: `${navStyles.base} ${navStyles.active}` }}
              >
                Home
              </Link>
              <Link
                to="/logs"
                className={`${navStyles.base} ${navStyles.inactive}`}
                activeProps={{ className: `${navStyles.base} ${navStyles.active}` }}
              >
                Logs
              </Link>
              <Link
                to="/settings"
                className={`${navStyles.base} ${navStyles.inactive}`}
                activeProps={{ className: `${navStyles.base} ${navStyles.active}` }}
              >
                Settings
              </Link>
            </nav>
          </div>
        </header>

        <main className="w-full pb-16">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
