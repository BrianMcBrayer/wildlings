import React, { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import type { WildlingsDb } from '../db/db';
import { useTimer } from '../hooks/useTimer';
import { fromLocalInput, toLocalInput } from '../lib/datetime';
import { Edit2 } from 'lucide-react';

type TimerControlsProps = {
  db: WildlingsDb;
  now?: () => string;
};

export const TimerControls = ({ db, now }: TimerControlsProps) => {
  const { isActive, activeStartAt, startTimer, stopTimer, updateActiveStartAt } = useTimer(db, {
    now,
  });
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [adjustStartAt, setAdjustStartAt] = useState('');
  const [elapsed, setElapsed] = useState('00:00:00.000');

  useEffect(() => {
    if (activeStartAt) {
      setAdjustStartAt(toLocalInput(activeStartAt));
    } else {
      setAdjustStartAt('');
    }
  }, [activeStartAt]);

  useEffect(() => {
    if (!isActive || !activeStartAt) {
      setElapsed('00:00:00.000');
      return;
    }

    const updateElapsed = () => {
      const nowValue = now ? now() : dayjs().toISOString();
      const diffMs = Math.max(0, dayjs(nowValue).diff(dayjs(activeStartAt)));
      const hours = Math.floor(diffMs / 3600000);
      const minutes = Math.floor((diffMs % 3600000) / 60000);
      const seconds = Math.floor((diffMs % 60000) / 1000);
      const milliseconds = diffMs % 1000;

      setElapsed(
        `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(
          seconds,
        ).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`,
      );
    };

    updateElapsed();
    const intervalId = window.setInterval(updateElapsed, 30);
    return () => window.clearInterval(intervalId);
  }, [activeStartAt, isActive, now]);

  const handleStart = async () => {
    setError(null);
    setIsEditing(false);
    try {
      await startTimer();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start timer');
    }
  };

  const handleStop = async () => {
    setError(null);
    setIsEditing(false);
    try {
      await stopTimer();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop timer');
    }
  };

  const handleAdjustStart = async () => {
    setError(null);
    if (!adjustStartAt.trim()) {
      setError('Start time is required');
      return;
    }

    try {
      await updateActiveStartAt(fromLocalInput(adjustStartAt.trim()));
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update start time');
    }
  };

  return (
    <section className="relative flex flex-col items-center justify-center py-8 text-center animate-fade-in">
      {/* Background decorations */}
      <div className="absolute left-1/2 top-1/2 -z-10 h-full w-full -translate-x-1/2 -translate-y-1/2 overflow-hidden opacity-40 mix-blend-multiply">
        <div className="absolute left-1/4 top-0 h-64 w-64 rounded-full bg-wild-sand/50 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-64 w-64 rounded-full bg-wild-fern/10 blur-3xl" />
      </div>

      {/* Action Button */}
      <div className="flex w-full justify-center px-4 mb-8">
        {!isActive ? (
          <button
            type="button"
            onClick={handleStart}
            className="group relative flex aspect-square w-full max-w-[min(85vw,50vh)] flex-col items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-wild-paper shadow-[0_15px_40px_rgba(16,185,129,0.4),0_8px_15px_rgba(0,0,0,0.1),inset_0_-6px_8px_rgba(0,0,0,0.2)] transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_25px_50px_rgba(16,185,129,0.5),0_12px_20px_rgba(0,0,0,0.15),inset_0_-6px_8px_rgba(0,0,0,0.2)] active:scale-95 active:shadow-[inset_0_6px_15px_rgba(0,0,0,0.3)]"
          >
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/30 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

            <div className="flex flex-col items-center justify-center text-center">
              <span className="text-[min(18vw,12vh)] font-black uppercase leading-[0.75] tracking-tighter">
                Start
              </span>
              <span className="mt-2 text-[min(6vw,4vh)] font-bold uppercase tracking-[0.2em] opacity-90">
                Adventure
              </span>
            </div>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleStop}
            className="group relative flex aspect-square w-full max-w-[min(85vw,50vh)] flex-col items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-red-600 text-white shadow-[0_15px_40px_rgba(239,68,68,0.4),0_8px_15px_rgba(0,0,0,0.1),inset_0_-6px_8px_rgba(0,0,0,0.2)] transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_25px_50px_rgba(239,68,68,0.5),0_12px_20px_rgba(0,0,0,0.15),inset_0_-6px_8px_rgba(0,0,0,0.2)] active:scale-95 active:shadow-[inset_0_6px_15px_rgba(0,0,0,0.3)]"
          >
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/30 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

            <div className="flex flex-col items-center justify-center text-center">
              <span className="text-[min(18vw,12vh)] font-black uppercase leading-[0.75] tracking-tighter">
                Finish
              </span>
              <span className="mt-2 text-[min(6vw,4vh)] font-bold uppercase tracking-[0.2em] opacity-90">
                Adventure
              </span>
            </div>
          </button>
        )}
      </div>

      {/* Main Timer Display */}
      <div className="relative mb-10">
        <div className="relative z-10 font-serif text-[4rem] font-medium leading-none tracking-tight text-wild-bark tabular-nums sm:text-[6rem]">
          {elapsed}
        </div>

        <div className="mt-2 flex items-center justify-center gap-2">
          <p className="font-medium text-wild-stone/80">
            {isActive ? 'Time in the wild' : 'Ready for your next adventure?'}
          </p>
          {isActive && (
            <button
              type="button"
              aria-label="Adjust start time"
              onClick={() => setIsEditing((prev) => !prev)}
              className="rounded-full p-2 text-wild-stone transition-colors hover:bg-wild-sand hover:text-wild-bark focus:outline-none focus:ring-2 focus:ring-wild-moss/50"
              title="Adjust start time"
            >
              <Edit2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {error ? (
        <div className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600 animate-slide-up">
          {error}
        </div>
      ) : null}

      {/* Editing Start Time Modal/Popover */}
      {isActive && isEditing ? (
        <div className="relative mt-8 w-full max-w-sm overflow-hidden rounded-2xl bg-white p-6 shadow-xl ring-1 ring-wild-sand animate-slide-up">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-wild-stone">
            Edit Start Time
          </h3>
          <div className="flex flex-col gap-3">
            <label htmlFor="adjust-start-at" className="sr-only">
              Started at
            </label>
            <input
              id="adjust-start-at"
              type="datetime-local"
              value={adjustStartAt}
              onChange={(event) => setAdjustStartAt(event.target.value)}
              className="w-full rounded-xl border-none bg-wild-paper px-4 py-3 text-wild-bark ring-1 ring-wild-sand focus:ring-2 focus:ring-wild-moss"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="flex-1 rounded-xl bg-wild-paper py-3 text-sm font-bold text-wild-stone hover:bg-wild-sand"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAdjustStart}
                className="flex-1 rounded-xl bg-wild-moss py-3 text-sm font-bold text-wild-paper hover:bg-wild-moss/90"
              >
                Update
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
};
