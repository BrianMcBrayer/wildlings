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
