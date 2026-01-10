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

## 2026-01-09

- Added `TimerControls` UI component wired to `useTimer`, showing running state and start/stop actions with TDD coverage.
- Added `LogsManager` UI component for manual log entry, list display, and delete actions with RTL coverage.
- Extended `LogsManager` to support editing logs and disable edit/delete for the active log, with updated tests.

## 2026-01-10

- Added Zod sync contract schemas plus frontend contract tests covering push/pull payload shapes.
- Implemented frontend sync engine with outbox push, pull merge that skips pending local ops, and server-field application for logs.
- Persisted sync backoff state in metadata (`sync_backoff_ms`, `next_sync_at`) and added backoff handling on failures.
- Added `useSync` hook with startup/visibility triggers and debounced sync scheduling.
- Introduced MSW for sync tests to mock `/sync/push` and `/sync/pull` endpoints.

## 2026-01-11

- Added FastAPI sync endpoints (`/sync/push`, `/sync/pull`) with SQLModel-backed `Log` and `SyncOp` tables for idempotent push handling.
- Pull cursor is an ISO-8601 server timestamp; responses return the max `updated_at_server` from the page or echo the cursor when no changes.
- Delete ops set `deleted_at_server` and `updated_at_server`; when deleting unknown IDs, server creates a tombstone with `start_at` from `deleted_at_local`.
- Added strict CORS configuration via `CORS_ALLOW_ORIGINS` and optional `INTERNAL_SYNC_TOKEN` gate for sync endpoints.
- Added Alembic configuration and initial migration for sync tables.

## 2026-01-12

- Added Vite PWA config (`app/vite.config.ts`) with manifest metadata and Workbox `navigateFallback` to keep the shell available offline.
- Added a Vitest check for the PWA config (`app/tests/pwaConfig.test.ts`) and set it to run in node to avoid jsdom/esbuild issues.
- Manual PWA verification: build and serve the app, load once online, then toggle offline in devtools and reload to confirm shell caching works.

## 2026-01-13

- Scaffolded Vite app entry (`app/index.html`, `app/src/main.tsx`, `app/src/app.tsx`) and wired TanStack Router file-based routes with a generated `app/src/routeTree.gen.ts`.
- Added base shell layout and three routes (home, logs, settings) that compose existing Timer/Stats/Logs components.
- Introduced Tailwind + PostCSS config for styling and added a minimal favicon in `app/public`.
- Added `app/tests/appRoutes.test.tsx` to assert core routes render, plus router setup helper to share context.

## 2026-01-14

- Updated backend storage guidance to SQLite for a single-container deployment.
- FastAPI can now serve built frontend assets via `STATIC_DIR`, including an SPA fallback for client routes.
- Replaced the placeholder Dockerfile with a multi-stage build (Vite build + FastAPI runtime) and added `docker-compose.yml` with a persistent SQLite volume.

## 2026-01-15

- Enabled SQLite WAL mode on backend engine creation to improve concurrent read/write behavior.
- Added a Docker Compose healthcheck hitting `/sync/pull` with optional internal token header.
- Loaded `INTERNAL_SYNC_TOKEN` into app settings at startup and wired sync auth to use the cached setting.
- Added a header sync status pill wired to `useSync` with retry-on-error.
- Made `/sync/push` atomic for new ops: if any new op fails validation, no new ops are applied or acked.
- Deployment: Caddy reverse proxy should strip `X-Internal-Token` from external requests:
  - `header_up -X-Internal-Token`
- Added coverage to ensure server time drives `updated_at_server` on push (clock drift mitigation).
- Added root README with dev/test/deploy notes; removed the refactor checklist once completed.
- CI/CD: aligned GitHub workflows with the `mcmoney` pattern (release trigger in CI, and split commit vs release Docker builds with `sha-<short>` and release tags).
- Docker workflow now runs frontend/backend tests before building images, so pushes/releases are gated on green CI.

## 2026-01-16

- Introduced the "Digital Field Guide" visual system: Wildlings color palette, serif/sans font pairing, and global base styles.
- Restyled Timer, Stats, Logs, and root layout to use journal-inspired cards, mobile bottom nav, and pill-style sync status.
- Logs UI now groups entries by day labels (Today/Yesterday/Month Day) with a collapsible manual entry form.
