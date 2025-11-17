# 📸 PhotoBooks Gallery

Современное веб-приложение для создания и управления фотокнигами с разделенной архитектурой.

## 🏗️ Архитектура

```
photobooksgallery/
├── 📁 frontend/          # React + Vite + TypeScript
├── 📁 backend/           # Node.js + Express + PostgreSQL
├── 📁 shared/            # Общие типы и схемы
└── 📄 package.json       # Корневое управление проектом
```

## 🚀 Быстрый старт

### 1. Установка зависимостей
```bash
npm run install:all
```

### 2. Настройка базы данных
```bash
npm run db:push
```

### 3. Запуск разработки
```bash
npm run dev
```

Откройте:
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5002

## 📋 Доступные команды

### Разработка
- `npm run dev` - Запуск frontend + backend одновременно
- `npm run dev:front` - Только frontend
- `npm run dev:back` - Только backend

### Сборка
- `npm run build` - Сборка для production
- `npm run build:front` - Сборка frontend
- `npm run build:back` - Сборка backend

### База данных
- `npm run db:migrate` - Применить миграции
- `npm run db:push` - Синхронизировать схему
- `npm run db:generate` - Создать миграции

### Утилиты
- `npm run clean` - Очистка node_modules
- `npm run type-check` - Проверка типов
- `npm run health` - Проверка работы API

## 🛠️ Технологии

### Frontend
- React 18
- Vite 6
- TypeScript
- Tailwind CSS
- TanStack Query
- Radix UI

### Backend
- Node.js + Express
- TypeScript
- Drizzle ORM
- PostgreSQL
- CORS & Security

## 🌐 API Endpoints

- `GET /api/health` - Health check
- `GET /api/products` - Список продуктов
- `GET /api/categories` - Категории
- `POST /api/auth/login` - Авторизация

## 📦 Структура проекта

```
frontend/
├── src/
│   ├── components/     # React компоненты
│   ├── pages/         # Страницы приложения
│   ├── hooks/         # Custom hooks
│   └── services/      # API сервисы
└── package.json

backend/
├── src/
│   ├── routers/       # API маршруты
│   ├── middleware/    # Middleware
│   └── services/      # Бизнес-логика
└── package.json

shared/
├── schema.ts          # База данных схемы
└── package.json
```

## 🔧 Конфигурация

### Environment переменные

**Backend (.env):**
```env
NODE_ENV=development
PORT=5002
DATABASE_URL=postgresql://user:pass@localhost:5432/photobooks
SESSION_SECRET=your_secret_key
FRONTEND_URL=http://localhost:3000
```

**Frontend:**
```env
VITE_API_URL=http://localhost:5002/api
```

## 🐳 Docker (опционально)

```bash
npm run docker:build
npm run docker:up
```

## 📝 Разработка

1. Backend запускается на порту 5002
2. Frontend запускается на порту 3000
3. API proxy настроен автоматически
4. Hot reload работает для обеих частей

## ✅ Готово к работе!

Проект настроен и готов к разработке. Все зависимости изолированы, архитектура разделена, документация актуальна.

---

**Happy coding!** 🎉