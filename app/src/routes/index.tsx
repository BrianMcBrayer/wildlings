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
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <TimerControls db={db} />
      <StatsSummary db={db} />
    </div>
  );
}
