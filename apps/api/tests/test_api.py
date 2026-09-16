import concurrent.futures
from datetime import datetime, timezone
import uuid
import pytest
from fastapi.testclient import TestClient


def test_health(client: TestClient):
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    data = res.json()
    assert "status" in data
    assert data["service"] == "wonderland-api"


def test_session_lifecycle_and_entry_affinity(client: TestClient):
    # 1. Create Session
    create_payload = {
        "campaign_slug": "wonderland",
        "locale": "en-US",
        "device_type": "desktop",
        "utm_source": "newsletter",
    }
    create_res = client.post("/api/v1/sessions", json=create_payload)
    assert create_res.status_code == 201
    session_data = create_res.json()
    public_id = session_data["public_session_id"]
    assert session_data["current_stage"] == "landing"
    assert session_data["is_expired"] is False

    # 2. Update Path to Rabbit -> sets entry_affinity to curious
    patch_res = client.patch(
        f"/api/v1/sessions/{public_id}",
        json={"selected_path": "rabbit", "current_stage": "crossroads"},
    )
    assert patch_res.status_code == 200
    updated = patch_res.json()
    assert updated["selected_path"] == "rabbit"
    assert updated["entry_affinity"] == "curious"
    assert updated["final_segment"] is None

    # 3. Simulate Quiz completion resulting in chaotic
    # Crucial Invariant: entry_affinity must remain "curious" while final_segment is "chaotic"
    patch_quiz = client.patch(
        f"/api/v1/sessions/{public_id}",
        json={"final_segment": "chaotic", "current_stage": "result"},
    )
    assert patch_quiz.status_code == 200
    quiz_updated = patch_quiz.json()
    assert quiz_updated["entry_affinity"] == "curious"
    assert quiz_updated["final_segment"] == "chaotic"

    # 4. Resume session
    get_res = client.get(f"/api/v1/sessions/{public_id}")
    assert get_res.status_code == 200
    resumed = get_res.json()
    assert resumed["public_session_id"] == public_id
    assert resumed["entry_affinity"] == "curious"
    assert resumed["final_segment"] == "chaotic"


def test_event_ingestion_idempotency(client: TestClient):
    # Create session
    s_res = client.post("/api/v1/sessions", json={})
    pub_id = s_res.json()["public_session_id"]

    client_event_id = str(uuid.uuid4())
    event_payload = {
        "client_event_id": client_event_id,
        "event_name": "cta_click",
        "page": "/",
        "client_sequence": 1,
        "occurred_at": datetime.now(timezone.utc).isoformat(),
        "session_id": pub_id,
        "properties": {"cta": "follow_the_white_rabbit"},
    }

    # First send
    res1 = client.post("/api/v1/events", json=event_payload)
    assert res1.status_code == 202
    data1 = res1.json()
    event_id1 = data1["event_id"]

    # Duplicate send with same client_event_id
    res2 = client.post("/api/v1/events", json=event_payload)
    assert res2.status_code == 202
    data2 = res2.json()
    event_id2 = data2["event_id"]

    # Idempotency: exact same event returned, no duplication
    assert event_id1 == event_id2
    assert data1["client_event_id"] == data2["client_event_id"]

    # Distinct client_event_id
    event_payload2 = dict(event_payload, client_event_id=str(uuid.uuid4()), client_sequence=2)
    res3 = client.post("/api/v1/events", json=event_payload2)
    assert res3.status_code == 202
    data3 = res3.json()
    assert data3["event_id"] != event_id1


def test_concurrent_event_delivery(client: TestClient):
    """Test concurrent requests delivering the identical client_event_id."""
    s_res = client.post("/api/v1/sessions", json={})
    pub_id = s_res.json()["public_session_id"]

    shared_event_id = str(uuid.uuid4())
    payload = {
        "client_event_id": shared_event_id,
        "event_name": "rabbit_hole_started",
        "page": "/rabbit-hole",
        "client_sequence": 2,
        "occurred_at": datetime.now(timezone.utc).isoformat(),
        "session_id": pub_id,
        "properties": {},
    }

    def send_event():
        return client.post("/api/v1/events", json=payload)

    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
        futures = [executor.submit(send_event) for _ in range(4)]
        results = [f.result() for f in futures]

    for r in results:
        assert r.status_code == 202
        assert r.json()["client_event_id"] == shared_event_id

    # All returned the exact same event_id
    event_ids = {r.json()["event_id"] for r in results}
    assert len(event_ids) == 1


