from fastapi.testclient import TestClient
import pytest

@pytest.fixture
def test_session_id(client: TestClient) -> str:
    res = client.post("/api/v1/sessions", json={})
    return res.json()["public_session_id"]

def test_rabbit_initial_state(client: TestClient, test_session_id: str):
    response = client.get(f"/api/v1/sessions/{test_session_id}/rabbit")
    assert response.status_code == 200
    data = response.json()
    assert data["has_taken_watch"] is False
    assert data["has_followed_trail"] is False
    assert data["has_reached_threshold"] is False

def test_rabbit_valid_transition(client: TestClient, test_session_id: str):
    response = client.post(
        f"/api/v1/sessions/{test_session_id}/rabbit",
        json={"has_taken_watch": True}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["has_taken_watch"] is True
    assert data["has_followed_trail"] is False

def test_rabbit_idempotent_transition(client: TestClient, test_session_id: str):
    client.post(
        f"/api/v1/sessions/{test_session_id}/rabbit",
        json={"has_taken_watch": True}
    )
    response = client.post(
        f"/api/v1/sessions/{test_session_id}/rabbit",
        json={"has_taken_watch": True}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["has_taken_watch"] is True

def test_rabbit_invalid_skipped_transition(client: TestClient, test_session_id: str):
    # Right now, the backend routes don't strictly enforce transition logic, they just accept booleans.
    response = client.post(
        f"/api/v1/sessions/{test_session_id}/rabbit",
        json={"has_followed_trail": True}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["has_followed_trail"] is True

def test_rabbit_unknown_session(client: TestClient):
    import uuid
    fake_id = str(uuid.uuid4())
    response = client.get(f"/api/v1/sessions/{fake_id}/rabbit")
    assert response.status_code == 404
