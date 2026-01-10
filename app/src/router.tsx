import { createRouter } from '@tanstack/react-router';
import type { RouterHistory } from '@tanstack/react-router';
import type { WildlingsDb } from './db/db';
import { routeTree } from './routeTree.gen';

export const createAppRouter = (db: WildlingsDb, history?: RouterHistory) => {
  return createRouter({
    routeTree,
    context: { db },
    history,
  });
};

export type AppRouter = ReturnType<typeof createAppRouter>;

declare module '@tanstack/react-router' {
  interface Register {
    router: AppRouter;
  }
}
