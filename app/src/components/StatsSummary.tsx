import React from 'react';
import type { WildlingsDb } from '../db/db';
import { formatDurationHours } from '../db/stats';
import { useStats } from '../hooks/useStats';

type StatsSummaryProps = {
  db: WildlingsDb;
  year?: number;
};

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

  const progressMessage = (() => {
    if (!yearlyGoalHours || yearlyGoalHours <= 0) {
      return 'Set a goal to map your year in the wild.';
    }
    if ((progressPercent ?? 0) <= 0) {
      return 'Every journey begins with a single step.';
    }
    if ((progressPercent ?? 0) < 50) {
      return 'Steady pacing builds lasting trails.';
    }
    if ((progressPercent ?? 0) < 100) {
      return 'You are deep in the wild now.';
    }
    return 'Goal met. Keep wandering.';
  })();

  return (
    <section className="animate-fade-in rounded-3xl bg-wild-paper p-6 shadow-sm ring-1 ring-wild-sand">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-[0.3em] text-wild-stone">Year {resolvedYear}</p>
        <h2 className="text-2xl font-semibold text-wild-bark">Your Outdoor Journal</h2>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-white/80 p-5 shadow-sm ring-1 ring-wild-sand/70">
          <p className="text-xs uppercase tracking-wide text-wild-stone">Year hours</p>
          <p className="mt-2 text-6xl font-serif text-wild-moss">
            {formatDurationHours(yearHours)}
          </p>
        </div>
        <div className="rounded-2xl bg-white/80 p-5 shadow-sm ring-1 ring-wild-sand/70">
          <p className="text-xs uppercase tracking-wide text-wild-stone">All time</p>
          <p className="mt-3 text-3xl font-semibold text-wild-bark">
            {formatDurationHours(allTimeHours)}
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <div className="flex items-center justify-between text-sm text-wild-stone">
          <span>{yearlyGoalHours ? `Goal ${yearlyGoalHours}h` : 'No goal set'}</span>
          <span>{progressPercent ?? 0}%</span>
        </div>
        <div className="h-4 overflow-hidden rounded-full bg-wild-sand">
          <div
            className="h-full rounded-full bg-[linear-gradient(135deg,#4A7A6A_25%,#5f8e7e_25%,#5f8e7e_50%,#4A7A6A_50%,#4A7A6A_75%,#5f8e7e_75%,#5f8e7e_100%)] bg-[length:16px_16px]"
            style={{ width: `${progressPercent ?? 0}%` }}
          />
        </div>
        <p className="text-sm text-wild-stone">{progressMessage}</p>
      </div>
    </section>
  );
};
