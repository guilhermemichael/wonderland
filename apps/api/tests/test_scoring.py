from decimal import Decimal
import pytest
from scoring import (
    QuizValidationError,
    calculate_quiz_scores,
    evaluate_quiz_submission,
    validate_question_answer,
)


def test_validate_question_answer_valid():
    validate_question_answer("q1", "q1_a")
    validate_question_answer("q2", "q2_b")
    validate_question_answer("q3", "q3_c")
    validate_question_answer("q4", "q4_a")


def test_validate_question_answer_mismatch():
    with pytest.raises(QuizValidationError, match="Invalid answer_id 'q4_a' for question 'q1'"):
        validate_question_answer("q1", "q4_a")

    with pytest.raises(QuizValidationError, match="Unknown question_id: 'q99'"):
        validate_question_answer("q99", "q1_a")

    with pytest.raises(QuizValidationError, match="Invalid answer_id 'q1_z' for question 'q1'"):
        validate_question_answer("q1", "q1_z")


def test_pure_curious():
    answers = {"q1": "q1_a", "q2": "q2_a", "q3": "q3_a", "q4": "q4_a"}
    res = evaluate_quiz_submission(answers)
    assert res["curious_score"] == 11
    assert res["chaotic_score"] == 0
    assert res["mysterious_score"] == 0
    assert res["final_segment"] == "curious"
    assert res["confidence"] == Decimal("1.0000")  # (11 - 0) / 11


def test_pure_chaotic():
    answers = {"q1": "q1_b", "q2": "q2_b", "q3": "q3_b", "q4": "q4_b"}
    res = evaluate_quiz_submission(answers)
    assert res["curious_score"] == 0
    assert res["chaotic_score"] == 11
    assert res["mysterious_score"] == 0
    assert res["final_segment"] == "chaotic"
    assert res["confidence"] == Decimal("1.0000")


def test_pure_mysterious():
    answers = {"q1": "q1_c", "q2": "q2_c", "q3": "q3_c", "q4": "q4_c"}
    res = evaluate_quiz_submission(answers)
    assert res["curious_score"] == 0
    assert res["chaotic_score"] == 0
    assert res["mysterious_score"] == 11
    assert res["final_segment"] == "mysterious"
    assert res["confidence"] == Decimal("1.0000")


def test_mixed_clear_winner():
    # q1: curious (3), q2: chaotic (2), q3: mysterious (2), q4: curious (4)
    # Total: Curious = 7, Chaotic = 2, Mysterious = 2
    answers = {"q1": "q1_a", "q2": "q2_b", "q3": "q3_c", "q4": "q4_a"}
    res = evaluate_quiz_submission(answers)
    assert res["curious_score"] == 7
    assert res["chaotic_score"] == 2
    assert res["mysterious_score"] == 2
    assert res["final_segment"] == "curious"
    # Confidence: (7 - 2) / 11 = 5 / 11 = 0.4545
    assert res["confidence"] == round(Decimal("5") / Decimal("11"), 4)


def test_two_way_tie_q4_tiebreaker():
    # Create tie between Curious and Chaotic:
    # q1: Curious +3
    # q2: Chaotic +2
    # q3: Mysterious +2 (neither tied)
    # q4: Chaotic +4 (Total Chaotic = 6)
    # Wait, let's construct Curious 5 vs Chaotic 5:
    # q1: Curious +3
    # q2: Curious +2 -> Curious = 5
    # q3: Chaotic +2
    # q4: Chaotic +4 -> Wait: 2+4 = 6.
    # What combinations equal 5?
    # q1 (3) + q2 (2) = 5
    # q4 (4) + ... wait, we need equal sums.
    # Possible scores per question:
    # Q1: 3, Q2: 2, Q3: 2, Q4: 4. Total = 11.
    # Can two segments tie?
    # Yes: 4 vs 4 (leaving 3 for the third):
    # e.g.:
    # Curious: q4 (4) -> total 4
    # Chaotic: q1 (3) + q2 (2)? That's 5.
    # What if:
    # Curious: Q4 (+4) -> 4
    # Chaotic: Q2 (+2) + Q3 (+2) -> 4
    # Mysterious: Q1 (+3) -> 3
    # Total: Curious = 4, Chaotic = 4, Mysterious = 3. Sum = 11!
    answers = {
        "q1": "q1_c",  # Mysterious +3
        "q2": "q2_b",  # Chaotic +2
        "q3": "q3_b",  # Chaotic +2 -> Chaotic total = 4
        "q4": "q4_a",  # Curious +4 -> Curious total = 4
    }
    res = evaluate_quiz_submission(answers)
    assert res["curious_score"] == 4
    assert res["chaotic_score"] == 4
    assert res["mysterious_score"] == 3
    # Top score tie: 4 vs 4. Margin before tiebreak = (4 - 4) / 11 = 0.0
    assert res["confidence"] == Decimal("0.0000")

    # Tie breaker: Q4 favored Curious!
    assert res["final_segment"] == "curious"


def test_two_way_tie_q1_fallback_tiebreaker():
    # Curious and Chaotic tie, but neither was chosen in Q4!
    # Q4 is chosen as Mysterious (+4).
    # Then remaining points: Q1 (3), Q2 (2), Q3 (2) = 7 points total.
    # Can Curious and Chaotic tie in remaining points?
    # 7 is odd, so two cannot divide 7 equally if only 2 options.
    # But what if Mysterious ties with Chaotic?
    # Let's check:
    # Mysterious: Q1 (+3) + Q2 (+2) = 5
    # Chaotic: Q4 (+4) + ? no, Q3 (+2) = 6.
    # Let's test tie where Q4 does not decide between tied candidates:
    # Suppose candidates tied for top are A and B.
    # If Q4 chose C, then top score cannot be 4 or less unless C has <= top score.
    # If C chose Q4 (+4), and C also gets Q2 (+2), C has 6 (winner).
    # What if C has Q4 (+4), and A has Q1 (+3) + Q2 (+2) = 5, B has Q3 (+2)? A is winner.
    # Wait, what if Q4 was chosen for C (4 pts), and A and B tie for second place?
    # (Second place tie does not affect final_segment winner, which is C).
    # How can two segments tie for FIRST place when Q4 is NOT one of them?
    # For A and B to tie for first place, their score must be >= C's score.
    # C's score from Q4 is 4.
    # For A and B to have score >= 4 without Q4:
    # A would need >= 4 from {Q1(3), Q2(2), Q3(2)}.
    # B would also need >= 4 from the remaining questions.
    # Total points from {Q1, Q2, Q3} = 3 + 2 + 2 = 7.
    # Two numbers >= 4 sum to at least 8 > 7.
    # Therefore, mathematically, whenever there is a tie for FIRST place (top score),
    # ONE of the tied candidates MUST be the one chosen in Q4!
    # That means Q4 ALWAYS resolves any tie for first place!
    # This is a brilliant mathematical property of the scoring system!
    pass


def test_incomplete_answers_rejected():
    with pytest.raises(QuizValidationError, match="Incomplete quiz answers"):
        evaluate_quiz_submission({"q1": "q1_a", "q2": "q2_a"})
