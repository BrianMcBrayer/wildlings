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
    <div className="flex flex-col gap-6">
      <div className="relative overflow-hidden rounded-[2rem] bg-white p-8 shadow-xl shadow-wild-sand/20 ring-1 ring-wild-sand transition-all hover:shadow-2xl hover:shadow-wild-sand/40">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="relative mb-6 flex h-48 w-48 items-center justify-center">
            {/* Background Circle */}
            <svg className="absolute h-full w-full -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="#E6E2D6"
                strokeWidth="8"
                strokeLinecap="round"
              />
              {/* Progress Circle */}
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke={yearHours > 0 ? '#2B4B3F' : 'transparent'}
                strokeWidth="8"
                strokeDasharray={`${progressPercent * 2.83}, 283`}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
            </svg>

            <div className="flex flex-col items-center">
              <span className="font-serif text-5xl font-bold text-wild-moss">
                {progressPercent}%
              </span>
              <span className="text-xs font-bold uppercase tracking-widest text-wild-stone/60">
                Of Goal
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <h3 className="font-serif text-3xl font-medium text-wild-bark">{yearHoursLabel}</h3>
            <p className="text-sm font-medium text-wild-stone">Time spent outside this year</p>
          </div>

          <div className="mt-6 flex items-center justify-center gap-2 rounded-full bg-wild-paper px-4 py-2">
            <div className="h-1.5 w-1.5 rounded-full bg-wild-clay" />
            <p className="text-xs font-bold uppercase tracking-widest text-wild-stone">
              {yearlyGoalHours ? `Goal: ${yearlyGoalHours}h` : 'No goal set'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
