from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime
from ..models.photobook import FormatEnum, PaperTypeEnum, CoverTypeEnum

class PhotoBookBase(BaseModel):
    name: str
    format: FormatEnum
    page_count: int = Field(..., ge=10, le=100)  # Минимум 10, максимум 100 разворотов
    paper_type: PaperTypeEnum = PaperTypeEnum.MATTE
    cover_type: CoverTypeEnum = CoverTypeEnum.HARDCOVER
    has_embossing: bool = False

class PhotoBookCreate(PhotoBookBase):
    pass

class PhotoBookUpdate(BaseModel):
    name: Optional[str] = None
    format: Optional[FormatEnum] = None
    page_count: Optional[int] = Field(None, ge=10, le=100)
    paper_type: Optional[PaperTypeEnum] = None
    cover_type: Optional[CoverTypeEnum] = None
    has_embossing: Optional[bool] = None
    layout_data: Optional[Dict[str, Any]] = None
    status: Optional[str] = None

class PhotoBook(PhotoBookBase):
    id: int
    user_id: int
    layout_data: Optional[Dict[str, Any]] = None
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
