from datetime import datetime
from typing import Any, Literal
from uuid import UUID
from pydantic import BaseModel, Field

EventName = Literal[
    "page_view",
    "cta_click",
    "rabbit_hole_started",
    "scroll_depth",
    "rabbit_hole_completed",
    "rabbit_hole_skipped",
    "path_selected",
    "cheshire_started",
    "quiz_started",
    "quiz_question_viewed",
    "quiz_answer_confirmed",
    "quiz_resumed",
    "quiz_submitted",
    "quiz_result_viewed",
    "cheshire_completed",
]


class EventIn(BaseModel):
    client_event_id: UUID
    event_name: EventName
    page: str
    client_sequence: int = Field(ge=1)
    occurred_at: datetime
    session_id: UUID | None = None
    surface: str | None = None
    selected_path: str | None = None
    final_segment: str | None = None
    properties: dict[str, Any] = Field(default_factory=dict)


class EventOut(EventIn):
    event_id: UUID
    received_at: datetime
    schema_version: str = "1.1"
