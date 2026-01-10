import React, { useState } from 'react';
import type { WildlingsDb } from '../db/db';
import { useLogs } from '../hooks/useLogs';
import { clearEditingLogId, setEditingLogId } from '../db/db';
import { formatLocalDateTime, fromLocalInput, toLocalInput } from '../lib/datetime';

type LogsManagerProps = {
  db: WildlingsDb;
  now?: () => string;
};

export const LogsManager = ({ db, now }: LogsManagerProps) => {
  const { logs, activeLogId, createManualLog, updateLog, deleteLog } = useLogs(db, { now });
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [note, setNote] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStartAt, setEditStartAt] = useState('');
  const [editEndAt, setEditEndAt] = useState('');
  const [editNote, setEditNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (editingId) {
      void setEditingLogId(db, editingId);
    } else {
      void clearEditingLogId(db);
    }

    return () => {
      if (editingId) {
        void clearEditingLogId(db);
      }
    };
  }, [db, editingId]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!startAt.trim() || !endAt.trim()) {
      setError('Start and end times are required');
      return;
    }

    try {
      await createManualLog({
        startAt: fromLocalInput(startAt.trim()),
        endAt: fromLocalInput(endAt.trim()),
        note: note.trim() ? note.trim() : null,
      });
      setStartAt('');
      setEndAt('');
      setNote('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save log');
    }
  };

  const handleDelete = async (logId: string) => {
    setError(null);
    try {
      await deleteLog(logId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete log');
    }
  };

  const beginEdit = (log: (typeof logs)[number]) => {
    setEditingId(log.id);
    setEditStartAt(toLocalInput(log.start_at));
    setEditEndAt(log.end_at ? toLocalInput(log.end_at) : '');
    setEditNote(log.note ?? '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditStartAt('');
    setEditEndAt('');
    setEditNote('');
  };

  const saveEdit = async () => {
    if (!editingId) {
      return;
    }

    setError(null);
    if (!editStartAt.trim() || !editEndAt.trim()) {
      setError('Start and end times are required');
      return;
    }

    try {
      await updateLog({
        logId: editingId,
        startAt: fromLocalInput(editStartAt.trim()),
        endAt: fromLocalInput(editEndAt.trim()),
        note: editNote.trim() ? editNote.trim() : null,
      });
      cancelEdit();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update log');
    }
  };

  return (
    <section className="rounded-2xl bg-[#f6f1e6] p-6 shadow-sm">
      <header className="mb-4">
        <p className="text-sm uppercase tracking-wide text-slate-500">Logs</p>
        <h2 className="text-2xl font-semibold text-slate-900">Outdoor entries</h2>
      </header>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm text-slate-700">
            <span className="block text-xs uppercase tracking-wide text-slate-500">Start time</span>
            <input
              type="datetime-local"
              value={startAt}
              onChange={(event) => setStartAt(event.target.value)}
              placeholder="2026-01-01T09:00"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm text-slate-700">
            <span className="block text-xs uppercase tracking-wide text-slate-500">End time</span>
            <input
              type="datetime-local"
              value={endAt}
              onChange={(event) => setEndAt(event.target.value)}
              placeholder="2026-01-01T10:00"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
        </div>

        <label className="text-sm text-slate-700">
          <span className="block text-xs uppercase tracking-wide text-slate-500">Note</span>
          <input
            type="text"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Trail walk"
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>

        {error ? <p className="text-sm text-rose-600">{error}</p> : null}

        <button
          type="submit"
          className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
        >
          Add log
        </button>
      </form>

      <div className="mt-6 space-y-3">
        {logs.length === 0 ? (
          <p className="text-sm text-slate-500">No logs yet</p>
        ) : (
          logs.map((log) => (
            <article key={log.id} className="rounded-xl bg-[#fbf7ef] p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm text-slate-700">
                    {formatLocalDateTime(log.start_at)} →{' '}
                    {log.end_at ? formatLocalDateTime(log.end_at) : 'Running'}
                  </p>
                  {log.note ? <p className="text-sm text-slate-500">{log.note}</p> : null}
                  {log.id === activeLogId ? (
                    <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-amber-600">
                      Active timer
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="text-sm font-semibold text-slate-600"
                    onClick={() => beginEdit(log)}
                    disabled={log.id === activeLogId}
                  >
                    Edit log
                  </button>
                  <button
                    type="button"
                    className="text-sm font-semibold text-rose-600"
                    onClick={() => handleDelete(log.id)}
                    disabled={log.id === activeLogId}
                  >
                    Delete log
                  </button>
                </div>
              </div>
              {editingId === log.id ? (
                <div className="mt-4 space-y-3 border-t border-slate-200 pt-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="text-sm text-slate-700">
                      <span className="block text-xs uppercase tracking-wide text-slate-500">
                        Edit start time
                      </span>
                      <input
                        type="datetime-local"
                        value={editStartAt}
                        onChange={(event) => setEditStartAt(event.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="text-sm text-slate-700">
                      <span className="block text-xs uppercase tracking-wide text-slate-500">
                        Edit end time
                      </span>
                      <input
                        type="datetime-local"
                        value={editEndAt}
                        onChange={(event) => setEditEndAt(event.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                    </label>
                  </div>
                  <label className="text-sm text-slate-700">
                    <span className="block text-xs uppercase tracking-wide text-slate-500">
                      Edit note
                    </span>
                    <input
                      type="text"
                      value={editNote}
                      onChange={(event) => setEditNote(event.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      className="rounded-full bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
                      onClick={cancelEdit}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
                      onClick={saveEdit}
                    >
                      Save changes
                    </button>
                  </div>
                </div>
              ) : null}
            </article>
          ))
        )}
      </div>
    </section>
  );
};
