# Wildlings Architecture Journal

Use this file to capture decisions, assumptions, and context needed across slices or future sessions. Keep entries concise and dated.

---

## 2026-01-01

- Initialized architecture journal. No implementation decisions recorded yet.
- CI/CD: GitHub Actions runs tests on push to `master` and builds/pushes Docker images to GHCR. Releases publish `vX.Y.Z` + `latest` tags.
- Docker build steps are gated on a `Dockerfile` existing at repo root.

## 2026-01-02

- Added a placeholder root `Dockerfile` so CI image builds can succeed before app/api slices land.
- CI workflow (`.github/workflows/ci.yml`) runs frontend/backend tests only if `app/package.json` or `api/pyproject.toml` exist.
- Docker workflow (`.github/workflows/docker.yml`) pushes `sha-<short>` tags on `master` and `vX.Y.Z` + `latest` on releases; uses `GITHUB_TOKEN` with `packages: write`.

## 2026-01-02

- Bootstrapped minimal frontend test tooling in `app/` (TypeScript + Vitest + fake-indexeddb) to enable TDD before UI work.
- Implemented Dexie schema in `app/src/db/db.ts` with `logs`, `sync_queue`, and a singleton `metadata` row keyed by `id=singleton`.
- Local mutations for logs are wrapped in Dexie transactions and always enqueue outbox ops with `device_id` sourced from metadata.

## 2026-01-03

- Added `useTimer` hook plus `startTimerWithOutbox`/`stopTimerWithOutbox` helpers with TDD coverage for start/stop behavior.
- Timer mutations write logs/outbox in a Dexie transaction, then persist `metadata` active state via helpers; this avoided flaky metadata updates in multi-store transactions during tests.
- Updated outbox assertions to avoid relying on insertion order when reading the sync queue.

## 2026-01-04

- Added manual log creation and update helpers (`createManualLogWithOutbox`, `updateLogWithOutbox`) with runtime checks for required end times.
- Blocked editing/deleting the active log in data-layer helpers to enforce “no edit while active” before UI work.

## 2026-01-05

- Added `useLogs` hook to load visible logs (excluding tombstones), expose active timer metadata, and refresh after create/update/delete operations.
- Covered hook behavior with TDD in `app/tests/useLogs.test.ts` to ensure list refreshes and tombstones stay hidden.

## 2026-01-06

- Added stats calculation helper in `app/src/db/stats.ts` to compute all-time and per-year totals from local logs using local year boundaries.
- Added TDD coverage in `app/tests/stats.test.ts`, including timezone boundary handling and tombstone/active log exclusion.

## 2026-01-07

- Added `useStats` hook to load logs/metadata, compute totals, and surface yearly goal data when it matches the active year.
- Added TDD coverage for `useStats` in `app/tests/useStats.test.ts`, including refresh behavior and goal filtering.

## 2026-01-08

- Added `StatsSummary` UI component backed by `useStats` with tests to render totals and yearly goal progress.
