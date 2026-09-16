from datetime import datetime, timedelta, timezone
from uuid import UUID, uuid4
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from config import SESSION_EXPIRATION_HOURS
from database import ensure_default_campaign, get_db
from models.campaign import Campaign
from models.session import Session as SessionModel
from schemas.sessions import SessionCreate, SessionResponse, SessionUpdate

router = APIRouter(tags=["sessions"])


def _to_response(session: SessionModel, campaign_slug: str) -> SessionResponse:
    now = datetime.now(timezone.utc)
    expires = session.expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    is_expired = now > expires
    return SessionResponse(
        public_session_id=session.public_session_id,
        campaign_slug=campaign_slug,
        current_stage=session.current_stage,
        selected_path=session.selected_path,
        entry_affinity=session.entry_affinity,
        final_segment=session.final_segment,
        last_client_sequence=session.last_client_sequence,
        started_at=session.started_at,
        last_seen_at=session.last_seen_at,
        completed_at=session.completed_at,
        expires_at=session.expires_at,
        is_expired=is_expired,
    )


@router.post("/api/v1/sessions", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
@router.post("/api/sessions", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
def create_session(payload: SessionCreate, db: Session = Depends(get_db)) -> SessionResponse:
    """Create a new durable session."""
    # Find campaign by slug or default
    campaign_stmt = select(Campaign).where(Campaign.slug == payload.campaign_slug)
    campaign = db.execute(campaign_stmt).scalar_one_or_none()
    if not campaign:
        campaign = ensure_default_campaign(db)

    now = datetime.now(timezone.utc)
    expires = now + timedelta(hours=SESSION_EXPIRATION_HOURS)

    new_session = SessionModel(
        id=uuid4(),
        campaign_id=campaign.id,
        public_session_id=uuid4(),
        current_stage="landing",
        locale=payload.locale,
        device_type=payload.device_type,
        utm_source=payload.utm_source,
        utm_medium=payload.utm_medium,
        utm_campaign=payload.utm_campaign,
        utm_content=payload.utm_content,
        utm_term=payload.utm_term,
        referrer=payload.referrer,
        last_client_sequence=0,
        started_at=now,
        last_seen_at=now,
        expires_at=expires,
        created_at=now,
        updated_at=now,
    )

    db.add(new_session)
    db.commit()
    db.refresh(new_session)

    return _to_response(new_session, campaign.slug)


@router.get("/api/v1/sessions/{public_session_id}", response_model=SessionResponse)
@router.get("/api/sessions/{public_session_id}", response_model=SessionResponse)
def get_session(public_session_id: UUID, db: Session = Depends(get_db)) -> SessionResponse:
    """Resume / retrieve an existing session by public identifier."""
    stmt = select(SessionModel).where(SessionModel.public_session_id == public_session_id)
    session = db.execute(stmt).scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    # Update last_seen_at on resume
    now = datetime.now(timezone.utc)
    session.last_seen_at = now
    db.commit()

    campaign_stmt = select(Campaign.slug).where(Campaign.id == session.campaign_id)
    slug = db.execute(campaign_stmt).scalar_one_or_none() or "wonderland"

    return _to_response(session, slug)


@router.patch("/api/v1/sessions/{public_session_id}", response_model=SessionResponse)
@router.patch("/api/sessions/{public_session_id}", response_model=SessionResponse)
def update_session(public_session_id: UUID, payload: SessionUpdate, db: Session = Depends(get_db)) -> SessionResponse:
    """Update session state (stage, path choice, entry affinity)."""
    stmt = select(SessionModel).where(SessionModel.public_session_id == public_session_id)
    session = db.execute(stmt).scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    now = datetime.now(timezone.utc)
    session.last_seen_at = now

    if payload.current_stage is not None:
        session.current_stage = payload.current_stage
    if payload.selected_path is not None:
        session.selected_path = payload.selected_path
        # If entry_affinity not set, infer from path choice
        if not session.entry_affinity:
            path_to_affinity = {"rabbit": "curious", "hatter": "chaotic", "cheshire": "mysterious"}
            session.entry_affinity = path_to_affinity.get(payload.selected_path)
    if payload.entry_affinity is not None:
        session.entry_affinity = payload.entry_affinity
    if payload.final_segment is not None:
        # Crucial: final_segment never overwrites entry_affinity
        session.final_segment = payload.final_segment
    if payload.completed is True:
        session.completed_at = now

    db.commit()
    db.refresh(session)

    campaign_stmt = select(Campaign.slug).where(Campaign.id == session.campaign_id)
    slug = db.execute(campaign_stmt).scalar_one_or_none() or "wonderland"

    return _to_response(session, slug)
