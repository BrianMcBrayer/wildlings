import React, { useEffect, useRef, useState } from 'react';
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
    <section className="rounded-2xl bg-[#f6f1e6] p-6 shadow-sm">
      <header className="mb-4">
        <p className="text-sm uppercase tracking-wide text-slate-500">Timer</p>
        <h2 className="text-2xl font-semibold text-slate-900">
          {isActive ? 'Timer running' : 'Timer idle'}
        </h2>
        {isActive && activeStartAt ? (
          <p className="mt-2 text-sm text-slate-600">
            Started at {formatLocalDateTime(activeStartAt)}
          </p>
        ) : null}
      </header>

      {error ? <p className="mb-3 text-sm text-rose-600">{error}</p> : null}
      {success ? (
        <p className="mb-3 text-sm font-semibold text-emerald-600" aria-live="polite">
          {success}
        </p>
      ) : null}

      <div className="space-y-4">
        {isActive ? (
          <div className="space-y-3 rounded-xl bg-white/70 p-3">
            <label className="text-sm text-slate-700">
              <span className="block text-xs uppercase tracking-wide text-slate-500">
                Adjust start time
              </span>
              <input
                type="datetime-local"
                value={adjustStartAt}
                onChange={(event) => setAdjustStartAt(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className="rounded-full bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
                onClick={handleAdjustStart}
              >
                Update start time
              </button>
              <button
                type="button"
                className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white"
                onClick={handleStop}
              >
                Stop timer
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
            onClick={handleStart}
          >
            Start timer
          </button>
        )}
      </div>
    </section>
  );
};
