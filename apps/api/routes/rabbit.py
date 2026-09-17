import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Session as SessionModel
from models.rabbit_progress import RabbitProgress
from schemas.rabbit_progress import RabbitProgressUpdate, RabbitProgressResponse

router = APIRouter(prefix="/api/v1/sessions", tags=["Rabbit"])

@router.get("/{session_id}/rabbit", response_model=RabbitProgressResponse)
def get_rabbit_progress(session_id: uuid.UUID, db: Session = Depends(get_db)):
    session_obj = db.query(SessionModel).filter(SessionModel.public_session_id == session_id).first()
    if not session_obj:
        raise HTTPException(status_code=404, detail="Session not found")

    progress = db.query(RabbitProgress).filter(RabbitProgress.session_id == session_obj.id).first()
    if not progress:
        progress = RabbitProgress(session_id=session_obj.id)
        db.add(progress)
        db.commit()
        db.refresh(progress)

    return progress

@router.post("/{session_id}/rabbit", response_model=RabbitProgressResponse)
def update_rabbit_progress(
    session_id: uuid.UUID,
    payload: RabbitProgressUpdate,
    db: Session = Depends(get_db)
):
    session_obj = db.query(SessionModel).filter(SessionModel.public_session_id == session_id).first()
    if not session_obj:
        raise HTTPException(status_code=404, detail="Session not found")

    progress = db.query(RabbitProgress).filter(RabbitProgress.session_id == session_obj.id).first()
    if not progress:
        progress = RabbitProgress(session_id=session_obj.id)
        db.add(progress)

    if payload.has_taken_watch is not None:
        progress.has_taken_watch = payload.has_taken_watch
    if payload.has_followed_trail is not None:
        progress.has_followed_trail = payload.has_followed_trail
    if payload.has_reached_threshold is not None:
        progress.has_reached_threshold = payload.has_reached_threshold

    db.commit()
    db.refresh(progress)

    return progress
