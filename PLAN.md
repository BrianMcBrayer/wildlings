# Wildlings Implementation Plan

This plan is organized into vertical slices so new contexts can resume cleanly. Each slice should be completed with TDD (tests first) and recorded in `ARCHITECT.md`.

---

## Slice 0: CI/CD foundation

- Initialize GitHub Actions for tests on push to `master`.
- Build Docker image on push to `master` and publish to GHCR.
- On release, publish `latest` and semver tags (e.g., `v0.0.0`) to GHCR.
- Record CI/CD decisions and secrets in `ARCHITECT.md`.
- Add a root `Dockerfile` early (needed for CI image build).

## Slice 1: Local data foundation

- Define Dexie schema (`logs`, `sync_queue`, `metadata`) and repositories.
- Add metadata helpers for `device_id`, active timer state, and yearly goal fields.
- Write unit tests for CRUD, outbox enqueue, and active timer persistence.

## Slice 2: Timer experience

- Implement `useTimer` hook wired to Dexie.
- Build Start/Stop UI with persisted active state.
- Tests: start/stop creates/updates logs, writes metadata, enqueues ops.

## Slice 3: Logs management

- Manual log create/edit/delete UI.
- Enforce "no edit while active" and manual entry rules.
- Tests: edit/update behavior and tombstone deletes.

## Slice 4: Stats + progress

- Compute totals (yearly + all-time) from Dexie.
- Progress bar toward configurable yearly goal.
- Tests: totals, timezone boundary handling, deleted log exclusion.

## Slice 5: Sync engine

- Implement outbox push + pull merge with LWW.
- Add retry/backoff state to metadata.
- Contract tests for `/sync/push` and `/sync/pull`.

## Slice 6: Backend sync API

- FastAPI models/routes for push/pull and idempotency.
- Migrations for logs and op dedupe table.
- Tests: idempotent push, pull cursor, tombstone handling.

## Slice 7: PWA + offline shell

- Add `vite-plugin-pwa` with manifest and navigation fallback.
- Ensure offline reload serves cached shell.
- Tests or manual verification steps documented.

---

## Notes

- Keep `ARCHITECT.md` updated at the end of each slice with decisions, pitfalls, and next-slice setup.
