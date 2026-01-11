import React from 'react';
import type { WildlingsDb } from '../db/db';
import { useStats } from '../hooks/useStats';

type StatsSummaryProps = {
  db: WildlingsDb;
  year?: number;
};

export const StatsSummary = ({ db, year }: StatsSummaryProps) => {
  const { yearHours, yearlyGoalHours } = useStats(db, { year });
  const effectiveGoal = yearlyGoalHours && yearlyGoalHours > 0 ? yearlyGoalHours : 1000;

  const progressPercent = Math.min(100, (yearHours / effectiveGoal) * 100);

  return (
    <div className="flex w-full items-center gap-4 py-8">
      <div className="h-3 flex-1 bg-wild-sand rounded-full overflow-hidden border border-wild-sand">
        <div
          className="h-full bg-wild-moss transition-all duration-300 ease-out"
          style={{ width: `${progressPercent}%`, minWidth: yearHours > 0 ? '4px' : 0 }}
        />
      </div>
      <div className="font-serif text-sm font-medium text-wild-bark shrink-0 tabular-nums">
        {yearHours.toFixed(1)} / {effectiveGoal}
      </div>
    </div>
  );
};
