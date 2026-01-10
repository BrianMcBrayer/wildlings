from __future__ import annotations

from pathlib import Path

import pytest
from httpx import ASGITransport, AsyncClient

from api.main import create_app


@pytest.mark.asyncio
async def test_static_serves_index_and_assets(tmp_path: Path, monkeypatch) -> None:
    index_path = tmp_path / "index.html"
    index_path.write_text("<html><body>Wildlings</body></html>", encoding="utf-8")
    assets_dir = tmp_path / "assets"
    assets_dir.mkdir()
    asset_path = assets_dir / "app.js"
    asset_path.write_text("console.log('wildlings');", encoding="utf-8")

    monkeypatch.setenv("STATIC_DIR", str(tmp_path))
    app = create_app()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/")
        assert response.status_code == 200
        assert "Wildlings" in response.text

        response = await client.get("/assets/app.js")
        assert response.status_code == 200
        assert "wildlings" in response.text

        response = await client.get("/logs")
        assert response.status_code == 200
        assert "Wildlings" in response.text
