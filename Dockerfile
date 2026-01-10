# syntax=docker/dockerfile:1
FROM node:20-alpine AS app-build
WORKDIR /app
COPY app/package.json app/package-lock.json ./app/
WORKDIR /app/app
RUN npm ci
COPY app/ ./
RUN npm run build

FROM python:3.12-slim AS runtime
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
WORKDIR /app

RUN pip install --no-cache-dir uv
COPY api/ /app/api/
WORKDIR /app/api
RUN uv sync --frozen --no-dev

WORKDIR /app
COPY --from=app-build /app/app/dist /app/app/dist

ENV STATIC_DIR=/app/app/dist
ENV DATABASE_URL=sqlite:////data/wildlings.db
ENV PATH="/app/api/.venv/bin:$PATH"
ENV PYTHONPATH=/app

RUN useradd --create-home --shell /usr/sbin/nologin wildlings \
    && mkdir -p /data \
    && chown -R wildlings:wildlings /data
USER wildlings

EXPOSE 8000
CMD ["sh","-c","cd /app/api && alembic -c /app/api/alembic.ini upgrade head && uvicorn api.main:app --app-dir /app --host 0.0.0.0 --port 8000"]
