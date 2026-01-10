from pathlib import Path


def test_dockerfile_runs_binaries_from_venv() -> None:
    dockerfile = Path(__file__).resolve().parents[2] / "Dockerfile"
    contents = dockerfile.read_text(encoding="utf-8")

    assert 'ENV PATH="/app/api/.venv/bin:$PATH"' in contents
    assert "ENV PYTHONPATH=/app" in contents
    assert "cd /app/api && alembic -c /app/api/alembic.ini upgrade head" in contents
    assert "uvicorn api.main:app" in contents
