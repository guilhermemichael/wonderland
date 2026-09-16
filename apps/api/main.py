import os
from datetime import datetime, timezone
from threading import Lock
from typing import Any, Literal
from uuid import UUID, uuid4

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(title="WONDERLAND API", version="0.1.1", docs_url="/api/docs")
cors_origins = [origin.strip() for origin in os.getenv("API_CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",") if origin.strip()]
app.add_middleware(CORSMiddleware, allow_origins=cors_origins, allow_methods=["GET", "POST"], allow_headers=["*"])


class EventIn(BaseModel):
    client_event_id: UUID
    event_name: Literal[
        "page_view", "cta_click", "rabbit_hole_started", "scroll_depth",
        "rabbit_hole_completed", "rabbit_hole_skipped", "path_selected"
    ]
    page: str
    client_sequence: int = Field(ge=1)
    occurred_at: datetime
    session_id: UUID | None = None
    properties: dict[str, Any] = Field(default_factory=dict)


class EventOut(EventIn):
    event_id: UUID
    received_at: datetime
    schema_version: str = "1.1"


# Milestone 01 uses memory only. Durable uniqueness belongs to PostgreSQL in M02.
events: dict[UUID, EventOut] = {}
events_lock = Lock()


@app.get("/api/v1/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "wonderland-api"}


@app.post("/api/v1/events", response_model=EventOut, status_code=202)
def ingest_event(event: EventIn) -> EventOut:
    with events_lock:
        existing = events.get(event.client_event_id)
        if existing:
            return existing
        stored = EventOut(**event.model_dump(), event_id=uuid4(), received_at=datetime.now(timezone.utc))
        events[event.client_event_id] = stored
        return stored
