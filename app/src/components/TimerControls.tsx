import React, { useEffect, useRef, useState } from 'react';
import dayjs from 'dayjs';
import type { WildlingsDb } from '../db/db';
import { useTimer } from '../hooks/useTimer';
import { formatLocalDateTime, fromLocalInput, toLocalInput } from '../lib/datetime';

type TimerControlsProps = {
  db: WildlingsDb;
  now?: () => string;
};

export const TimerControls = ({ db, now }: TimerControlsProps) => {
  const { isActive, activeStartAt, startTimer, stopTimer, updateActiveStartAt } = useTimer(db, {
    now,
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [adjustStartAt, setAdjustStartAt] = useState('');
  const [elapsed, setElapsed] = useState('00:00:00');
  const successTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (successTimeoutRef.current !== null) {
        window.clearTimeout(successTimeoutRef.current);
      }
    };
  }, []);

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
    setSuccess(null);
    try {
      await startTimer();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start timer');
    }
  };

  const handleStop = async () => {
    setError(null);
    setSuccess(null);
    try {
      await stopTimer();
      setSuccess('Timer stopped. Nice work.');
      if (successTimeoutRef.current !== null) {
        window.clearTimeout(successTimeoutRef.current);
      }
      successTimeoutRef.current = window.setTimeout(() => {
        setSuccess(null);
      }, 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop timer');
    }
  };

  const handleAdjustStart = async () => {
    setError(null);
    setSuccess(null);
    if (!adjustStartAt.trim()) {
      setError('Start time is required');
      return;
    }

    try {
      await updateActiveStartAt(fromLocalInput(adjustStartAt.trim()));
      setSuccess('Start time updated.');
      if (successTimeoutRef.current !== null) {
        window.clearTimeout(successTimeoutRef.current);
      }
      successTimeoutRef.current = window.setTimeout(() => {
        setSuccess(null);
      }, 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update start time');
    }
  };

  return (
    <section className="animate-fade-in rounded-3xl bg-wild-paper p-6 shadow-sm ring-1 ring-wild-sand">
      <header className="mb-4 space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-wild-stone">Timer</p>
        <h2 className="text-2xl font-semibold text-wild-bark">
          {isActive ? 'Timer running' : 'Ready for adventure?'}
        </h2>
        {isActive && activeStartAt ? (
          <p className="text-sm text-wild-stone">Started at {formatLocalDateTime(activeStartAt)}</p>
        ) : null}
      </header>

      <div className="rounded-3xl bg-white/80 p-6 text-center shadow-sm ring-1 ring-wild-sand/70">
        <p className="text-xs uppercase tracking-[0.25em] text-wild-stone">Elapsed</p>
        <p className="mt-2 font-serif text-5xl text-wild-moss">{elapsed}</p>
      </div>

      {error ? <p className="mt-4 text-sm text-wild-clay">{error}</p> : null}
      {success ? (
        <p className="mt-4 text-sm font-semibold text-wild-fern" aria-live="polite">
          {success}
        </p>
      ) : null}

      <div className="mt-6 space-y-4">
        {isActive ? (
          <div className="space-y-3 rounded-2xl bg-white/70 p-4">
            <label className="text-sm text-wild-bark">
              <span className="block text-xs uppercase tracking-wide text-wild-stone">
                Adjust start time
              </span>
              <input
                type="datetime-local"
                value={adjustStartAt}
                onChange={(event) => setAdjustStartAt(event.target.value)}
                className="mt-1 w-full rounded-xl border border-wild-sand bg-white px-3 py-2 text-sm"
              />
            </label>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className="rounded-full bg-wild-sand px-4 py-2 text-sm font-semibold text-wild-bark transition-transform active:scale-95"
                onClick={handleAdjustStart}
              >
                Update start time
              </button>
              <button
                type="button"
                className="rounded-full bg-wild-clay px-5 py-2 text-sm font-semibold text-white transition-transform active:scale-95"
                onClick={handleStop}
              >
                Stop timer
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="w-full rounded-full bg-wild-moss px-6 py-4 text-base font-semibold text-white transition-transform active:scale-95"
            onClick={handleStart}
          >
            Start timer
          </button>
        )}
      </div>
    </section>
  );
};
