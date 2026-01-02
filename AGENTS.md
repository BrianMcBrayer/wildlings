App name: **Wildlings**

This document is the **single source of truth** for how contributors/agents design, implement, and test Wildlings. If something is ambiguous, **update this file first** (with tests) before implementing behavior.

---

## 0. One-liner

A specialized **offline-first PWA** for tracking time spent outdoors (inspired by “1000 Hours Outside”), built to work reliably in remote locations and **sync safely** to a central server when connectivity is available.

---

## 1. Product Vision

### 1.1 Goals
- Track outdoor time via a simple **Start/Stop timer** and manual logs.
- Work **seamlessly offline** (local-first): the app must remain fully usable without network.
- Sync to server when possible: **safe retries**, no data loss, predictable conflict handling.
- Provide simple **Stats** toward a **configurable yearly goal**.

### 1.2 Non-goals (for now)
- Multi-user accounts / internal auth (proxy handles access).
- Real-time collaboration.
- Complex analytics beyond totals/progress.
- Tags/categories.
- Import/export tooling.

### 1.3 Key behavioral rules (must be enforced)
- Single profile only (one global log stream per device).
- **At most one active timer** per device at a time.
- All timestamps are stored as **UTC instants** (ISO-8601). UI may display local time.
- Logs may be edited; overlap policy is **allowed** (do not block overlaps initially).
- Stats default to **calendar year** totals (Jan 1–Dec 31 in the user’s local timezone), plus all-time totals.
- Timer edits are blocked while active; stop auto-fills `end_at` with "now" (user can edit later).
- No pause feature; start/stop only.
- No minimum duration threshold.

---

## 2. Environment & Infrastructure

### 2.1 Deployment
- Dockerized deployment on **unRAID**
- Behind a reverse proxy (e.g., **Nginx Proxy Manager** / **Traefik**)
- Container registry: **GHCR** (GitHub Container Registry)

### 2.2 Security model (trusted boundary)
- **No internal authentication** in the app.
- The reverse proxy is the access control boundary.

**Operational safety requirements (must be true in deployment):**
- Backend must bind to an internal network interface only (not directly exposed to the public internet).
- Proxy must terminate HTTPS.
- Backend must enforce **strict CORS** (same-origin by default).
- Backend must only trust `X-Forwarded-*` headers from the proxy network/IP range.

**Optional safety gate (allowed even with “no auth”):**
- If `INTERNAL_SYNC_TOKEN` env var is set, `/sync/*` endpoints must require header:
  - `X-Internal-Token: <value>`
- If unset, do not require it. (This is a deployment hardening switch, not “user auth”.)

---

## 3. Tech Stack Specifications

### 3.1 Frontend
- Framework: **TanStack Start** (React + Vite)
- Routing/State: **TanStack Router** (file-based routing)
- Local DB: **Dexie.js** (IndexedDB)
- Data fetching/sync: **TanStack Query**
- Styling: **Tailwind CSS**
- Validation: **Zod** (preferred) or equivalent runtime schema validator  
  (Used to enforce API contracts + local data invariants.)
- Frontend package management: **npm**

### 3.4 Documentation sources (use latest)
- TanStack Start/Router (React): https://github.com/TanStack/router/tree/main/docs/start/framework/react
- Dexie.js: https://dexie.org/docs/
- TanStack Query (React): https://tanstack.com/query/latest/docs/framework/react/overview
- Tailwind CSS: https://tailwindcss.com/docs
- Zod: https://zod.dev/
- Vite PWA plugin: https://vite-pwa-org.netlify.app/

### 3.2 Backend
- Framework: **FastAPI** (Python 3.12+)
- Database: **PostgreSQL**
- ORM/models: **SQLModel**
- Validation: **Pydantic v2**
- Migrations: **Alembic** (required)
- Python package management: **uv** only

### 3.5 Backend documentation sources (use latest)
- FastAPI: https://fastapi.tiangolo.com/
- SQLModel: https://sqlmodel.tiangolo.com/
- Pydantic v2: https://docs.pydantic.dev/latest/
- Alembic: https://alembic.sqlalchemy.org/en/latest/

### 3.3 Testing
- Frontend: **Vitest** + React Testing Library + **MSW**
- Backend: **Pytest** + **HTTPX** (ASGI test client)
- Contract testing: OpenAPI + runtime validation on both sides (see §6.4)

---

## 4. Strict Development Protocol (STRICT TDD)

All code must follow **Red → Green → Refactor**.  
Agents are **forbidden** from submitting implementation code without corresponding tests.

1. **Red:** Add a failing test in:
   - Frontend: `app/tests/`
   - Backend: `api/tests/`
2. **Green:** Implement the minimum logic to pass the test.
3. **Refactor:** Improve structure, type-safety, and readability without changing behavior.
4. **Always run tests twice:** once before changes to capture the failing state (Red), and again after changes to confirm Green.

