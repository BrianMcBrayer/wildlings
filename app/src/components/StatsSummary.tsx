import React from 'react';
import type { WildlingsDb } from '../db/db';
import { formatDurationHours } from '../db/stats';
import { useStats } from '../hooks/useStats';

type StatsSummaryProps = {
  db: WildlingsDb;
  year?: number;
};

export const StatsSummary = ({ db, year }: StatsSummaryProps) => {
  const { yearHours, allTimeHours, yearlyGoalHours } = useStats(db, { year });

  const progressPercent =
    yearlyGoalHours && yearlyGoalHours > 0
      ? Math.min(100, Math.round((yearHours / yearlyGoalHours) * 100))
      : 0;
  const yearHoursLabel = formatDurationHours(yearHours);
  const allTimeHoursLabel = formatDurationHours(allTimeHours);

  return (
    <div className="grid gap-4 sm:grid-cols-[1.4fr_0.6fr]">
      <div className="relative overflow-hidden rounded-3xl bg-white p-6 shadow-sm ring-1 ring-wild-sand">
        <div className="flex flex-wrap items-center gap-6">
          <div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-wild-sand/30">
            <span className="font-serif text-2xl text-wild-moss">{progressPercent}%</span>
            <svg
              className="absolute h-full w-full -rotate-90 text-wild-sand"
              viewBox="0 0 36 36"
              aria-hidden="true"
            >
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
              />
              <path
                className="text-wild-moss"
                strokeDasharray={`${progressPercent}, 100`}
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
              />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm text-wild-stone">
              {`You've spent ${yearHoursLabel} outside this year.`}
            </p>
            <p className="mt-3 font-serif text-4xl text-wild-bark">{yearHoursLabel}</p>
            <p className="mt-2 text-xs uppercase tracking-[0.3em] text-wild-stone">
              Current year total
            </p>
          </div>
        </div>
        <p className="mt-4 text-xs text-wild-stone">
          {yearlyGoalHours ? `Goal: ${yearlyGoalHours}h` : 'No goal set'}
        </p>
      </div>

      <div className="flex flex-col justify-center rounded-3xl bg-wild-sand/70 p-6 shadow-sm ring-1 ring-wild-sand/70">
        <p className="text-xs font-bold uppercase tracking-wider text-wild-bark/60">Lifetime</p>
        <p className="mt-2 font-serif text-3xl text-wild-bark">{allTimeHoursLabel}</p>
        <p className="mt-2 text-xs text-wild-bark/60">Total time outdoors</p>
      </div>
    </div>
  );
};
