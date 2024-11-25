from typing import List, Optional
from pydantic import BaseModel

class TemplateArea(BaseModel):
    x: float
    y: float
    width: float
    height: float

class TemplateBase(BaseModel):
    name: str
    layout: List[TemplateArea]
    is_public: bool = False

class TemplateCreate(TemplateBase):
    pass

class Template(TemplateBase):
    id: int
    user_id: int
    shared_with: List[int] = []

    class Config:
        orm_mode = True

class TemplateShare(BaseModel):
    template_id: int
    user_id: int

    class Config:
        orm_mode = True