def test_partial_quiz_answers_and_recovery(client: TestClient):
    s_res = client.post("/api/v1/sessions", json={})
    pub_id = s_res.json()["public_session_id"]

    # Save Q1
    q1_res = client.post(
        f"/api/v1/sessions/{pub_id}/quiz/answers",
        json={"question_id": "q1", "answer_id": "q1_a"},
    )
    assert q1_res.status_code == 200
    q1_data = q1_res.json()
    assert q1_data["total_answered"] == 1
    assert q1_data["answers"] == {"q1": "q1_a"}
    assert q1_data["is_complete"] is False

    # Save Q2
    q2_res = client.post(
        f"/api/v1/sessions/{pub_id}/quiz/answers",
        json={"question_id": "q2", "answer_id": "q2_b"},
    )
    assert q2_res.status_code == 200
    assert q2_res.json()["total_answered"] == 2

    # Simulate reload / recovery
    rec_res = client.get(f"/api/v1/sessions/{pub_id}/quiz/answers")
    assert rec_res.status_code == 200
    rec_data = rec_res.json()
    assert rec_data["answers"] == {"q1": "q1_a", "q2": "q2_b"}
    assert rec_data["total_answered"] == 2


def test_authoritative_quiz_submit_and_idempotency(client: TestClient):
    s_res = client.post("/api/v1/sessions", json={})
    pub_id = s_res.json()["public_session_id"]

    # Submit before all answers answered -> fails 422
    client.post(
        f"/api/v1/sessions/{pub_id}/quiz/answers",
        json={"question_id": "q1", "answer_id": "q1_a"},
    )
    incomplete_submit = client.post(f"/api/v1/sessions/{pub_id}/quiz/submit")
    assert incomplete_submit.status_code == 422

    # Answer remaining questions: Q2: a, Q3: a, Q4: a -> Pure Curious
    client.post(f"/api/v1/sessions/{pub_id}/quiz/answers", json={"question_id": "q2", "answer_id": "q2_a"})
    client.post(f"/api/v1/sessions/{pub_id}/quiz/answers", json={"question_id": "q3", "answer_id": "q3_a"})
    client.post(f"/api/v1/sessions/{pub_id}/quiz/answers", json={"question_id": "q4", "answer_id": "q4_a"})

    submit_res = client.post(f"/api/v1/sessions/{pub_id}/quiz/submit")
    assert submit_res.status_code == 200
    sub_data = submit_res.json()
    assert sub_data["final_segment"] == "curious"
    assert sub_data["curious_score"] == 11
    assert sub_data["chaotic_score"] == 0
    assert sub_data["mysterious_score"] == 0

    # Verify session updated
    s_check = client.get(f"/api/v1/sessions/{pub_id}").json()
    assert s_check["final_segment"] == "curious"
    assert s_check["current_stage"] == "result"

    # Duplicate submit is idempotent
    dup_submit = client.post(f"/api/v1/sessions/{pub_id}/quiz/submit")
    assert dup_submit.status_code == 200
    assert dup_submit.json()["final_segment"] == "curious"
    assert dup_submit.json()["submitted_at"] == sub_data["submitted_at"]


def test_lead_capture_and_consent(client: TestClient):
    s_res = client.post("/api/v1/sessions", json={})
    pub_id = s_res.json()["public_session_id"]

    lead_payload = {
        "email": "alice@wonderland.example",
        "name": "Alice Liddell",
        "consent_marketing": True,
        "consent_privacy": True,
    }

    lead_res = client.post(f"/api/v1/sessions/{pub_id}/lead", json=lead_payload)
    assert lead_res.status_code == 201
    lead_data = lead_res.json()
    assert lead_data["email"] == "alice@wonderland.example"
    assert lead_data["name"] == "Alice Liddell"
    assert lead_data["consent_marketing"] is True
    assert lead_data["consent_privacy"] is True
    assert lead_data["consented_at"] is not None

    # Verify session stage transitioned to converted
    s_check = client.get(f"/api/v1/sessions/{pub_id}").json()
    assert s_check["current_stage"] == "converted"
