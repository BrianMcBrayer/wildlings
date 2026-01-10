#!/usr/bin/env bash
set -euo pipefail

paths=(
  app
  api
  AGENTS.md
  ARCHITECT.md
  Dockerfile
  docker-compose.yml
)

git ls-files -z -- "${paths[@]}" | uvx --from files-to-prompt files-to-prompt \
  --null \
  --ignore ".DS_Store" \
  --ignore ".env" \
  --ignore ".env.*" \
  --ignore ".git" \
  --ignore ".mypy_cache" \
  --ignore "node_modules" \
  --ignore ".pytest_cache" \
  --ignore ".ruff_cache" \
  --ignore ".venv" \
  --ignore "__pycache__" \
  --ignore "*.min.css" \
  --ignore "*.min.js" \
  --ignore "*.bundle.js" \
  --ignore "*.bundle.min.js" \
  --ignore "alpine.js" \
  --ignore "*.egg-info" \
  --ignore "*.pyc" \
  --ignore "*.pyo" \
  --ignore "*.pyd" \
  --ignore "*.db" \
  --ignore "*.sqlite" \
  --ignore "*.sqlite3" \
  --ignore "*.png" \
  --ignore "*.jpg" \
  --ignore "*.jpeg" \
  --ignore "*.gif" \
  --ignore "*.pdf" \
  --ignore "*.zip" \
  --ignore "*.tar" \
  --ignore "*.gz" \
  --ignore "*.ico" \
  --ignore ".coverage" \
  --ignore "build" \
  --ignore "dist" \
  --ignore "instance"
