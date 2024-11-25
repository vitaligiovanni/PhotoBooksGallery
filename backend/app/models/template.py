from sqlalchemy import Column, Integer, String, Boolean, JSON, ForeignKey
from sqlalchemy.orm import relationship
from ..database import Base

class Template(Base):
    __tablename__ = "templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    layout = Column(JSON)
    is_public = Column(Boolean, default=False)
    user_id = Column(Integer, ForeignKey("users.id"))
    
    # Отношения
    user = relationship("User", back_populates="templates")
    shared_with = relationship(
        "User",
        secondary="template_shares",
        back_populates="shared_templates"
    )

class TemplateShare(Base):
    __tablename__ = "template_shares"

    template_id = Column(Integer, ForeignKey("templates.id"), primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
