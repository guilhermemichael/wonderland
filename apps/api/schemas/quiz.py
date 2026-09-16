from datetime import datetime
from decimal import Decimal
from uuid import UUID
from pydantic import BaseModel


class QuizAnswerIn(BaseModel):
    question_id: str
    answer_id: str


class QuizAnswersResponse(BaseModel):
    session_id: UUID
    answers: dict[str, str]
    total_answered: int
    is_complete: bool


class QuizSubmissionResponse(BaseModel):
    session_id: UUID
    curious_score: int
    chaotic_score: int
    mysterious_score: int
    final_segment: str
    confidence: Decimal
    submitted_at: datetime
    scoring_version: str
