from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

SessionStage = Literal["landing", "rabbit_hole", "crossroads", "quiz", "result", "converted"]
PathChoice = Literal["rabbit", "hatter", "cheshire"]
SegmentAffinity = Literal["curious", "chaotic", "mysterious"]


class SessionCreate(BaseModel):
    campaign_slug: str = Field(default="wonderland", min_length=1, max_length=64)
    locale: str | None = Field(default=None, max_length=16)
    device_type: str | None = Field(default=None, max_length=32)
    utm_source: str | None = Field(default=None, max_length=128)
    utm_medium: str | None = Field(default=None, max_length=128)
    utm_campaign: str | None = Field(default=None, max_length=128)
    utm_content: str | None = Field(default=None, max_length=128)
    utm_term: str | None = Field(default=None, max_length=128)
    referrer: str | None = Field(default=None, max_length=512)


class SessionUpdate(BaseModel):
    current_stage: SessionStage | None = None
    selected_path: PathChoice | None = None
    entry_affinity: SegmentAffinity | None = None
    final_segment: SegmentAffinity | None = None
    completed: bool | None = None


class SessionResponse(BaseModel):
    public_session_id: UUID
    campaign_slug: str
    current_stage: str
    selected_path: str | None = None
    entry_affinity: str | None = None
    final_segment: str | None = None
    last_client_sequence: int
    started_at: datetime
    last_seen_at: datetime
    completed_at: datetime | None = None
    expires_at: datetime
    is_expired: bool
