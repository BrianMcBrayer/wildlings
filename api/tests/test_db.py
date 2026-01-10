from __future__ import annotations

from api.db import create_db_engine


def test_create_db_engine_enables_wal(tmp_path, monkeypatch):
    db_path = tmp_path / "wildlings.db"
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{db_path}")

    engine = create_db_engine()

    with engine.connect() as connection:
        mode = connection.exec_driver_sql("PRAGMA journal_mode").scalar_one()

    assert mode.lower() == "wal"
