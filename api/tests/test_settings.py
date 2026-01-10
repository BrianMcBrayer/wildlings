from __future__ import annotations

from httpx import ASGITransport, AsyncClient
from sqlmodel import Session

import pytest

from api.db import get_session
from api.main import create_app


@pytest.mark.asyncio
async def test_internal_sync_token_loaded_at_startup(engine, monkeypatch) -> None:
    monkeypatch.setenv("INTERNAL_SYNC_TOKEN", "alpha-token")
    app = create_app()

    def get_test_session():
        with Session(engine) as session:
            yield session

    app.dependency_overrides[get_session] = get_test_session

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/sync/pull")
        assert response.status_code == 403

        monkeypatch.setenv("INTERNAL_SYNC_TOKEN", "beta-token")
        response = await client.get(
            "/sync/pull", headers={"X-Internal-Token": "beta-token"}
        )
        assert response.status_code == 403

        response = await client.get(
            "/sync/pull", headers={"X-Internal-Token": "alpha-token"}
        )
        assert response.status_code == 200
