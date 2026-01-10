from __future__ import annotations

from datetime import datetime
from typing import Any, Optional, cast

from sqlalchemy import and_, or_

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlmodel import Session, select

from api.db import get_session
from api.models import Log, SyncOp
from api.schemas import (
    AppliedLog,
    AppliedLogs,
    PullChanges,
    PullLog,
    RejectedOp,
    SyncOpDelete,
    SyncOpUpsert,
    SyncPullResponse,
    SyncPushRequest,
    SyncPushResponse,
)
from api.settings import Settings, get_settings
from api.time import ensure_utc, format_iso, get_now


DEFAULT_PAGE_SIZE = 100

router = APIRouter(prefix="/sync", tags=["sync"])


def parse_cursor(cursor: Optional[str]) -> tuple[Optional[datetime], Optional[str]]:
    if not cursor:
        return None, None
    if "|" in cursor:
        raw_dt, raw_id = cursor.split("|", 1)
    else:
        raw_dt, raw_id = cursor, None
    try:
        parsed = datetime.fromisoformat(raw_dt.replace("Z", "+00:00"))
        return ensure_utc(parsed), raw_id or None
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid cursor")


def require_internal_token(
    token: Optional[str] = Header(default=None, alias="X-Internal-Token"),
    settings: Settings = Depends(get_settings),
):
    if settings.internal_sync_token and token != settings.internal_sync_token:
        raise HTTPException(status_code=403, detail="Forbidden")


def validate_log_times(start_at: datetime, end_at: Optional[datetime]) -> Optional[str]:
    if end_at is None:
        return None
    if ensure_utc(end_at) < ensure_utc(start_at):
        return "end_at must be >= start_at"
    return None


@router.post("/push", response_model=SyncPushResponse)
async def sync_push(
    payload: SyncPushRequest,
    session: Session = Depends(get_session),
    now: datetime = Depends(get_now),
    _token: None = Depends(require_internal_token),
):
    server_time = ensure_utc(now)
    server_time_iso = format_iso(server_time)

    ack_op_ids: list[str] = []
    rejected: list[RejectedOp] = []
    applied_logs: list[AppliedLog] = []

    for op in payload.ops:
        existing = session.get(SyncOp, (payload.device_id, op.op_id))
        if existing:
            ack_op_ids.append(op.op_id)
            continue
        if isinstance(op, SyncOpUpsert):
            error = validate_log_times(op.payload.start_at, op.payload.end_at)
            if error:
                rejected.append(
                    RejectedOp(op_id=op.op_id, code="VALIDATION_ERROR", message=error)
                )

    if rejected:
        return SyncPushResponse(
            server_time=server_time_iso,
            ack_op_ids=ack_op_ids,
            rejected=rejected,
            applied=AppliedLogs(logs=[]),
            next_cursor=server_time_iso,
        )

    for op in payload.ops:
        existing = session.get(SyncOp, (payload.device_id, op.op_id))
        if existing:
            ack_op_ids.append(op.op_id)
            continue

        if isinstance(op, SyncOpUpsert):
            log = session.get(Log, op.record_id)
            if log:
                log.start_at = ensure_utc(op.payload.start_at)
                log.end_at = (
                    ensure_utc(op.payload.end_at) if op.payload.end_at else None
                )
                log.note = op.payload.note
                log.updated_at_server = server_time
                log.deleted_at_server = None
            else:
                log = Log(
                    id=op.record_id,
                    start_at=ensure_utc(op.payload.start_at),
                    end_at=ensure_utc(op.payload.end_at) if op.payload.end_at else None,
                    note=op.payload.note,
                    updated_at_server=server_time,
                    deleted_at_server=None,
                )
                session.add(log)

            applied_logs.append(
                AppliedLog(
                    id=op.record_id,
                    updated_at_server=server_time_iso,
                    deleted_at_server=None,
                )
            )
        elif isinstance(op, SyncOpDelete):
            log = session.get(Log, op.record_id)
            if log:
                log.deleted_at_server = server_time
                log.updated_at_server = server_time
            else:
                log = Log(
                    id=op.record_id,
                    start_at=ensure_utc(op.payload.deleted_at_local),
                    end_at=None,
                    note=None,
                    updated_at_server=server_time,
                    deleted_at_server=server_time,
                )
                session.add(log)

            applied_logs.append(
                AppliedLog(
                    id=op.record_id,
                    updated_at_server=server_time_iso,
                    deleted_at_server=server_time_iso,
                )
            )

        session.add(
            SyncOp(
                device_id=payload.device_id,
                op_id=op.op_id,
                entity=op.entity,
                action=op.action,
                applied_at=server_time,
            )
        )
        ack_op_ids.append(op.op_id)

    session.commit()

    return SyncPushResponse(
        server_time=server_time_iso,
        ack_op_ids=ack_op_ids,
        rejected=rejected,
        applied=AppliedLogs(logs=applied_logs),
        next_cursor=server_time_iso,
    )


def serialize_log(log: Log) -> PullLog:
    return PullLog(
        id=log.id,
        start_at=format_iso(log.start_at),
        end_at=format_iso(log.end_at) if log.end_at else None,
        note=log.note,
        updated_at_server=format_iso(log.updated_at_server),
        deleted_at_server=(
            format_iso(log.deleted_at_server) if log.deleted_at_server else None
        ),
    )


@router.get("/pull", response_model=SyncPullResponse)
async def sync_pull(
    cursor: Optional[str] = None,
    session: Session = Depends(get_session),
    now: datetime = Depends(get_now),
    _token: None = Depends(require_internal_token),
):
    server_time = ensure_utc(now)
    cursor_dt, cursor_id = parse_cursor(cursor)
    log_table = cast(Any, Log).__table__

    stmt = select(Log)
    if cursor_dt:
        if cursor_id:
            stmt = stmt.where(
                or_(
                    log_table.c.updated_at_server > cursor_dt,
                    and_(
                        log_table.c.updated_at_server == cursor_dt,
                        log_table.c.id > cursor_id,
                    ),
                )
            )
        else:
            stmt = stmt.where(log_table.c.updated_at_server > cursor_dt)
    stmt = stmt.order_by(log_table.c.updated_at_server, log_table.c.id).limit(
        DEFAULT_PAGE_SIZE
    )

    logs = session.exec(stmt).all()

    if logs:
        last_log = logs[-1]
        next_cursor = f"{format_iso(last_log.updated_at_server)}|{last_log.id}"
    else:
        next_cursor = cursor or f"{format_iso(server_time)}|"

    return SyncPullResponse(
        server_time=format_iso(server_time),
        next_cursor=next_cursor,
        changes=PullChanges(logs=[serialize_log(log) for log in logs]),
    )
