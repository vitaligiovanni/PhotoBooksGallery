from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine
from . import models

# Создаем таблицы в базе данных
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="PhotoBooks Gallery API")

# Настройка CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Адрес фронтенда
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Подключаем роуты
from .api import auth, photobooks

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(photobooks.router, prefix="/api/photobooks", tags=["photobooks"])
