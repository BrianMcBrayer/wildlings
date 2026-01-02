import React from 'react';
import type { WildlingsDb } from '../db/db';
import { useStats } from '../hooks/useStats';

type StatsSummaryProps = {
  db: WildlingsDb;
  year?: number;
};

const formatHours = (value: number) => value.toFixed(1);

export const StatsSummary = ({ db, year }: StatsSummaryProps) => {
  const {
    year: resolvedYear,
    yearHours,
    allTimeHours,
    yearlyGoalHours,
  } = useStats(db, {
    year,
  });

  const progressPercent =
    yearlyGoalHours && yearlyGoalHours > 0
      ? Math.min(100, Math.round((yearHours / yearlyGoalHours) * 100))
      : null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="mb-4">
        <p className="text-sm uppercase tracking-wide text-slate-500">Year {resolvedYear}</p>
        <h2 className="text-2xl font-semibold text-slate-900">Outdoor time</h2>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Year hours</p>
          <p className="text-2xl font-semibold text-slate-900">{formatHours(yearHours)}h</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">All time</p>
          <p className="text-2xl font-semibold text-slate-900">{formatHours(allTimeHours)}h</p>
        </div>
      </div>

      <div className="mt-6">
        {yearlyGoalHours ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm text-slate-600">
              <span>Goal {yearlyGoalHours}h</span>
              <span>{progressPercent ?? 0}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-emerald-500"
                style={{ width: `${progressPercent ?? 0}%` }}
              />
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500">No yearly goal set</p>
        )}
      </div>
    </section>
  );
};
