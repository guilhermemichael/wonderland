from datetime import datetime, timezone
from typing import Any, Literal
from uuid import UUID, uuid4
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(title="WONDERLAND API", version="0.1.0", docs_url="/api/docs")
cors_origins = [origin.strip() for origin in os.getenv("API_CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


class EventIn(BaseModel):
    event_name: Literal[
        "page_view", "cta_click", "rabbit_hole_started", "scroll_depth",
        "rabbit_hole_completed", "path_selected", "quiz_interaction", "conversion_submit"
    ]
    page: str
    client_sequence: int = Field(ge=1)
    occurred_at: datetime
    session_id: UUID | None = None
    properties: dict[str, Any] = Field(default_factory=dict)


class EventOut(EventIn):
    event_id: UUID
    received_at: datetime
    schema_version: str = "1.0"


events: dict[tuple[str, int], EventOut] = {}


@app.get("/api/v1/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "wonderland-api"}


@app.post("/api/v1/events", response_model=EventOut, status_code=202)
def ingest_event(event: EventIn) -> EventOut:
    session_key = str(event.session_id or "anonymous")
    dedupe_key = (session_key, event.client_sequence)
    if dedupe_key in events:
        return events[dedupe_key]
    stored = EventOut(
        **event.model_dump(),
        event_id=uuid4(),
        received_at=datetime.now(timezone.utc),
    )
    events[dedupe_key] = stored
    return stored
