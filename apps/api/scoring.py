"""Authoritative server-side quiz scoring and deterministic tie-breaking for WONDERLAND."""

from decimal import Decimal
from typing import Literal

Segment = Literal["curious", "chaotic", "mysterious"]

VALID_QUESTIONS = ("q1", "q2", "q3", "q4")

# Mapping of question_id -> {answer_id: (segment, points)}
QUIZ_SCORING_MAP: dict[str, dict[str, tuple[Segment, int]]] = {
    "q1": {
        "q1_a": ("curious", 3),
        "q1_b": ("chaotic", 3),
        "q1_c": ("mysterious", 3),
    },
    "q2": {
        "q2_a": ("curious", 2),
        "q2_b": ("chaotic", 2),
        "q2_c": ("mysterious", 2),
    },
    "q3": {
        "q3_a": ("curious", 2),
        "q3_b": ("chaotic", 2),
        "q3_c": ("mysterious", 2),
    },
    "q4": {
        "q4_a": ("curious", 4),
        "q4_b": ("chaotic", 4),
        "q4_c": ("mysterious", 4),
    },
}

TIE_BREAKER_HIERARCHY = ("q4", "q1", "q2", "q3")
MAX_POSSIBLE_SCORE = 11


class QuizValidationError(ValueError):
    """Raised when quiz question/answer IDs are invalid or mismatched."""


def validate_question_answer(question_id: str, answer_id: str) -> None:
    """Validate that question_id exists and answer_id belongs to that question."""
    if question_id not in QUIZ_SCORING_MAP:
        raise QuizValidationError(f"Unknown question_id: '{question_id}'. Must be one of {VALID_QUESTIONS}")
    valid_answers = QUIZ_SCORING_MAP[question_id]
    if answer_id not in valid_answers:
        raise QuizValidationError(
            f"Invalid answer_id '{answer_id}' for question '{question_id}'. Expected one of {list(valid_answers.keys())}"
        )


def calculate_quiz_scores(answers: dict[str, str]) -> dict[str, int]:
    """Calculate raw scores for curious, chaotic, and mysterious from a complete or partial answer set."""
    scores: dict[str, int] = {"curious": 0, "chaotic": 0, "mysterious": 0}
    for q_id, a_id in answers.items():
        validate_question_answer(q_id, a_id)
        segment, points = QUIZ_SCORING_MAP[q_id][a_id]
        scores[segment] += points
    return scores


def resolve_tie(tied_segments: list[Segment], answers: dict[str, str]) -> Segment:
    """Deterministically resolve ties following the strict hierarchy: Q4 -> Q1 -> Q2 -> Q3."""
    for q_id in TIE_BREAKER_HIERARCHY:
        if q_id in answers:
            chosen_answer = answers[q_id]
            favored_segment, _ = QUIZ_SCORING_MAP[q_id][chosen_answer]
            if favored_segment in tied_segments:
                return favored_segment

    # Fallback to alphabetical order if somehow unresolved (mathematically unreachable with complete answers)
    return sorted(tied_segments)[0]


def evaluate_quiz_submission(answers: dict[str, str]) -> dict:
    """Evaluate a complete quiz submission with authoritative scoring, deterministic tie-breaking, and confidence.
    
    Returns:
        dict containing curious_score, chaotic_score, mysterious_score,
        final_segment, confidence (Decimal), and scoring_version.
    """
    # Verify all 4 required questions are present
    missing = [q for q in VALID_QUESTIONS if q not in answers]
    if missing:
        raise QuizValidationError(f"Incomplete quiz answers. Missing questions: {missing}")

    scores = calculate_quiz_scores(answers)
    sorted_scores = sorted(scores.values(), reverse=True)
    top_score = sorted_scores[0]
    second_score = sorted_scores[1]

    # Find candidates with the top score
    candidates = [seg for seg, sc in scores.items() if sc == top_score]

    if len(candidates) == 1:
        winner = candidates[0]
    else:
        winner = resolve_tie(candidates, answers)

    # Confidence calculation: (top_score - second_score) / 11
    # If tied before tie-breaking resolution, top_score == second_score, so margin is 0.0
    confidence_val = round(Decimal(top_score - second_score) / Decimal(MAX_POSSIBLE_SCORE), 4)

    return {
        "curious_score": scores["curious"],
        "chaotic_score": scores["chaotic"],
        "mysterious_score": scores["mysterious"],
        "final_segment": winner,
        "confidence": confidence_val,
        "scoring_version": "1.0",
    }
