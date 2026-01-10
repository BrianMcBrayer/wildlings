from __future__ import annotations

import os

from sqlalchemy import event
from sqlmodel import Session, create_engine


def create_db_engine():
    database_url = os.getenv("DATABASE_URL", "sqlite:///./wildlings.db")
    connect_args = {}
    if database_url.startswith("sqlite"):
        connect_args = {"check_same_thread": False}
    engine = create_engine(database_url, connect_args=connect_args)

    if database_url.startswith("sqlite"):

        @event.listens_for(engine, "connect")
        def _set_sqlite_pragmas(dbapi_connection, _connection_record):
            cursor = dbapi_connection.cursor()
            try:
                cursor.execute("PRAGMA journal_mode=WAL")
            finally:
                cursor.close()

    return engine


engine = create_db_engine()


def get_session():
    with Session(engine) as session:
        yield session
