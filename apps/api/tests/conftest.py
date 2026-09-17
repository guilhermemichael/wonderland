import sys
from pathlib import Path
from collections.abc import Generator
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

# Add apps/api to sys.path so tests can import modules directly
api_dir = Path(__file__).resolve().parent.parent
if str(api_dir) not in sys.path:
    sys.path.insert(0, str(api_dir))

import database

import os

# Test database connection
TEST_DB_URL = os.getenv("TEST_DATABASE_URL", "postgresql+psycopg://wonderland:wonderland_dev_password@localhost:5432/wonderland_test")

if "sqlite" in TEST_DB_URL:
    test_engine = create_engine(
        TEST_DB_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
else:
    test_engine = create_engine(
        TEST_DB_URL,
        pool_pre_ping=True,
    )
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, expire_on_commit=False, bind=test_engine, future=True)

# Patch default database module engine for tests
database.engine = test_engine
database.SessionLocal = TestingSessionLocal

from database import Base, get_db, ensure_default_campaign
from main import app


@pytest.fixture(scope="function")
def client() -> Generator[TestClient, None, None]:
    """FastAPI TestClient with thread-safe session per request."""
    Base.metadata.create_all(bind=test_engine)
    init_db = TestingSessionLocal()
    ensure_default_campaign(init_db)
    init_db.close()

    def override_get_db():
        session = TestingSessionLocal()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=test_engine)
