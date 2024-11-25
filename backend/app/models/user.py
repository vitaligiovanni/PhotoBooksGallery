from sqlalchemy import Boolean, Column, Integer, String, DateTime, relationship
from sqlalchemy.sql import func
from ..database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Отношения
    photobooks = relationship("PhotoBook", back_populates="user")
    templates = relationship("Template", back_populates="user")
    shared_templates = relationship(
        "Template",
        secondary="template_shares",
        back_populates="shared_with"
    )
