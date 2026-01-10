import React, { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import type { WildlingsDb } from '../db/db';
import { useLogs } from '../hooks/useLogs';
import { clearEditingLogId, setEditingLogId } from '../db/db';
import { formatLocalDateTime, fromLocalInput, toLocalInput } from '../lib/datetime';
import { Pencil, Trash2 } from 'lucide-react';

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
  const [isFormOpen, setIsFormOpen] = useState(false);

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

  const groupedLogs = useMemo(() => {
    const today = dayjs().startOf('day');
    const yesterday = today.subtract(1, 'day');

    return logs.reduce<
      {
        key: string;
        label: string;
        entries: typeof logs;
      }[]
    >((groups, log) => {
      const logDate = dayjs(log.start_at);
      const key = logDate.format('YYYY-MM-DD');
      const existing = groups.find((group) => group.key === key);
      const label = logDate.isSame(today, 'day')
        ? 'Today'
        : logDate.isSame(yesterday, 'day')
          ? 'Yesterday'
          : logDate.year() === today.year()
            ? logDate.format('MMMM D')
            : logDate.format('MMMM D, YYYY');

      if (existing) {
        existing.entries.push(log);
      } else {
        groups.push({ key, label, entries: [log] });
      }
      return groups;
    }, []);
  }, [logs]);

  const getBorderClass = (log: (typeof logs)[number]) => {
    if (log.id === activeLogId) {
      return 'border-wild-clay';
    }

    if (!log.end_at) {
      return 'border-wild-fern';
    }

    const durationHours = Math.max(0, dayjs(log.end_at).diff(dayjs(log.start_at), 'minute') / 60);
    return durationHours >= 1 ? 'border-wild-moss' : 'border-wild-sand';
  };

  return (
    <section className="animate-fade-in rounded-3xl bg-wild-paper p-6 shadow-sm ring-1 ring-wild-sand">
      <header className="mb-4">
        <p className="text-xs uppercase tracking-[0.3em] text-wild-stone">Logs</p>
        <h2 className="text-2xl font-semibold text-wild-bark">Field notes</h2>
      </header>

      <div className="rounded-2xl bg-white/80 p-4 shadow-sm ring-1 ring-wild-sand/70">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-wild-bark">Manual entry</p>
            <p className="text-xs text-wild-stone">Log a memory from the trail.</p>
          </div>
          <button
            type="button"
            className="rounded-full bg-wild-moss px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white transition-transform active:scale-95"
            onClick={() => setIsFormOpen((open) => !open)}
          >
            {isFormOpen ? 'Close' : 'Add past log'}
          </button>
        </div>

        {isFormOpen ? (
          <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm text-wild-bark">
                <span className="block text-xs uppercase tracking-wide text-wild-stone">
                  Start time
                </span>
                <input
                  type="datetime-local"
                  value={startAt}
                  onChange={(event) => setStartAt(event.target.value)}
                  placeholder="2026-01-01T09:00"
                  className="mt-1 w-full rounded-xl border border-wild-sand bg-white px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm text-wild-bark">
                <span className="block text-xs uppercase tracking-wide text-wild-stone">
                  End time
                </span>
                <input
                  type="datetime-local"
                  value={endAt}
                  onChange={(event) => setEndAt(event.target.value)}
                  placeholder="2026-01-01T10:00"
                  className="mt-1 w-full rounded-xl border border-wild-sand bg-white px-3 py-2 text-sm"
                />
              </label>
            </div>

            <label className="text-sm text-wild-bark">
              <span className="block text-xs uppercase tracking-wide text-wild-stone">Note</span>
              <input
                type="text"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Trail walk"
                className="mt-1 w-full rounded-xl border border-wild-sand bg-white px-3 py-2 text-sm"
              />
            </label>

            {error ? <p className="text-sm text-wild-clay">{error}</p> : null}

            <button
              type="submit"
              className="w-full rounded-full bg-wild-moss px-4 py-3 text-sm font-semibold text-white transition-transform active:scale-95"
            >
              Add log
            </button>
          </form>
        ) : null}
      </div>

      <div className="mt-6 space-y-6">
        {logs.length === 0 ? (
          <p className="text-sm text-wild-stone">No logs yet</p>
        ) : (
          groupedLogs.map((group) => (
            <div key={group.key} className="space-y-3">
              <p className="text-xs uppercase tracking-[0.3em] text-wild-stone">{group.label}</p>
              {group.entries.map((log) => (
                <article
                  key={log.id}
                  className={`animate-slide-up rounded-xl border-l-4 bg-white p-4 shadow-sm ${getBorderClass(
                    log,
                  )}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-wild-bark">
                        {formatLocalDateTime(log.start_at)} →{' '}
                        {log.end_at ? formatLocalDateTime(log.end_at) : 'Running'}
                      </p>
                      {log.note ? (
                        <p className="text-sm font-serif italic text-wild-stone/80">{log.note}</p>
                      ) : null}
                      {log.id === activeLogId ? (
                        <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-wild-clay">
                          Active timer
                        </p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        className="rounded-full p-2 text-wild-stone transition-colors hover:bg-wild-sand/40"
                        onClick={() => beginEdit(log)}
                        disabled={log.id === activeLogId}
                        aria-label="Edit log"
                        title="Edit log"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="rounded-full p-2 text-wild-clay transition-colors hover:bg-wild-clay/10"
                        onClick={() => handleDelete(log.id)}
                        disabled={log.id === activeLogId}
                        aria-label="Delete log"
                        title="Delete log"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  {editingId === log.id ? (
                    <div className="mt-4 space-y-3 border-t border-wild-sand pt-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="text-sm text-wild-bark">
                          <span className="block text-xs uppercase tracking-wide text-wild-stone">
                            Edit start time
                          </span>
                          <input
                            type="datetime-local"
                            value={editStartAt}
                            onChange={(event) => setEditStartAt(event.target.value)}
                            className="mt-1 w-full rounded-xl border border-wild-sand bg-white px-3 py-2 text-sm"
                          />
                        </label>
                        <label className="text-sm text-wild-bark">
                          <span className="block text-xs uppercase tracking-wide text-wild-stone">
                            Edit end time
                          </span>
                          <input
                            type="datetime-local"
                            value={editEndAt}
                            onChange={(event) => setEditEndAt(event.target.value)}
                            className="mt-1 w-full rounded-xl border border-wild-sand bg-white px-3 py-2 text-sm"
                          />
                        </label>
                      </div>
                      <label className="text-sm text-wild-bark">
                        <span className="block text-xs uppercase tracking-wide text-wild-stone">
                          Edit note
                        </span>
                        <input
                          type="text"
                          value={editNote}
                          onChange={(event) => setEditNote(event.target.value)}
                          className="mt-1 w-full rounded-xl border border-wild-sand bg-white px-3 py-2 text-sm"
                        />
                      </label>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          className="rounded-full bg-wild-sand px-4 py-2 text-sm font-semibold text-wild-bark transition-transform active:scale-95"
                          onClick={cancelEdit}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="rounded-full bg-wild-moss px-4 py-2 text-sm font-semibold text-white transition-transform active:scale-95"
                          onClick={saveEdit}
                        >
                          Save changes
                        </button>
                      </div>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          ))
        )}
      </div>
    </section>
  );
};
