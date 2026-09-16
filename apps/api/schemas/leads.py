from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, field_validator


class LeadCreate(BaseModel):
    email: str | None = None
    name: str | None = None
    consent_marketing: bool = False
    consent_privacy: bool = False

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str | None) -> str | None:
        if v is not None:
            v = v.strip()
            if v and ("@" not in v or "." not in v):
                raise ValueError("Invalid email format")
        return v


class LeadResponse(BaseModel):
    id: UUID
    session_id: UUID
    email: str | None = None
    name: str | None = None
    consent_marketing: bool
    consent_privacy: bool
    consented_at: datetime | None = None
    created_at: datetime
