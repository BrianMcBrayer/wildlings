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
