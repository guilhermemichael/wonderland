# Wonderland API

FastAPI service boundary for Milestone 01 event ingestion. The typed contract uses `client_event_id` as the idempotency identity and `client_sequence` only for ordering. The current store is protected in memory and resets on restart; PostgreSQL durability and later quiz/session features belong to Milestone 02.

Install with `pip install -r requirements.txt`, then run `uvicorn main:app --reload --port 8000`.
