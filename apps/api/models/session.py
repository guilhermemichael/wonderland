import uuid
from datetime import datetime, timezone
from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Integer, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from models.base import Base

VALID_STAGES = ("landing", "rabbit_hole", "crossroads", "quiz", "result", "converted")
VALID_PATHS = ("rabbit", "hatter", "cheshire")
VALID_SEGMENTS = ("curious", "chaotic", "mysterious")


class Session(Base):
    __tablename__ = "sessions"
    __table_args__ = (
        CheckConstraint(f"current_stage IN {VALID_STAGES}", name="check_session_valid_stage"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    campaign_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("campaigns.id", ondelete="CASCADE"), nullable=False, index=True
    )
    public_session_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), unique=True, nullable=False, default=uuid.uuid4, index=True
    )

    current_stage: Mapped[str] = mapped_column(String(32), nullable=False, default="landing")
    selected_path: Mapped[str | None] = mapped_column(String(32), nullable=True)
    entry_affinity: Mapped[str | None] = mapped_column(String(32), nullable=True)
    final_segment: Mapped[str | None] = mapped_column(String(32), nullable=True)

    locale: Mapped[str | None] = mapped_column(String(16), nullable=True)
    device_type: Mapped[str | None] = mapped_column(String(32), nullable=True)
    utm_source: Mapped[str | None] = mapped_column(String(128), nullable=True)
    utm_medium: Mapped[str | None] = mapped_column(String(128), nullable=True)
    utm_campaign: Mapped[str | None] = mapped_column(String(128), nullable=True)
    utm_content: Mapped[str | None] = mapped_column(String(128), nullable=True)
    utm_term: Mapped[str | None] = mapped_column(String(128), nullable=True)
    referrer: Mapped[str | None] = mapped_column(String(512), nullable=True)

    last_client_sequence: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    last_seen_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    campaign = relationship("Campaign", back_populates="sessions")
    experiments = relationship("SessionExperiment", back_populates="session", cascade="all, delete-orphan")
    events = relationship("CampaignEvent", back_populates="session")
    quiz_answers = relationship("QuizAnswer", back_populates="session", cascade="all, delete-orphan")
    quiz_submission = relationship("QuizSubmission", back_populates="session", uselist=False, cascade="all, delete-orphan")
    leads = relationship("Lead", back_populates="session", cascade="all, delete-orphan")
