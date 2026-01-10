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
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2 rounded-full bg-wild-paper/80 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-wild-stone shadow-sm ring-1 ring-wild-sand/70">
        <span className={`h-2 w-2 rounded-full ${dotClass}`} aria-hidden="true" />
        <span>{label}</span>
      </div>
      {lastError ? (
        <button
          type="button"
          className="rounded-full bg-wild-clay px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-white shadow-sm transition-transform active:scale-95"
          onClick={() => void syncNow()}
        >
          Retry sync
        </button>
      ) : null}
    </div>
  );
};