### 4.1 Required checks before PR / submission
Frontend:
- `pnpm test` (or `npm test`)
- `pnpm typecheck` (TypeScript strict, `tsc --noEmit`)

Backend:
- `pytest`
- (Optional but recommended) `ruff` / `black` if configured in repo

If these scripts don’t exist yet, create them with tests first.

---

## 5. Architectural Rules & Patterns

## 5.1 Offline-first data model (Local DB is source of truth)
- **Source of Truth:** Dexie (IndexedDB) is the primary source of truth for UI state.
- UI reads/writes local DB first; server is a replication target.
- All mutations (create/update/delete) must:
  1) Apply to local tables atomically, AND
  2) Append an operation to `sync_queue` (outbox)

### 5.1.1 Dexie tables (required)
- `logs`
- `sync_queue`
- `metadata`

#### logs (local)
Minimum fields:
- `id: string` (UUID, generated client-side)
- `start_at: string` (UTC ISO-8601)
- `end_at: string | null` (UTC ISO-8601; null while active)
- `note: string | null`
- `updated_at_local: string` (UTC ISO-8601; set on every local change)
- `deleted_at_local: string | null` (tombstone for local deletes)

Sync-related fields stored locally (mirrors server state):
- `updated_at_server: string | null`
- `deleted_at_server: string | null`

#### sync_queue (outbox)
Each row is an operation that can be retried safely.
Minimum fields:
- `op_id: string` (UUID, generated client-side; stable for retries)
- `device_id: string`
- `entity: "log"`
- `action: "upsert" | "delete"`
- `record_id: string` (UUID)
- `payload: object` (full record snapshot for upsert; minimal for delete)
- `created_at_local: string` (UTC ISO-8601)
- `attempts: number`
- `last_error: string | null`

#### metadata
- `device_id: string` (persisted forever once created)
- `active_log_id: string | null`
- `active_start_at: string | null` (UTC ISO-8601)
- `last_sync_cursor: string | null`
- `last_sync_at: string | null`
- `yearly_goal_hours: number | null`
- `yearly_goal_year: number | null`

### 5.1.2 Active timer persistence (must survive restarts)
When the timer starts/stops:
- Immediately persist `active_log_id` and `active_start_at` to `metadata`.
- Do not rely on in-memory React state for timer truth.

---

## 5.2 Sync Engine (reliable, retryable, and browser-realistic)

### 5.2.1 Connectivity principles
- `navigator.onLine` is **only a hint**. Do not trust it as truth.
- Sync should be **opportunistic** and triggered by user/app activity.

### 5.2.2 When to attempt sync (minimum triggers)
- On app startup
- When the app becomes visible (`visibilitychange`)
- After a mutation (debounced; e.g., 1–3 seconds)
- When a previously failing request succeeds (resume attempts)

### 5.2.3 Retry strategy
- Use exponential backoff with jitter after failures.
- Persist backoff state (or next-attempt time) in `metadata` so restarts don’t spam.

### 5.2.4 Conflict resolution rule (server-authoritative LWW)
- “Last Write Wins” is based on **server** ordering:
  - `updated_at_server` (or a server version) is the tiebreaker.
- Client clocks may be wrong; do not use client timestamps for final ordering.
- Conflicts are applied silently (no user-facing conflict UI in MVP).

### 5.2.5 Deletes must be tombstoned
- Deleting a log sets `deleted_at_local` immediately and enqueues a `"delete"` op.
- Server stores `deleted_at_server` and returns tombstones during pull.
- Never hard-delete in a way that could cause resurrection on pull.
- Tombstones may be garbage-collected after a retention period (default: 90 days).

---

## 6. Sync API Contract (MUST MATCH EXACTLY)

The sync protocol must support:
- Offline creation (client-generated IDs)
- Safe retries (idempotency)
- Pagination / no missed updates (cursor)
- Tombstones for deletes
- Server-authoritative timestamps

### 6.1 Identity & idempotency (required)
- Client generates and persists a stable `device_id` in `metadata`.
- Each outbox operation has a stable `op_id`.
- Server MUST deduplicate ops by `(device_id, op_id)`.
- No device ID reset UI in MVP.

### 6.2 Endpoints
- `POST /sync/push`
- `GET  /sync/pull?cursor=<opaque_cursor>`
- Cursor is managed client-side; server remains stateless with respect to cursors.

### 6.3 Schemas (JSON)

