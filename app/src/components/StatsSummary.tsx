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

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="relative overflow-hidden rounded-3xl bg-white p-6 shadow-sm ring-1 ring-wild-sand">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-wild-stone">
              Current Year
            </p>
            <p className="mt-1 font-serif text-3xl text-wild-bark">
              {formatDurationHours(yearHours)}
            </p>
          </div>
          <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-wild-sand/30">
            <span className="text-xs font-bold text-wild-moss">{progressPercent}%</span>
            <svg
              className="absolute h-full w-full -rotate-90 text-wild-sand"
              viewBox="0 0 36 36"
              aria-hidden="true"
            >
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="text-wild-moss"
                strokeDasharray={`${progressPercent}, 100`}
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
              />
            </svg>
          </div>
        </div>
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-wild-paper">
          <div
            style={{ width: `${progressPercent}%` }}
            className="h-full rounded-full bg-wild-moss transition-all duration-1000"
          />
        </div>
        <p className="mt-2 text-xs text-wild-stone">
          {yearlyGoalHours ? `Goal: ${yearlyGoalHours}h` : 'No goal set'}
        </p>
      </div>

      <div className="flex flex-col justify-center rounded-3xl bg-[#E6E2D6] p-6 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wider text-wild-bark/60">Lifetime</p>
        <p className="mt-1 font-serif text-3xl text-wild-bark">
          {formatDurationHours(allTimeHours)}
        </p>
        <p className="mt-2 text-xs text-wild-bark/60">Total time outdoors</p>
      </div>
    </div>
  );
};
