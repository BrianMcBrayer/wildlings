from __future__ import annotations

from datetime import datetime, timezone
from typing import Callable

from fastapi import Request


def ensure_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def format_iso(value: datetime) -> str:
    return ensure_utc(value).isoformat().replace("+00:00", "Z")


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def get_now(request: Request) -> datetime:
    override: Callable[[], datetime] | None = getattr(
        request.app.state, "now_override", None
    )
    if override is not None:
        return ensure_utc(override())
    return utc_now()
