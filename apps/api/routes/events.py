from datetime import datetime, timezone
from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from database import ensure_default_campaign, get_db
from models.campaign import Campaign
from models.event import CampaignEvent
from models.session import Session as SessionModel
from schemas.events import EventIn, EventOut

router = APIRouter(tags=["events"])


@router.post("/api/v1/events", response_model=EventOut, status_code=status.HTTP_202_ACCEPTED)
@router.post("/api/events", response_model=EventOut, status_code=status.HTTP_202_ACCEPTED)
def ingest_event(event: EventIn, db: Session = Depends(get_db)) -> EventOut:
    """Ingest analytics event with persistent database-level idempotency by client_event_id."""
    # 1. Check if event already exists (idempotency check)
    stmt = select(CampaignEvent).where(CampaignEvent.client_event_id == event.client_event_id)
    existing = db.execute(stmt).scalar_one_or_none()
    if existing:
        return EventOut(
            client_event_id=existing.client_event_id,
            event_name=existing.event_name,  # type: ignore[arg-type]
            page=existing.page,
            client_sequence=existing.client_sequence,
            occurred_at=existing.occurred_at_client or existing.received_at_server,
            session_id=existing.session_id,
            surface=existing.surface,
            selected_path=existing.selected_path,
            final_segment=existing.final_segment,
            properties=existing.properties,
            event_id=existing.id,
            received_at=existing.received_at_server,
            schema_version=existing.event_version,
        )

    # 2. Resolve campaign
    default_campaign = ensure_default_campaign(db)

    # 3. Resolve session if session_id provided
    session_row = None
    if event.session_id:
        # Match by id or public_session_id
        session_stmt = select(SessionModel).where(
            (SessionModel.id == event.session_id) | (SessionModel.public_session_id == event.session_id)
        )
        session_row = db.execute(session_stmt).scalar_one_or_none()

    received_time = datetime.now(timezone.utc)
    new_event_id = uuid4()
    new_event = CampaignEvent(
        id=new_event_id,
        client_event_id=event.client_event_id,
        campaign_id=default_campaign.id,
        session_id=session_row.id if session_row else None,
        event_name=event.event_name,
        event_version="1.1",
        client_sequence=event.client_sequence,
        occurred_at_client=event.occurred_at,
        received_at_server=received_time,
        page=event.page,
        surface=event.surface,
        selected_path=event.selected_path,
        final_segment=event.final_segment,
        properties=event.properties,
        created_at=received_time,
    )

    db.add(new_event)

    # If session matched, update sequence and last_seen_at
    if session_row:
        session_row.last_seen_at = received_time
        if event.client_sequence > session_row.last_client_sequence:
            session_row.last_client_sequence = event.client_sequence
        if event.selected_path and not session_row.selected_path:
            session_row.selected_path = event.selected_path

    try:
        db.commit()
    except Exception as exc:
        # Concurrent insert with same client_event_id collided at the DB UNIQUE constraint
        db.rollback()
        import time
        concur_existing = None
        for _ in range(5):
            conflict_stmt = select(CampaignEvent).where(CampaignEvent.client_event_id == event.client_event_id)
            concur_existing = db.execute(conflict_stmt).scalar_one_or_none()
            if concur_existing:
                break
            time.sleep(0.05)

        if concur_existing:
            return EventOut(
                client_event_id=concur_existing.client_event_id,
                event_name=concur_existing.event_name,  # type: ignore[arg-type]
                page=concur_existing.page,
                client_sequence=concur_existing.client_sequence,
                occurred_at=concur_existing.occurred_at_client or concur_existing.received_at_server,
                session_id=concur_existing.session_id,
                surface=concur_existing.surface,
                selected_path=concur_existing.selected_path,
                final_segment=concur_existing.final_segment,
                properties=concur_existing.properties,
                event_id=concur_existing.id,
                received_at=concur_existing.received_at_server,
                schema_version=concur_existing.event_version,
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database integrity conflict during event ingestion: {exc}",
        )

    return EventOut(
        client_event_id=event.client_event_id,
        event_name=event.event_name,
        page=event.page,
        client_sequence=event.client_sequence,
        occurred_at=event.occurred_at,
        session_id=session_row.id if session_row else None,
        surface=event.surface,
        selected_path=event.selected_path,
        final_segment=event.final_segment,
        properties=event.properties,
        event_id=new_event_id,
        received_at=received_time,
        schema_version="1.1",
    )
