"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-10-09

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # users
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("email", sa.String(255), unique=True, nullable=False, index=True),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("role", sa.Enum("user", "admin", name="userrole"), nullable=False, server_default="user"),
        sa.Column("status", sa.Enum("active", "suspended", "deleted", name="userstatus"), nullable=False, server_default="active"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # user_api_keys
    op.create_table(
        "user_api_keys",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("key_hash", sa.String(255), nullable=False),
        sa.Column("name", sa.String(100), server_default="default"),
        sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # provider_keys
    op.create_table(
        "provider_keys",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("provider", sa.Enum("openai", "anthropic", "zhipu", name="providertype"), nullable=False, index=True),
        sa.Column("encrypted_key", sa.String(512), nullable=False),
        sa.Column("name", sa.String(100), server_default="default"),
        sa.Column("status", sa.Enum("active", "cooldown", "disabled", name="providerkeystatus"), nullable=False, server_default="active"),
        sa.Column("priority", sa.Integer(), server_default="0"),
        sa.Column("weight", sa.Integer(), server_default="1"),
        sa.Column("daily_limit", sa.Integer(), server_default="0"),
        sa.Column("monthly_limit", sa.Integer(), server_default="0"),
        sa.Column("requests_today", sa.Integer(), server_default="0"),
        sa.Column("tokens_today", sa.Integer(), server_default="0"),
        sa.Column("cooldown_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_error", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # accounts
    op.create_table(
        "accounts",
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("balance", sa.Float(), server_default="0"),
        sa.Column("credit_limit", sa.Float(), server_default="10000"),
        sa.Column("frozen", sa.Float(), server_default="0"),
        sa.Column("interest_rate", sa.Float(), server_default="0.0001"),
        sa.Column("debt_interest_rate", sa.Float(), server_default="0.0005"),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # transactions
    op.create_table(
        "transactions",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("type", sa.Enum("deposit", "withdraw", "borrow", "repay", "transfer_in", "transfer_out", "interest", name="transactiontype"), nullable=False),
        sa.Column("amount", sa.Float(), nullable=False),
        sa.Column("balance_after", sa.Float(), nullable=False),
        sa.Column("related_user_id", sa.Integer(), nullable=True),
        sa.Column("description", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # usage_logs
    op.create_table(
        "usage_logs",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("provider", sa.String(50), nullable=False),
        sa.Column("model", sa.String(100), nullable=False),
        sa.Column("prompt_tokens", sa.Integer(), server_default="0"),
        sa.Column("completion_tokens", sa.Integer(), server_default="0"),
        sa.Column("total_tokens", sa.Integer(), server_default="0"),
        sa.Column("cost", sa.Float(), server_default="0"),
        sa.Column("provider_key_id", sa.Integer(), nullable=True),
        sa.Column("latency_ms", sa.Integer(), server_default="0"),
        sa.Column("status", sa.Enum("success", "failed", "partial", name="usagestatus"), server_default="success"),
        sa.Column("request_id", sa.String(100), nullable=True),
        sa.Column("error_message", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_usage_logs_created_at", "usage_logs", ["created_at"])

    # quotas
    op.create_table(
        "quotas",
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("daily_limit", sa.Integer(), server_default="100000"),
        sa.Column("monthly_limit", sa.Integer(), server_default="3000000"),
        sa.Column("used_today", sa.Integer(), server_default="0"),
        sa.Column("used_this_month", sa.Integer(), server_default="0"),
        sa.Column("reset_daily_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("reset_monthly_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # pricing
    op.create_table(
        "pricing",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("provider", sa.String(50), nullable=False, index=True),
        sa.Column("model", sa.String(100), nullable=False, index=True),
        sa.Column("input_price_per_1k", sa.Float(), server_default="0"),
        sa.Column("output_price_per_1k", sa.Float(), server_default="0"),
        sa.Column("currency", sa.String(10), server_default="USD"),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("pricing")
    op.drop_table("quotas")
    op.drop_index("ix_usage_logs_created_at", table_name="usage_logs")
    op.drop_table("usage_logs")
    op.drop_table("transactions")
    op.drop_table("accounts")
    op.drop_table("provider_keys")
    op.drop_table("user_api_keys")
    op.drop_table("users")
