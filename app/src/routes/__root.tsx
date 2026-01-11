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
        <header
          className="relative flex flex-col justify-center gap-4 py-6 sm:py-10"
          data-testid="wildlings-header"
        >
          <div className="text-center">
            <h1 className="font-serif text-3xl font-black tracking-tight text-wild-moss sm:text-4xl">
              Wildlings
            </h1>
            <p className="text-xs font-bold uppercase tracking-widest text-wild-stone/80">
              Outdoor Journal
            </p>
          </div>
          <div className="flex items-center justify-center gap-4">
            <nav className="hidden items-center gap-1 rounded-full bg-wild-sand/30 p-1 sm:flex">
              <Link
                to="/"
                className="rounded-full px-4 py-1.5 text-sm font-semibold transition-all hover:bg-white hover:shadow-sm [&.active]:bg-white [&.active]:text-wild-moss [&.active]:shadow-sm"
              >
                Home
              </Link>
              <Link
                to="/logs"
                className="rounded-full px-4 py-1.5 text-sm font-semibold text-wild-stone transition-all hover:bg-white hover:text-wild-bark hover:shadow-sm [&.active]:bg-white [&.active]:text-wild-moss [&.active]:shadow-sm"
              >
                Logs
              </Link>
              <Link
                to="/settings"
                className="rounded-full px-4 py-1.5 text-sm font-semibold text-wild-stone transition-all hover:bg-white hover:text-wild-bark hover:shadow-sm [&.active]:bg-white [&.active]:text-wild-moss [&.active]:shadow-sm"
              >
                Config
              </Link>
            </nav>
          </div>
          <div className="absolute right-4 top-6 sm:right-6 sm:top-10">
            <SyncStatus db={db} />
          </div>
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
