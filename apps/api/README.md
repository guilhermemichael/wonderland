# Wonderland API

FastAPI service boundary for event ingestion, quiz scoring, session recovery and analytics. The first milestone keeps persistence intentionally small and exposes a typed event contract; PostgreSQL migrations arrive with the Cheshire milestone.

Install with `pip install -r requirements.txt`, then run `uvicorn main:app --reload --port 8000`.
