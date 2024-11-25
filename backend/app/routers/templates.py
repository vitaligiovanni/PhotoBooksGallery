from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from ..dependencies import get_db, get_current_user
from ..models import Template, User, TemplateShare
from ..schemas.template import TemplateCreate, Template as TemplateSchema, TemplateShare as TemplateShareSchema

router = APIRouter(prefix="/templates", tags=["templates"])

@router.post("/", response_model=TemplateSchema)
def create_template(
    template: TemplateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_template = Template(
        name=template.name,
        layout=template.layout,
        is_public=template.is_public,
        user_id=current_user.id
    )
    db.add(db_template)
    db.commit()
    db.refresh(db_template)
    return db_template

@router.get("/", response_model=List[TemplateSchema])
def get_templates(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Получаем шаблоны пользователя
    user_templates = db.query(Template).filter(Template.user_id == current_user.id).all()
    
    # Получаем публичные шаблоны других пользователей
    public_templates = db.query(Template).filter(
        Template.is_public == True,
        Template.user_id != current_user.id
    ).all()
    
    # Получаем шаблоны, которыми поделились с пользователем
    shared_templates = current_user.shared_templates
    
    return user_templates + public_templates + shared_templates

@router.put("/{template_id}", response_model=TemplateSchema)
def update_template(
    template_id: int,
    template: TemplateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_template = db.query(Template).filter(Template.id == template_id).first()
    if not db_template:
        raise HTTPException(status_code=404, detail="Template not found")
    if db_template.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    db_template.name = template.name
    db_template.layout = template.layout
    db_template.is_public = template.is_public
    
    db.commit()
    db.refresh(db_template)
    return db_template

@router.delete("/{template_id}")
def delete_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_template = db.query(Template).filter(Template.id == template_id).first()
    if not db_template:
        raise HTTPException(status_code=404, detail="Template not found")
    if db_template.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    db.delete(db_template)
    db.commit()
    return {"message": "Template deleted"}

@router.post("/share", response_model=TemplateShareSchema)
def share_template(
    share: TemplateShareSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Проверяем существование шаблона
    template = db.query(Template).filter(Template.id == share.template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Проверяем права на шаблон
    if template.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    # Проверяем существование пользователя
    user = db.query(User).filter(User.id == share.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Создаем запись о совместном использовании
    db_share = TemplateShare(template_id=share.template_id, user_id=share.user_id)
    db.add(db_share)
    db.commit()
    
    return share

@router.delete("/share/{template_id}/{user_id}")
def remove_share(
    template_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Проверяем существование шаблона
    template = db.query(Template).filter(Template.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Проверяем права на шаблон
    if template.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    # Удаляем запись о совместном использовании
    db_share = db.query(TemplateShare).filter(
        TemplateShare.template_id == template_id,
        TemplateShare.user_id == user_id
    ).first()
    
    if db_share:
        db.delete(db_share)
        db.commit()
    
    return {"message": "Share removed"}
