import React from 'react';
import { RouterProvider, createBrowserHistory } from '@tanstack/react-router';
import { createAppRouter } from './router';
import { createDb } from './db/db';

const db = createDb();
const router = createAppRouter(db, createBrowserHistory());

export const App = () => {
  return <RouterProvider router={router} />;
};
