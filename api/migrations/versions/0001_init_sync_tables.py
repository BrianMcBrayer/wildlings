"""init sync tables

Revision ID: 0001_init_sync_tables
Revises:
Create Date: 2026-01-11 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "0001_init_sync_tables"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "log",
        sa.Column("id", sa.String(), primary_key=True, nullable=False),
        sa.Column("start_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("note", sa.String(), nullable=True),
        sa.Column("updated_at_server", sa.DateTime(timezone=True), nullable=False),
        sa.Column("deleted_at_server", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table(
        "syncop",
        sa.Column("device_id", sa.String(), nullable=False),
        sa.Column("op_id", sa.String(), nullable=False),
        sa.Column("entity", sa.String(), nullable=False),
        sa.Column("action", sa.String(), nullable=False),
        sa.Column("applied_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("device_id", "op_id"),
    )


def downgrade() -> None:
    op.drop_table("syncop")
    op.drop_table("log")
