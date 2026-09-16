from datetime import datetime, timezone
from uuid import UUID, uuid4
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from database import get_db
from models.lead import Lead
from models.session import Session as SessionModel
from schemas.leads import LeadCreate, LeadResponse

router = APIRouter(tags=["leads"])


@router.post(
    "/api/v1/sessions/{public_session_id}/lead",
    response_model=LeadResponse,
    status_code=status.HTTP_201_CREATED,
)
@router.post(
    "/api/sessions/{public_session_id}/lead",
    response_model=LeadResponse,
    status_code=status.HTTP_201_CREATED,
)
def register_lead(
    public_session_id: UUID,
    payload: LeadCreate,
    db: Session = Depends(get_db),
) -> LeadResponse:
    """Capture lead with explicit privacy and marketing consent boundaries.
    
    PII Boundary: Email and name are stored strictly in the normalized leads table
    and never injected into generic campaign analytics events.
    """
    stmt = select(SessionModel).where(SessionModel.public_session_id == public_session_id)
    session = db.execute(stmt).scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    now = datetime.now(timezone.utc)
    consented_time = now if (payload.consent_marketing or payload.consent_privacy) else None

    new_lead = Lead(
        id=uuid4(),
        session_id=session.id,
        email=str(payload.email) if payload.email else None,
        name=payload.name,
        consent_marketing=payload.consent_marketing,
        consent_privacy=payload.consent_privacy,
        consented_at=consented_time,
        created_at=now,
        updated_at=now,
    )
    db.add(new_lead)

    session.current_stage = "converted"
    session.last_seen_at = now

    db.commit()
    db.refresh(new_lead)

    return LeadResponse(
        id=new_lead.id,
        session_id=session.public_session_id,
        email=new_lead.email,
        name=new_lead.name,
        consent_marketing=new_lead.consent_marketing,
        consent_privacy=new_lead.consent_privacy,
        consented_at=new_lead.consented_at,
        created_at=new_lead.created_at,
    )
