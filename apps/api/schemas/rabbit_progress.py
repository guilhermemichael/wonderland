from typing import Optional
from pydantic import BaseModel

class RabbitProgressBase(BaseModel):
    has_taken_watch: Optional[bool] = None
    has_followed_trail: Optional[bool] = None
    has_reached_threshold: Optional[bool] = None

class RabbitProgressCreate(RabbitProgressBase):
    pass

class RabbitProgressUpdate(RabbitProgressBase):
    pass

class RabbitProgressResponse(BaseModel):
    has_taken_watch: bool
    has_followed_trail: bool
    has_reached_threshold: bool

    class Config:
        from_attributes = True
