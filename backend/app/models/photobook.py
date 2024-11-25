from sqlalchemy import Column, Integer, String, Float, ForeignKey, Enum, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base
import enum

class FormatEnum(enum.Enum):
    FORMAT_15x20 = "15x20"
    FORMAT_20x20 = "20x20"
    FORMAT_20x25 = "20x25"
    FORMAT_20x30 = "20x30"
    FORMAT_25x25 = "25x25"
    FORMAT_30x30 = "30x30"
    FORMAT_30x40 = "30x40"

class PaperTypeEnum(enum.Enum):
    MATTE = "matte"

class CoverTypeEnum(enum.Enum):
    HARDCOVER = "hardcover"

class PhotoBook(Base):
    __tablename__ = "photobooks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String)
    format = Column(Enum(FormatEnum))
    page_count = Column(Integer)
    paper_type = Column(Enum(PaperTypeEnum))
    cover_type = Column(Enum(CoverTypeEnum))
    has_embossing = Column(Boolean, default=False)
    layout_data = Column(JSON)  # Хранение данных о расположении фотографий
    status = Column(String)  # draft, completed, ordered
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="photobooks")
