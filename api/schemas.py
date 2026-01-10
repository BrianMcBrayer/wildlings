from __future__ import annotations

from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, Field


class LogPayload(BaseModel):
    id: str
    start_at: datetime
    end_at: datetime | None
    note: str | None
    updated_at_local: datetime
    deleted_at_local: datetime | None
    updated_at_server: datetime | None
    deleted_at_server: datetime | None


class DeletePayload(BaseModel):
    id: str
    deleted_at_local: datetime


class SyncOpBase(BaseModel):
    op_id: str
    entity: Literal["log"]
    record_id: str


class SyncOpUpsert(SyncOpBase):
    action: Literal["upsert"]
    payload: LogPayload


class SyncOpDelete(SyncOpBase):
    action: Literal["delete"]
    payload: DeletePayload


SyncOp = Annotated[SyncOpUpsert | SyncOpDelete, Field(discriminator="action")]


class SyncPushRequest(BaseModel):
    device_id: str
    client_time: datetime
    ops: list[SyncOp]


class RejectedOp(BaseModel):
    op_id: str
    code: str
    message: str


class AppliedLog(BaseModel):
    id: str
    updated_at_server: str
    deleted_at_server: str | None


class AppliedLogs(BaseModel):
    logs: list[AppliedLog]


class SyncPushResponse(BaseModel):
    server_time: str
    ack_op_ids: list[str]
    rejected: list[RejectedOp]
    applied: AppliedLogs
    next_cursor: str


class PullLog(BaseModel):
    id: str
    start_at: str
    end_at: str | None
    note: str | None
    updated_at_server: str
    deleted_at_server: str | None


class PullChanges(BaseModel):
    logs: list[PullLog]


class SyncPullResponse(BaseModel):
    server_time: str
    next_cursor: str
    changes: PullChanges
