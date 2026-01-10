from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

import pytest
from sqlmodel import Session

from api.models import Log


def isoformat_z(value: datetime) -> str:
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


@pytest.mark.asyncio
async def test_push_is_idempotent(client, app, engine, fixed_time):
    device_id = str(uuid4())
    op_id = str(uuid4())
    log_id = str(uuid4())

    payload = {
        "device_id": device_id,
        "client_time": "2026-01-01T12:00:00Z",
        "ops": [
            {
                "op_id": op_id,
                "entity": "log",
                "action": "upsert",
                "record_id": log_id,
                "payload": {
                    "id": log_id,
                    "start_at": "2026-01-01T11:00:00Z",
                    "end_at": "2026-01-01T12:00:00Z",
                    "note": "Played outside",
                    "updated_at_local": "2026-01-01T12:00:00Z",
                    "deleted_at_local": None,
                    "updated_at_server": None,
                    "deleted_at_server": None,
                },
            }
        ],
    }

    app.state.now_override = lambda: fixed_time(1)
    response = await client.post("/sync/push", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["ack_op_ids"] == [op_id]
    assert data["rejected"] == []
    assert data["applied"]["logs"][0]["id"] == log_id
    assert data["applied"]["logs"][0]["updated_at_server"] == "2026-01-01T12:00:01Z"

    with Session(engine) as session:
        stored = session.get(Log, log_id)
        assert stored is not None
        first_updated_at = stored.updated_at_server

    app.state.now_override = lambda: fixed_time(2)
    response = await client.post("/sync/push", json=payload)
    assert response.status_code == 200

    with Session(engine) as session:
        stored = session.get(Log, log_id)
        assert stored is not None
        assert stored.updated_at_server == first_updated_at


@pytest.mark.asyncio
async def test_push_delete_sets_tombstone(client, app, engine, fixed_time):
    device_id = str(uuid4())
    op_id = str(uuid4())
    log_id = str(uuid4())

    with Session(engine) as session:
        session.add(
            Log(
                id=log_id,
                start_at=datetime(2026, 1, 1, 10, 0, tzinfo=timezone.utc),
                end_at=datetime(2026, 1, 1, 11, 0, tzinfo=timezone.utc),
                note="Existing log",
                updated_at_server=datetime(2026, 1, 1, 11, 0, tzinfo=timezone.utc),
                deleted_at_server=None,
            )
        )
        session.commit()

    payload = {
        "device_id": device_id,
        "client_time": "2026-01-01T12:00:00Z",
        "ops": [
            {
                "op_id": op_id,
                "entity": "log",
                "action": "delete",
                "record_id": log_id,
                "payload": {
                    "id": log_id,
                    "deleted_at_local": "2026-01-01T12:00:00Z",
                },
            }
        ],
    }

    app.state.now_override = lambda: fixed_time(3)
    response = await client.post("/sync/push", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["ack_op_ids"] == [op_id]
    assert data["applied"]["logs"][0]["deleted_at_server"] == "2026-01-01T12:00:03Z"

    with Session(engine) as session:
        stored = session.get(Log, log_id)
        assert stored is not None
        assert stored.deleted_at_server is not None
        assert isoformat_z(stored.deleted_at_server) == "2026-01-01T12:00:03Z"
        assert isoformat_z(stored.updated_at_server) == "2026-01-01T12:00:03Z"


@pytest.mark.asyncio
async def test_pull_uses_cursor_and_returns_tombstones(client, app, engine, fixed_time):
    log_one_id = "00000000-0000-0000-0000-000000000001"
    log_two_id = "00000000-0000-0000-0000-000000000002"

    with Session(engine) as session:
        session.add(
            Log(
                id=log_one_id,
                start_at=datetime(2026, 1, 1, 9, 0, tzinfo=timezone.utc),
                end_at=datetime(2026, 1, 1, 10, 0, tzinfo=timezone.utc),
                note="Log one",
                updated_at_server=datetime(2026, 1, 1, 10, 30, tzinfo=timezone.utc),
                deleted_at_server=None,
            )
        )
        session.add(
            Log(
                id=log_two_id,
                start_at=datetime(2026, 1, 1, 8, 0, tzinfo=timezone.utc),
                end_at=datetime(2026, 1, 1, 9, 0, tzinfo=timezone.utc),
                note=None,
                updated_at_server=datetime(2026, 1, 1, 11, 0, tzinfo=timezone.utc),
                deleted_at_server=datetime(2026, 1, 1, 11, 0, tzinfo=timezone.utc),
            )
        )
        session.commit()

    app.state.now_override = lambda: fixed_time(4)
    response = await client.get("/sync/pull")
    assert response.status_code == 200
    data = response.json()
    assert len(data["changes"]["logs"]) == 2
    assert (
        data["next_cursor"]
        == "2026-01-01T11:00:00Z|00000000-0000-0000-0000-000000000002"
    )

    response = await client.get(f"/sync/pull?cursor={data['next_cursor']}")
    assert response.status_code == 200
    data = response.json()
    assert data["changes"]["logs"] == []


@pytest.mark.asyncio
async def test_pull_cursor_handles_timestamp_collisions(
    client, app, engine, fixed_time, monkeypatch
):
    monkeypatch.setattr("api.routes.sync.DEFAULT_PAGE_SIZE", 1)

    log_one_id = "00000000-0000-0000-0000-000000000010"
    log_two_id = "00000000-0000-0000-0000-000000000011"
    updated_at = datetime(2026, 1, 2, 12, 0, tzinfo=timezone.utc)

    with Session(engine) as session:
        session.add(
            Log(
                id=log_one_id,
                start_at=datetime(2026, 1, 2, 9, 0, tzinfo=timezone.utc),
                end_at=datetime(2026, 1, 2, 10, 0, tzinfo=timezone.utc),
                note="Log one",
                updated_at_server=updated_at,
                deleted_at_server=None,
            )
        )
        session.add(
            Log(
                id=log_two_id,
                start_at=datetime(2026, 1, 2, 10, 0, tzinfo=timezone.utc),
                end_at=datetime(2026, 1, 2, 11, 0, tzinfo=timezone.utc),
                note="Log two",
                updated_at_server=updated_at,
                deleted_at_server=None,
            )
        )
        session.commit()

    response = await client.get("/sync/pull")
    assert response.status_code == 200
    data = response.json()
    assert len(data["changes"]["logs"]) == 1
    assert data["changes"]["logs"][0]["id"] == log_one_id
    assert data["next_cursor"] == f"2026-01-02T12:00:00Z|{log_one_id}"

    response = await client.get(f"/sync/pull?cursor={data['next_cursor']}")
    assert response.status_code == 200
    data = response.json()
    assert len(data["changes"]["logs"]) == 1
    assert data["changes"]["logs"][0]["id"] == log_two_id


@pytest.mark.asyncio
async def test_push_rejects_invalid_log_times(client, app, engine, fixed_time):
    device_id = str(uuid4())
    op_id = str(uuid4())
    log_id = str(uuid4())

    payload = {
        "device_id": device_id,
        "client_time": "2026-01-01T12:00:00Z",
        "ops": [
            {
                "op_id": op_id,
                "entity": "log",
                "action": "upsert",
                "record_id": log_id,
                "payload": {
                    "id": log_id,
                    "start_at": "2026-01-01T12:00:00Z",
                    "end_at": "2026-01-01T11:00:00Z",
                    "note": "Backwards",
                    "updated_at_local": "2026-01-01T12:00:00Z",
                    "deleted_at_local": None,
                    "updated_at_server": None,
                    "deleted_at_server": None,
                },
            }
        ],
    }

    app.state.now_override = lambda: fixed_time(5)
    response = await client.post("/sync/push", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["ack_op_ids"] == []
    assert data["rejected"][0]["op_id"] == op_id
    assert data["rejected"][0]["code"] == "VALIDATION_ERROR"

    with Session(engine) as session:
        stored = session.get(Log, log_id)
        assert stored is None


@pytest.mark.asyncio
async def test_push_is_atomic_when_any_op_is_invalid(client, app, engine, fixed_time):
    device_id = str(uuid4())
    valid_op_id = str(uuid4())
    invalid_op_id = str(uuid4())
    valid_log_id = str(uuid4())
    invalid_log_id = str(uuid4())

    payload = {
        "device_id": device_id,
        "client_time": "2026-01-01T12:00:00Z",
        "ops": [
            {
                "op_id": valid_op_id,
                "entity": "log",
                "action": "upsert",
                "record_id": valid_log_id,
                "payload": {
                    "id": valid_log_id,
                    "start_at": "2026-01-01T09:00:00Z",
                    "end_at": "2026-01-01T10:00:00Z",
                    "note": "Valid",
                    "updated_at_local": "2026-01-01T10:00:00Z",
                    "deleted_at_local": None,
                    "updated_at_server": None,
                    "deleted_at_server": None,
                },
            },
            {
                "op_id": invalid_op_id,
                "entity": "log",
                "action": "upsert",
                "record_id": invalid_log_id,
                "payload": {
                    "id": invalid_log_id,
                    "start_at": "2026-01-01T12:00:00Z",
                    "end_at": "2026-01-01T11:00:00Z",
                    "note": "Invalid",
                    "updated_at_local": "2026-01-01T12:00:00Z",
                    "deleted_at_local": None,
                    "updated_at_server": None,
                    "deleted_at_server": None,
                },
            },
        ],
    }

    app.state.now_override = lambda: fixed_time(6)
    response = await client.post("/sync/push", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["ack_op_ids"] == []
    assert data["applied"]["logs"] == []
    assert data["rejected"][0]["op_id"] == invalid_op_id

    with Session(engine) as session:
        assert session.get(Log, valid_log_id) is None
        assert session.get(Log, invalid_log_id) is None


@pytest.mark.asyncio
async def test_push_uses_server_time_for_updated_at(client, app, engine, fixed_time):
    device_id = str(uuid4())
    op_id = str(uuid4())
    log_id = str(uuid4())

    payload = {
        "device_id": device_id,
        "client_time": "2026-01-01T12:00:00Z",
        "ops": [
            {
                "op_id": op_id,
                "entity": "log",
                "action": "upsert",
                "record_id": log_id,
                "payload": {
                    "id": log_id,
                    "start_at": "2026-01-01T08:00:00Z",
                    "end_at": "2026-01-01T09:00:00Z",
                    "note": "Clock drift",
                    "updated_at_local": "2026-01-01T00:00:00Z",
                    "deleted_at_local": None,
                    "updated_at_server": None,
                    "deleted_at_server": None,
                },
            }
        ],
    }

    app.state.now_override = lambda: fixed_time(7)
    response = await client.post("/sync/push", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["applied"]["logs"][0]["updated_at_server"] == "2026-01-01T12:00:07Z"

    with Session(engine) as session:
        stored = session.get(Log, log_id)
        assert stored is not None
        assert isoformat_z(stored.updated_at_server) == "2026-01-01T12:00:07Z"
