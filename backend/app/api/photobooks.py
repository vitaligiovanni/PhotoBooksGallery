from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models.photobook import PhotoBook
from ..schemas.photobook import PhotoBookCreate, PhotoBookUpdate, PhotoBook as PhotoBookSchema
from ..utils.auth import get_current_user
from ..models.user import User

router = APIRouter()

@router.post("/", response_model=PhotoBookSchema)
async def create_photobook(
    photobook: PhotoBookCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Создание новой фотокниги"""
    db_photobook = PhotoBook(
        **photobook.dict(),
        user_id=current_user.id,
        status="draft",
        layout_data={}
    )
    db.add(db_photobook)
    db.commit()
    db.refresh(db_photobook)
    return db_photobook

@router.get("/", response_model=List[PhotoBookSchema])
async def get_user_photobooks(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получение списка фотокниг пользователя"""
    return db.query(PhotoBook).filter(PhotoBook.user_id == current_user.id).all()

@router.get("/{photobook_id}", response_model=PhotoBookSchema)
async def get_photobook(
    photobook_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Получение конкретной фотокниги"""
    photobook = db.query(PhotoBook).filter(
        PhotoBook.id == photobook_id,
        PhotoBook.user_id == current_user.id
    ).first()
    if not photobook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="PhotoBook not found"
        )
    return photobook

@router.put("/{photobook_id}", response_model=PhotoBookSchema)
async def update_photobook(
    photobook_id: int,
    photobook_update: PhotoBookUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Обновление параметров фотокниги"""
    db_photobook = db.query(PhotoBook).filter(
        PhotoBook.id == photobook_id,
        PhotoBook.user_id == current_user.id
    ).first()
    if not db_photobook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="PhotoBook not found"
        )
    
    update_data = photobook_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_photobook, field, value)
    
    db.commit()
    db.refresh(db_photobook)
    return db_photobook

@router.delete("/{photobook_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_photobook(
    photobook_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Удаление фотокниги"""
    db_photobook = db.query(PhotoBook).filter(
        PhotoBook.id == photobook_id,
        PhotoBook.user_id == current_user.id
    ).first()
    if not db_photobook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="PhotoBook not found"
        )
    
    db.delete(db_photobook)
    db.commit()

@router.put("/{photobook_id}/layout", response_model=PhotoBookSchema)
async def update_photobook_layout(
    photobook_id: int,
    layout_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Обновление макета фотокниги"""
    db_photobook = db.query(PhotoBook).filter(
        PhotoBook.id == photobook_id,
        PhotoBook.user_id == current_user.id
    ).first()
    if not db_photobook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="PhotoBook not found"
        )
    
    db_photobook.layout_data = layout_data
    db.commit()
    db.refresh(db_photobook)
    return db_photobook

@router.post("/{photobook_id}/order", response_model=PhotoBookSchema)
async def create_order(
    photobook_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Создание заказа фотокниги"""
    db_photobook = db.query(PhotoBook).filter(
        PhotoBook.id == photobook_id,
        PhotoBook.user_id == current_user.id
    ).first()
    if not db_photobook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="PhotoBook not found"
        )
    
    if db_photobook.status != "draft":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="PhotoBook is already ordered"
        )
    
    db_photobook.status = "ordered"
    db.commit()
    db.refresh(db_photobook)
    return db_photobook
