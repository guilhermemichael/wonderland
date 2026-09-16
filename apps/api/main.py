import sys
from pathlib import Path

api_dir = Path(__file__).resolve().parent
if str(api_dir) not in sys.path:
    sys.path.insert(0, str(api_dir))

from contextlib import asynccontextmanager
from collections.abc import AsyncGenerator
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import API_CORS_ORIGINS, API_TITLE, API_VERSION
from database import SessionLocal, check_database_connection, ensure_default_campaign, engine
from routes import events_router, leads_router, quiz_router, sessions_router


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Lifespan context verifying database connectivity and bootstrapping the default campaign.
    
    In M02, PostgreSQL connectivity is mandatory. No silent fallback to memory is permitted.
    """
    check_database_connection()
    from models import Base
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        ensure_default_campaign(db)
    finally:
        db.close()
    yield


app = FastAPI(
    title=API_TITLE,
    version=API_VERSION,
    docs_url="/api/docs",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=API_CORS_ORIGINS,
    allow_methods=["GET", "POST", "PATCH", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(events_router)
app.include_router(sessions_router)
app.include_router(quiz_router)
app.include_router(leads_router)


@app.get("/api/v1/health")
@app.get("/health")
def health() -> dict[str, str]:
    """Healthcheck endpoint verifying application and database connectivity."""
    db_status = "connected"
    try:
        check_database_connection()
    except Exception as e:
        db_status = f"unreachable: {e}"

    return {
        "status": "ok" if db_status == "connected" else "degraded",
        "service": "wonderland-api",
        "database": db_status,
        "version": API_VERSION,
    }
