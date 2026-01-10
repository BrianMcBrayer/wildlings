import React from 'react';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/settings')({
  component: SettingsRoute,
});

function SettingsRoute() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="mb-4">
        <p className="text-sm uppercase tracking-wide text-slate-500">Settings</p>
        <h2 className="text-2xl font-semibold text-slate-900">Settings</h2>
      </header>
      <p className="text-sm text-slate-600">
        Goal configuration and device details will live here soon.
      </p>
    </section>
  );
}
