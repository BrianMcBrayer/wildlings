import React, { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import type { WildlingsDb } from '../db/db';
import { useTimer } from '../hooks/useTimer';
import { fromLocalInput, toLocalInput } from '../lib/datetime';
import { Edit2, Play, Square } from 'lucide-react';

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
  const [elapsed, setElapsed] = useState('00:00:00');

  useEffect(() => {
    if (activeStartAt) {
      setAdjustStartAt(toLocalInput(activeStartAt));
    } else {
      setAdjustStartAt('');
    }
  }, [activeStartAt]);

  useEffect(() => {
    if (!isActive || !activeStartAt) {
      setElapsed('00:00:00');
      return;
    }

    const updateElapsed = () => {
      const nowValue = now ? now() : dayjs().toISOString();
      const diffSeconds = Math.max(
        0,
        Math.floor(dayjs(nowValue).diff(dayjs(activeStartAt)) / 1000),
      );
      const hours = Math.floor(diffSeconds / 3600);
      const minutes = Math.floor((diffSeconds % 3600) / 60);
      const seconds = diffSeconds % 60;
      setElapsed(
        `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(
          seconds,
        ).padStart(2, '0')}`,
      );
    };

    updateElapsed();
    const intervalId = window.setInterval(updateElapsed, 1000);
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
    <section
      className={`animate-fade-in relative overflow-hidden rounded-[2rem] p-8 shadow-xl transition-all duration-500 ${
        isActive
          ? 'bg-wild-moss text-wild-paper ring-4 ring-wild-fern/30'
          : 'bg-white text-wild-bark ring-1 ring-wild-sand'
      }`}
    >
      {isActive ? (
        <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-wild-fern/20 blur-3xl animate-pulse-slow" />
      ) : null}

      <header className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isActive ? <div className="h-2 w-2 rounded-full bg-red-400 animate-ping" /> : null}
          <p
            className={`text-xs font-bold uppercase tracking-[0.2em] ${
              isActive ? 'text-wild-sand/60' : 'text-wild-stone'
            }`}
          >
            {isActive ? 'Currently Active' : 'Timer'}
          </p>
        </div>
      </header>

      <div className="relative z-10 mt-8 flex flex-col items-center justify-center text-center">
        <div className="font-serif text-[4rem] font-light leading-none tracking-tight tabular-nums">
          {elapsed}
        </div>
        <p className={`mt-2 text-sm ${isActive ? 'text-wild-sand/80' : 'text-wild-stone'}`}>
          {isActive ? 'Time in the wild' : 'Ready for adventure?'}
        </p>
      </div>

      <div className="relative z-10 mt-10">
        {!isActive ? (
          <button
            type="button"
            onClick={handleStart}
            className="group relative flex w-full items-center justify-center gap-3 rounded-2xl bg-wild-moss py-5 text-lg font-semibold text-white shadow-lg shadow-wild-moss/30 transition-all hover:scale-[1.02] active:scale-95"
          >
            <Play className="h-6 w-6 fill-current" />
            <span>Start Adventure</span>
          </button>
        ) : (
          <div className="grid grid-cols-[1fr_auto] gap-3">
            <button
              type="button"
              onClick={handleStop}
              className="flex items-center justify-center gap-2 rounded-2xl bg-wild-clay py-4 font-semibold text-white shadow-lg shadow-wild-clay/30 transition-all active:scale-95"
            >
              <Square className="h-5 w-5 fill-current" />
              <span>Finish</span>
            </button>
            <button
              type="button"
              aria-label="Adjust start time"
              onClick={() => setIsEditing((prev) => !prev)}
              className="flex h-full w-14 items-center justify-center rounded-2xl bg-wild-fern/20 text-wild-sand transition-colors hover:bg-wild-fern/40"
            >
              <Edit2 className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>

      {error ? (
        <p className="relative z-10 mt-4 text-sm text-wild-clay" role="alert">
          {error}
        </p>
      ) : null}

      {isActive && isEditing ? (
        <div className="relative z-10 mt-6 rounded-xl bg-black/20 p-4 backdrop-blur-sm animate-slide-up">
          <label
            htmlFor="adjust-start-at"
            className="text-xs uppercase tracking-wide text-wild-sand/60"
          >
            Started at
          </label>
          <div className="mt-2 flex gap-2">
            <input
              id="adjust-start-at"
              type="datetime-local"
              value={adjustStartAt}
              onChange={(event) => setAdjustStartAt(event.target.value)}
              className="w-full rounded-lg border border-transparent bg-wild-paper/10 px-3 py-2 text-sm text-wild-paper focus:ring-1 focus:ring-wild-sand"
            />
            <button
              type="button"
              onClick={handleAdjustStart}
              className="rounded-lg bg-wild-paper px-4 text-xs font-bold text-wild-moss"
            >
              Save
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
};
