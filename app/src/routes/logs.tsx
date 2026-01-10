import React from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { LogsManager } from '../components/LogsManager';

export const Route = createFileRoute('/logs')({
  component: LogsRoute,
});

function LogsRoute() {
  const { db } = Route.useRouteContext();

  return (
    <div className="grid gap-6">
      <LogsManager db={db} />
    </div>
  );
}
