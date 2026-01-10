import React from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { TimerControls } from '../components/TimerControls';
import { StatsSummary } from '../components/StatsSummary';

export const Route = createFileRoute('/')({
  component: HomeRoute,
});

function HomeRoute() {
  const { db } = Route.useRouteContext();

  return (
    <div className="grid gap-8 lg:grid-cols-2 items-start">
      <TimerControls db={db} />
      <StatsSummary db={db} />
    </div>
  );
}
