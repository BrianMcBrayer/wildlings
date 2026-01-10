# Wildlings

An offline-first PWA for tracking outdoor time. The UI is local-first (Dexie/IndexedDB) and syncs safely to the FastAPI backend when connectivity is available.

## Quick start

### Frontend

```bash
cd app
npm install
npm run dev
```

### Backend

```bash
cd api
uv sync --dev
uv run uvicorn api.main:app --reload
```

## Tests

### Frontend

```bash
cd app
npm test
npm run typecheck
```

### Backend

```bash
cd api
uv run pytest
```

## Deployment notes

- Docker uses SQLite with a persistent volume defined in `docker-compose.yml`.
- Optional sync hardening: set `INTERNAL_SYNC_TOKEN` and configure your reverse proxy to strip external `X-Internal-Token` headers.
  - Caddy: `header_up -X-Internal-Token`
