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
      <div
        className="flex-1"
        data-testid="progress-track"
        style={{
          backgroundColor: 'black',
          borderColor: 'black',
          borderRadius: '9999px',
          borderStyle: 'solid',
          borderWidth: '1px',
          height: '8px',
          overflow: 'hidden',
        }}
      >
        <div
          className="transition-all duration-300 ease-out"
          data-testid="progress-fill"
          style={{
            width: `${progressPercent}%`,
            minWidth: yearHours > 0 ? '4px' : 0,
            backgroundColor: 'green',
            height: '100%',
          }}
        />
      </div>
      <div className="font-serif text-sm font-medium text-wild-bark shrink-0 tabular-nums">
        {yearHours.toFixed(1)} / {effectiveGoal}
      </div>
    </div>
  );
};
