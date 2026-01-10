from __future__ import annotations

import os
from typing import Any, cast

from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from api.routes.sync import router as sync_router
from api.settings import load_settings


def create_app() -> FastAPI:
    app = FastAPI(title="Wildlings API")
    app.state.settings = load_settings()

    allow_origins = [
        origin.strip()
        for origin in os.getenv("CORS_ALLOW_ORIGINS", "").split(",")
        if origin.strip()
    ]
    app.add_middleware(
        cast(Any, CORSMiddleware),
        allow_origins=allow_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type", "X-Internal-Token"],
    )

    app.include_router(sync_router)

    static_dir = os.getenv("STATIC_DIR")
    if static_dir:
        static_path = Path(static_dir)
        index_file = static_path / "index.html"
        assets_path = static_path / "assets"

        if assets_path.is_dir():
            app.mount(
                "/assets",
                StaticFiles(directory=assets_path),
                name="assets",
            )

        if index_file.is_file():

            @app.get("/", include_in_schema=False)
            async def serve_index() -> FileResponse:
                return FileResponse(index_file)

            @app.get("/{full_path:path}", include_in_schema=False)
            async def spa_fallback(full_path: str) -> FileResponse:
                if full_path.startswith("sync"):
                    raise HTTPException(status_code=404, detail="Not Found")
                return FileResponse(index_file)

    return app


app = create_app()