#### 6.3.1 POST /sync/push — Request
```json
{
  "device_id": "uuid",
  "client_time": "2026-01-01T12:00:00Z",
  "ops": [
    {
      "op_id": "uuid",
      "entity": "log",
      "action": "upsert",
      "record_id": "uuid",
      "payload": {
        "id": "uuid",
        "start_at": "2026-01-01T11:00:00Z",
        "end_at": "2026-01-01T12:00:00Z",
        "note": "Played outside",
        "updated_at_local": "2026-01-01T12:00:00Z",
        "deleted_at_local": null,
        "updated_at_server": null,
        "deleted_at_server": null
      }
    }
  ]
}
````

#### 6.3.2 POST /sync/push — Response

```json
{
  "server_time": "2026-01-01T12:00:01Z",
  "ack_op_ids": ["uuid"],
  "rejected": [
    {
      "op_id": "uuid",
      "code": "VALIDATION_ERROR",
      "message": "end_at must be >= start_at"
    }
  ],
  "applied": {
    "logs": [
      {
        "id": "uuid",
        "updated_at_server": "2026-01-01T12:00:01Z",
        "deleted_at_server": null
      }
    ]
  },
  "next_cursor": "opaque-string"
}
```

#### 6.3.3 GET /sync/pull — Response

```json
{
  "server_time": "2026-01-01T12:00:02Z",
  "next_cursor": "opaque-string",
  "changes": {
    "logs": [
      {
        "id": "uuid",
        "start_at": "2026-01-01T11:00:00Z",
        "end_at": "2026-01-01T12:00:00Z",
        "note": "Played outside",
        "updated_at_server": "2026-01-01T12:00:01Z",
        "deleted_at_server": null
      },
      {
        "id": "uuid",
        "start_at": "2026-01-01T09:00:00Z",
        "end_at": "2026-01-01T10:00:00Z",
        "note": null,
        "updated_at_server": "2026-01-01T12:00:01Z",
        "deleted_at_server": "2026-01-01T12:00:01Z"
      }
    ]
  }
}
```

### 6.4 Schema parity enforcement (no “hand-wavy” parity)

* Backend must expose accurate OpenAPI.
* Frontend must validate API payloads at runtime (Zod schemas).
* Any change to sync payloads requires:

  * Backend test update (Pytest)
  * Frontend contract test update (Vitest)
  * Updated examples in this file (AGENTS.md)

---

## 7. Core Features to Implement (MVP)

### 7.1 Timer

* Start/Stop toggle
* Creates or updates a log in local DB
* Persists active state in `metadata`
* Enqueues outbox ops for server sync
* While active, the timer log cannot be edited until stopped

### 7.2 Log Management

* List logs (local)
* Manual create log
* Edit existing log (start/end/note)
* Delete log (tombstone)
* Manual entry requires both start and end times (except when explicitly creating a running timer with a manual start time)
* No trash view

### 7.3 Stats

* Total hours:

  * Current calendar year
  * All time
* Progress bar toward yearly goal (configurable per year, set by the user at the start of the year)

---

## 8. AI Coding Guidelines (Hard rules)

* **No Next.js** patterns. Use TanStack Router file-based routing.
* **Offline-first always:** UI reads from Dexie; network is replication only.
* **No direct server writes from UI** without also writing local + enqueueing sync op.
* **Tailwind only** for styling. Do not add component libraries unless:

  * Needed for accessibility primitives (Radix UI allowed).
* Visual tone: delightful and calm; avoid whimsical/silly or brutalist aesthetics.
* Maintain `ARCHITECT.md` as an ongoing journal of decisions and context that must survive across sessions/slices.
* GitHub operations may use `git` and `gh` CLI tools when needed.
* Prefer small, testable modules:

  * `db/` for Dexie schema + repository functions
  * `hooks/` for `useTimer`, `useSync`
  * `api/` for backend routes and models

---

## 9. Directory Structure

```text
/
├── app/                # TanStack Start Frontend
│   ├── src/
│   │   ├── db/         # Dexie schema, repositories, outbox logic
│   │   ├── components/ # Atomic UI components
│   │   ├── routes/     # TanStack Router file routes
│   │   └── hooks/      # useTimer, useSync, etc.
│   └── tests/          # Vitest suites
├── api/                # FastAPI Backend
│   ├── models/         # SQLModel definitions
│   ├── routes/         # API endpoints (sync, etc.)
│   ├── migrations/     # Alembic migrations
│   └── tests/          # Pytest suites
├── docker-compose.yml  # Local dev & unRAID deployment
└── AGENTS.md           # This file
```

---

## 10. Implementation checklist (do not skip)

Before implementing sync end-to-end:

* [ ] Dexie schema includes `logs`, `sync_queue`, `metadata`
* [ ] `device_id` is generated once and persisted
* [ ] All mutations are atomic: update local + enqueue op
* [ ] `/sync/push` is idempotent by `(device_id, op_id)`
* [ ] Deletes are tombstoned and pulled back correctly
* [ ] Pull uses cursor and supports pagination
* [ ] Contract tests exist for push/pull shapes
* [ ] Strict TDD followed for each feature
