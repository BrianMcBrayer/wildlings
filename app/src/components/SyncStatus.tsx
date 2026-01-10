import React from 'react';
import type { WildlingsDb } from '../db/db';
import { useSync } from '../hooks/useSync';

type SyncStatusProps = {
  db: WildlingsDb;
};

export const SyncStatus = ({ db }: SyncStatusProps) => {
  const { isSyncing, lastError, syncNow } = useSync(db);

  let label = 'All synced';
  let dotClass = 'bg-emerald-500';
  if (lastError) {
    label = 'Sync issue';
    dotClass = 'bg-rose-500';
  } else if (isSyncing) {
    label = 'Syncing';
    dotClass = 'bg-amber-500 animate-pulse';
  }

  return (
    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-500">
      <span className={`h-2 w-2 rounded-full ${dotClass}`} aria-hidden="true" />
      <span>{label}</span>
      {lastError ? (
        <button
          type="button"
          className="rounded-full bg-white/80 px-2 py-1 text-[0.7rem] font-semibold text-rose-600 shadow-sm"
          onClick={() => void syncNow()}
        >
          Retry sync
        </button>
      ) : null}
    </div>
  );
};
