from collections.abc import Generator
from sqlalchemy import create_engine, select, text
from sqlalchemy.orm import Session, declarative_base, sessionmaker

from config import DATABASE_URL, DEFAULT_CAMPAIGN_NAME, DEFAULT_CAMPAIGN_SLUG

# Modern SQLAlchemy 2.0 declarative base
Base = declarative_base()

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    future=True,
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
    bind=engine,
    future=True,
)


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency providing a transactional SQLAlchemy session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def check_database_connection(target_engine=None) -> bool:
    """Explicitly verify connection against the database. Raise on failure."""
    eng = target_engine or engine
    with eng.connect() as conn:
        conn.execute(text("SELECT 1"))
    return True


def ensure_default_campaign(db: Session):
    """Seed or bootstrap the default WONDERLAND campaign deterministically."""
    from models.campaign import Campaign

    stmt = select(Campaign).where(Campaign.slug == DEFAULT_CAMPAIGN_SLUG)
    campaign = db.execute(stmt).scalar_one_or_none()
    if not campaign:
        campaign = Campaign(
            slug=DEFAULT_CAMPAIGN_SLUG,
            name=DEFAULT_CAMPAIGN_NAME,
            status="active",
        )
        db.add(campaign)
        db.commit()
        db.refresh(campaign)
    return campaign
