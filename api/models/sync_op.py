from __future__ import annotations

from datetime import datetime

from sqlmodel import Field, SQLModel


class SyncOp(SQLModel, table=True):
    device_id: str = Field(primary_key=True)
    op_id: str = Field(primary_key=True)
    entity: str
    action: str
    applied_at: datetime
