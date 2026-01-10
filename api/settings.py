from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

import os

from fastapi import Request


@dataclass(frozen=True)
class Settings:
    internal_sync_token: Optional[str]


def load_settings() -> Settings:
    token = os.getenv("INTERNAL_SYNC_TOKEN")
    return Settings(internal_sync_token=token or None)


def get_settings(request: Request) -> Settings:
    return request.app.state.settings
