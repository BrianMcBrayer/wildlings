from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Callable, Iterator

import sys

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlmodel import Session, SQLModel, create_engine

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from api.db import get_session  # noqa: E402
from api import models  # noqa: F401,E402
from api.main import create_app  # noqa: E402


@pytest.fixture()
def engine():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False})
    SQLModel.metadata.create_all(engine)
    return engine


@pytest.fixture()
def app(engine):
    app = create_app()

    def get_test_session() -> Iterator[Session]:
        with Session(engine) as session:
            yield session

    app.dependency_overrides[get_session] = get_test_session
    app.state.now_override: Callable[[], datetime] | None = None
    app.state.engine = engine
    return app


@pytest_asyncio.fixture()
async def client(app):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


@pytest.fixture()
def fixed_time() -> Callable[[int], datetime]:
    def _make(seconds: int) -> datetime:
        return datetime(2026, 1, 1, 12, 0, seconds, tzinfo=timezone.utc)

    return _make
