import uuid
from datetime import datetime, timezone
from typing import Any
from sqlalchemy import DateTime, ForeignKey, Integer, String, Uuid, JSON
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from models.base import Base


class CampaignEvent(Base):
    __tablename__ = "campaign_events"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_event_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), unique=True, nullable=False, index=True
    )
    campaign_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("campaigns.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    session_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("sessions.id", ondelete="SET NULL"), nullable=True, index=True
    )

    event_name: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    event_version: Mapped[str] = mapped_column(String(16), nullable=False, default="1.1")
    client_sequence: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    occurred_at_client: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    received_at_server: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), index=True
    )

    page: Mapped[str] = mapped_column(String(255), nullable=False)
    surface: Mapped[str | None] = mapped_column(String(64), nullable=True)
    selected_path: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)
    final_segment: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)

    properties: Mapped[dict[str, Any]] = mapped_column(
        JSONB().with_variant(JSON(), "sqlite"),
        nullable=False,
        default=dict,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    campaign = relationship("Campaign", back_populates="events")
    session = relationship("Session", back_populates="events")
