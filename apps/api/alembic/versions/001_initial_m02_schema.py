"""Initial Milestone 02 schema: campaigns, sessions, session_experiments, campaign_events, quiz_answers, quiz_submissions, leads

Revision ID: 001_initial_m02_schema
Revises: None
Create Date: 2026-09-16 19:45:00.000000

"""
from typing import Sequence, Union
import uuid
from datetime import datetime, timezone
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

# revision identifiers, used by Alembic.
revision: str = "001_initial_m02_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Enable extensions if on PostgreSQL
    bind = op.get_bind()
    dialect = bind.dialect.name
    if dialect == "postgresql":
        op.execute("CREATE EXTENSION IF NOT EXISTS citext;")
        op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto;")

    # 2. campaigns table
    op.create_table(
        "campaigns",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("slug", sa.String(64), nullable=False, unique=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("status", sa.String(32), nullable=False, server_default="active"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_campaigns_slug", "campaigns", ["slug"])

    # 3. sessions table
    op.create_table(
        "sessions",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("campaign_id", sa.Uuid(as_uuid=True), sa.ForeignKey("campaigns.id", ondelete="CASCADE"), nullable=False),
        sa.Column("public_session_id", sa.Uuid(as_uuid=True), nullable=False, unique=True),
        sa.Column("current_stage", sa.String(32), nullable=False, server_default="landing"),
        sa.Column("selected_path", sa.String(32), nullable=True),
        sa.Column("entry_affinity", sa.String(32), nullable=True),
        sa.Column("final_segment", sa.String(32), nullable=True),
        sa.Column("locale", sa.String(16), nullable=True),
        sa.Column("device_type", sa.String(32), nullable=True),
        sa.Column("utm_source", sa.String(128), nullable=True),
        sa.Column("utm_medium", sa.String(128), nullable=True),
        sa.Column("utm_campaign", sa.String(128), nullable=True),
        sa.Column("utm_content", sa.String(128), nullable=True),
        sa.Column("utm_term", sa.String(128), nullable=True),
        sa.Column("referrer", sa.String(512), nullable=True),
        sa.Column("last_client_sequence", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "current_stage IN ('landing', 'rabbit_hole', 'crossroads', 'quiz', 'result', 'converted')",
            name="check_session_valid_stage",
        ),
    )
    op.create_index("ix_sessions_campaign_id", "sessions", ["campaign_id"])
    op.create_index("ix_sessions_public_session_id", "sessions", ["public_session_id"])

    # 4. session_experiments table
    op.create_table(
        "session_experiments",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("session_id", sa.Uuid(as_uuid=True), sa.ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("experiment_key", sa.String(64), nullable=False),
        sa.Column("variant_key", sa.String(64), nullable=False),
        sa.Column("assigned_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("session_id", "experiment_key", name="uq_session_experiment_key"),
    )
    op.create_index("ix_session_experiments_session_id", "session_experiments", ["session_id"])

    # 5. campaign_events table
    json_col = JSONB().with_variant(sa.JSON(), "sqlite")
    op.create_table(
        "campaign_events",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("client_event_id", sa.Uuid(as_uuid=True), nullable=False, unique=True),
        sa.Column("campaign_id", sa.Uuid(as_uuid=True), sa.ForeignKey("campaigns.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("session_id", sa.Uuid(as_uuid=True), sa.ForeignKey("sessions.id", ondelete="SET NULL"), nullable=True),
        sa.Column("event_name", sa.String(64), nullable=False),
        sa.Column("event_version", sa.String(16), nullable=False, server_default="1.1"),
        sa.Column("client_sequence", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("occurred_at_client", sa.DateTime(timezone=True), nullable=True),
        sa.Column("received_at_server", sa.DateTime(timezone=True), nullable=False),
        sa.Column("page", sa.String(255), nullable=False),
        sa.Column("surface", sa.String(64), nullable=True),
        sa.Column("selected_path", sa.String(32), nullable=True),
        sa.Column("final_segment", sa.String(32), nullable=True),
        sa.Column("properties", json_col, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_campaign_events_client_event_id", "campaign_events", ["client_event_id"])
    op.create_index("ix_campaign_events_session_id", "campaign_events", ["session_id"])
    op.create_index("ix_campaign_events_campaign_id", "campaign_events", ["campaign_id"])
    op.create_index("ix_campaign_events_event_name", "campaign_events", ["event_name"])
    op.create_index("ix_campaign_events_received_at_server", "campaign_events", ["received_at_server"])
    op.create_index("ix_campaign_events_selected_path", "campaign_events", ["selected_path"])
    op.create_index("ix_campaign_events_final_segment", "campaign_events", ["final_segment"])

    # 6. quiz_answers table
    op.create_table(
        "quiz_answers",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("session_id", sa.Uuid(as_uuid=True), sa.ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("question_id", sa.String(16), nullable=False),
        sa.Column("answer_id", sa.String(32), nullable=False),
        sa.Column("answered_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("session_id", "question_id", name="uq_session_quiz_question"),
    )
    op.create_index("ix_quiz_answers_session_id", "quiz_answers", ["session_id"])

    # 7. quiz_submissions table
    op.create_table(
        "quiz_submissions",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("session_id", sa.Uuid(as_uuid=True), sa.ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("curious_score", sa.Integer(), nullable=False),
        sa.Column("chaotic_score", sa.Integer(), nullable=False),
        sa.Column("mysterious_score", sa.Integer(), nullable=False),
        sa.Column("final_segment", sa.String(32), nullable=False),
        sa.Column("confidence", sa.Numeric(5, 4), nullable=False),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("scoring_version", sa.String(16), nullable=False, server_default="1.0"),
    )
    op.create_index("ix_quiz_submissions_session_id", "quiz_submissions", ["session_id"])

    # 8. leads table
    op.create_table(
        "leads",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("session_id", sa.Uuid(as_uuid=True), sa.ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("name", sa.String(255), nullable=True),
        sa.Column("consent_marketing", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("consent_privacy", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("consented_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_leads_session_id", "leads", ["session_id"])
    op.create_index("ix_leads_email", "leads", ["email"])

    # 9. Deterministic Seed for Wonderland Campaign
    now = datetime.now(timezone.utc)
    campaigns_table = sa.table(
        "campaigns",
        sa.column("id", sa.Uuid(as_uuid=True)),
        sa.column("slug", sa.String),
        sa.column("name", sa.String),
        sa.column("status", sa.String),
        sa.column("created_at", sa.DateTime(timezone=True)),
        sa.column("updated_at", sa.DateTime(timezone=True)),
    )
    op.bulk_insert(
        campaigns_table,
        [
            {
                "id": uuid.UUID("00000000-0000-0000-0000-000000000001"),
                "slug": "wonderland",
                "name": "WONDERLAND — Follow the White Rabbit",
                "status": "active",
                "created_at": now,
                "updated_at": now,
            }
        ],
    )


def downgrade() -> None:
    op.drop_table("leads")
    op.drop_table("quiz_submissions")
    op.drop_table("quiz_answers")
    op.drop_table("campaign_events")
    op.drop_table("session_experiments")
    op.drop_table("sessions")
    op.drop_table("campaigns")
