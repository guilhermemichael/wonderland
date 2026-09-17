from fastapi.testclient import TestClient


def test_session_create_rejects_oversized_database_fields(client: TestClient):
    cases = {
        "campaign_slug": "x" * 65,
        "locale": "x" * 17,
        "device_type": "x" * 33,
        "utm_source": "x" * 129,
        "utm_medium": "x" * 129,
        "utm_campaign": "x" * 129,
        "utm_content": "x" * 129,
        "utm_term": "x" * 129,
        "referrer": "x" * 513,
    }

    for field, value in cases.items():
        response = client.post("/api/v1/sessions", json={field: value})
        assert response.status_code == 422, (field, response.status_code, response.text)
        detail = response.json()["detail"]
        assert any(item["loc"][-1] == field for item in detail), (field, detail)


def test_session_create_accepts_values_at_database_limits(client: TestClient):
    response = client.post(
        "/api/v1/sessions",
        json={
            "campaign_slug": "wonderland",
            "locale": "x" * 16,
            "device_type": "x" * 32,
            "utm_source": "x" * 128,
            "utm_medium": "x" * 128,
            "utm_campaign": "x" * 128,
            "utm_content": "x" * 128,
            "utm_term": "x" * 128,
            "referrer": "x" * 512,
        },
    )
    assert response.status_code == 201, response.text
