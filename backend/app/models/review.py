from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime
import uuid

class Review(Base):
    __tablename__ = "reviews"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    code = Column(String, nullable=False)
    language = Column(String, nullable=False)
    score = Column(Integer)
    summary = Column(String)
    issues = Column(JSON, default=[])
    static_metrics = Column(JSON, default={})
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="reviews")
    share_token = Column(String, unique=True, nullable=True)