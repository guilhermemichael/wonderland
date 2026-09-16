from datetime import datetime, timezone
from uuid import UUID, uuid4
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from database import get_db
from models.quiz import QuizAnswer, QuizSubmission
from models.session import Session as SessionModel
from schemas.quiz import QuizAnswerIn, QuizAnswersResponse, QuizSubmissionResponse
from scoring import (
    VALID_QUESTIONS,
    QuizValidationError,
    evaluate_quiz_submission,
    validate_question_answer,
)

router = APIRouter(tags=["quiz"])


def _get_session_or_404(public_session_id: UUID, db: Session) -> SessionModel:
    stmt = select(SessionModel).where(SessionModel.public_session_id == public_session_id)
    session = db.execute(stmt).scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    return session


@router.post(
    "/api/v1/sessions/{public_session_id}/quiz/answers",
    response_model=QuizAnswersResponse,
    status_code=status.HTTP_200_OK,
)
@router.post(
    "/api/sessions/{public_session_id}/quiz/answers",
    response_model=QuizAnswersResponse,
    status_code=status.HTTP_200_OK,
)
def save_quiz_answer(
    public_session_id: UUID,
    payload: QuizAnswerIn,
    db: Session = Depends(get_db),
) -> QuizAnswersResponse:
    """Record or update a single quiz answer for partial progress recovery."""
    session = _get_session_or_404(public_session_id, db)

    # Validate question and answer IDs
    try:
        validate_question_answer(payload.question_id, payload.answer_id)
    except QuizValidationError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))

    now = datetime.now(timezone.utc)
    session.last_seen_at = now
    if session.current_stage in ("landing", "rabbit_hole", "crossroads"):
        session.current_stage = "quiz"

    # Upsert answer: check if answer for question_id already exists in this session
    stmt = select(QuizAnswer).where(
        QuizAnswer.session_id == session.id,
        QuizAnswer.question_id == payload.question_id,
    )
    existing_answer = db.execute(stmt).scalar_one_or_none()
    if existing_answer:
        existing_answer.answer_id = payload.answer_id
        existing_answer.answered_at = now
        existing_answer.updated_at = now
    else:
        new_answer = QuizAnswer(
            id=uuid4(),
            session_id=session.id,
            question_id=payload.question_id,
            answer_id=payload.answer_id,
            answered_at=now,
            created_at=now,
            updated_at=now,
        )
        db.add(new_answer)

    db.commit()

    # Return all saved answers for recovery
    all_answers_stmt = select(QuizAnswer).where(QuizAnswer.session_id == session.id)
    answers_rows = db.execute(all_answers_stmt).scalars().all()
    answers_dict = {a.question_id: a.answer_id for a in answers_rows}

    return QuizAnswersResponse(
        session_id=session.public_session_id,
        answers=answers_dict,
        total_answered=len(answers_dict),
        is_complete=all(q in answers_dict for q in VALID_QUESTIONS),
    )


@router.get(
    "/api/v1/sessions/{public_session_id}/quiz/answers",
    response_model=QuizAnswersResponse,
)
@router.get(
    "/api/sessions/{public_session_id}/quiz/answers",
    response_model=QuizAnswersResponse,
)
def get_quiz_answers(
    public_session_id: UUID,
    db: Session = Depends(get_db),
) -> QuizAnswersResponse:
    """Retrieve saved partial answers for session resume/recovery."""
    session = _get_session_or_404(public_session_id, db)

    stmt = select(QuizAnswer).where(QuizAnswer.session_id == session.id)
    answers_rows = db.execute(stmt).scalars().all()
    answers_dict = {a.question_id: a.answer_id for a in answers_rows}

    return QuizAnswersResponse(
        session_id=session.public_session_id,
        answers=answers_dict,
        total_answered=len(answers_dict),
        is_complete=all(q in answers_dict for q in VALID_QUESTIONS),
    )


@router.post(
    "/api/v1/sessions/{public_session_id}/quiz/submit",
    response_model=QuizSubmissionResponse,
    status_code=status.HTTP_200_OK,
)
@router.post(
    "/api/sessions/{public_session_id}/quiz/submit",
    response_model=QuizSubmissionResponse,
    status_code=status.HTTP_200_OK,
)
def submit_quiz(
    public_session_id: UUID,
    db: Session = Depends(get_db),
) -> QuizSubmissionResponse:
    """Authoritative quiz submission, scoring, tie-breaking, and idempotent result recording."""
    session = _get_session_or_404(public_session_id, db)

    # Check for existing submission (idempotency check)
    sub_stmt = select(QuizSubmission).where(QuizSubmission.session_id == session.id)
    existing_sub = db.execute(sub_stmt).scalar_one_or_none()
    if existing_sub:
        return QuizSubmissionResponse(
            session_id=session.public_session_id,
            curious_score=existing_sub.curious_score,
            chaotic_score=existing_sub.chaotic_score,
            mysterious_score=existing_sub.mysterious_score,
            final_segment=existing_sub.final_segment,
            confidence=existing_sub.confidence,
            submitted_at=existing_sub.submitted_at,
            scoring_version=existing_sub.scoring_version,
        )

    # Fetch all persisted answers
    stmt = select(QuizAnswer).where(QuizAnswer.session_id == session.id)
    answers_rows = db.execute(stmt).scalars().all()
    answers_dict = {a.question_id: a.answer_id for a in answers_rows}

    try:
        evaluation = evaluate_quiz_submission(answers_dict)
    except QuizValidationError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))

    now = datetime.now(timezone.utc)
    submission = QuizSubmission(
        id=uuid4(),
        session_id=session.id,
        curious_score=evaluation["curious_score"],
        chaotic_score=evaluation["chaotic_score"],
        mysterious_score=evaluation["mysterious_score"],
        final_segment=evaluation["final_segment"],
        confidence=evaluation["confidence"],
        submitted_at=now,
        scoring_version=evaluation["scoring_version"],
    )
    db.add(submission)

    # Update session final_segment and stage
    session.final_segment = evaluation["final_segment"]
    session.current_stage = "result"
    session.last_seen_at = now

    db.commit()
    db.refresh(submission)

    return QuizSubmissionResponse(
        session_id=session.public_session_id,
        curious_score=submission.curious_score,
        chaotic_score=submission.chaotic_score,
        mysterious_score=submission.mysterious_score,
        final_segment=submission.final_segment,
        confidence=submission.confidence,
        submitted_at=submission.submitted_at,
        scoring_version=submission.scoring_version,
    )
