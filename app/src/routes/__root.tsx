import React from 'react';
import { Link, Outlet, createRootRouteWithContext } from '@tanstack/react-router';
import { Home, NotebookPen, Settings } from 'lucide-react';
import type { WildlingsDb } from '../db/db';
import { SyncStatus } from '../components/SyncStatus';

export const Route = createRootRouteWithContext<{ db: WildlingsDb }>()({
  component: RootLayout,
});

function RootLayout() {
  const { db } = Route.useRouteContext();
  const navItemClass =
    'flex flex-col items-center justify-center gap-1 p-2 text-xs font-medium transition-colors';
  const navItemInactive = 'text-wild-stone hover:text-wild-bark';
  const navItemActive = 'text-wild-moss';

  return (
    <div className="min-h-screen bg-wild-paper pb-24 text-wild-bark sm:pb-0">
      <div className="mx-auto w-full max-w-2xl px-4 sm:px-6" data-testid="app-layout">
        <header className="flex items-center justify-between py-8" data-testid="wildlings-header">
          <div className="flex items-center gap-3">
            <img src="/favicon.svg" alt="Wildlings" className="h-12 w-12 rounded-xl shadow-sm" />
            <div>
              <h1 className="font-serif text-2xl font-bold text-wild-moss">Wildlings</h1>
              <p className="text-xs uppercase tracking-wider text-wild-stone">Outdoor Journal</p>
            </div>
          </div>
          <SyncStatus db={db} />
        </header>

        <main className="animate-fade-in space-y-6">
          <Outlet />
        </main>
      </div>

      <div className="fixed bottom-4 left-0 right-0 z-50 px-4 sm:hidden">
        <nav className="mx-auto flex max-w-sm items-center justify-around rounded-2xl border border-wild-sand/70 bg-white/80 px-4 py-3 shadow-lg backdrop-blur-md">
          <Link
            to="/"
            className={`${navItemClass} ${navItemInactive}`}
            activeOptions={{ exact: true }}
            activeProps={{ className: `${navItemClass} ${navItemActive}` }}
          >
            <Home className="h-6 w-6" />
            <span>Home</span>
          </Link>
          <Link
            to="/logs"
            className={`${navItemClass} ${navItemInactive}`}
            activeProps={{ className: `${navItemClass} ${navItemActive}` }}
          >
            <NotebookPen className="h-6 w-6" />
            <span>Logs</span>
          </Link>
          <Link
            to="/settings"
            className={`${navItemClass} ${navItemInactive}`}
            activeProps={{ className: `${navItemClass} ${navItemActive}` }}
          >
            <Settings className="h-6 w-6" />
            <span>Config</span>
          </Link>
        </nav>
      </div>
    </div>
  );
}
