import React from 'react';
import { Link, Outlet, createRootRouteWithContext } from '@tanstack/react-router';
import type { WildlingsDb } from '../db/db';
import { SyncStatus } from '../components/SyncStatus';

export const Route = createRootRouteWithContext<{ db: WildlingsDb }>()({
  component: RootLayout,
});

const navStyles = {
  base: 'rounded-full px-3 py-2 text-sm font-semibold transition',
  active: 'bg-wild-moss text-white',
  inactive: 'text-wild-stone hover:text-wild-bark',
};

function RootLayout() {
  const { db } = Route.useRouteContext();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#ffffff_0%,#f7f5ee_45%,#efe9dd_100%)] text-wild-bark">
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6" data-testid="app-layout">
        <header className="flex w-full flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div
            className="flex items-center justify-center gap-3 sm:justify-center"
            data-testid="wildlings-header"
          >
            <img src="/favicon.svg" alt="Wildlings" className="h-10 w-10" />
            <div className="text-center sm:text-left">
              <p className="text-xs uppercase tracking-[0.4em] text-wild-stone">Wildlings</p>
              <h1 className="text-2xl font-semibold text-wild-bark">Outside time, counted.</h1>
            </div>
          </div>
          <div className="hidden flex-wrap items-center gap-3 sm:flex">
            <SyncStatus db={db} />
            <nav className="flex items-center gap-2 rounded-full bg-white/80 p-2 shadow-sm ring-1 ring-wild-sand/70">
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

        <main className="w-full pb-24 sm:pb-16">
          <Outlet />
        </main>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-10 border-t border-wild-sand/70 bg-white/80 backdrop-blur-md sm:hidden">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <SyncStatus db={db} />
          <nav className="flex items-center gap-2 rounded-full bg-wild-paper/80 p-1 shadow-sm ring-1 ring-wild-sand/70">
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
      </div>
    </div>
  );
}
