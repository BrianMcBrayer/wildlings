from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel


class Log(SQLModel, table=True):
    id: str = Field(primary_key=True)
    start_at: datetime
    end_at: Optional[datetime] = None
    note: Optional[str] = None
    updated_at_server: datetime
    deleted_at_server: Optional[datetime] = None
