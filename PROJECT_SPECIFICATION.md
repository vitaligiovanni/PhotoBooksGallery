# 📸 PhotoBooks Gallery - Полная спецификация проекта

## 🏗️ **Архитектура проекта**

Проект **PhotoBooks Gallery** - это современное веб-приложение для создания и управления фотокнигами с **разделенной архитектурой** (Frontend + Backend).

```
photobooksgallery/
├── 📁 frontend/          # React + Vite + TypeScript (порт 3000)
├── 📁 backend/           # Node.js + Express + PostgreSQL (порт 5002)
├── 📁 shared/            # Общие типы и схемы базы данных
└── 📄 package.json       # Корневое управление проектом (workspaces)
```

---

## 🛠️ **Технологический стек**

### **Frontend (React Application)**
- **React 18** - Основной фреймворк
- **Vite 6** - Сборщик и dev server
- **TypeScript 5.6** - Типизация
- **Tailwind CSS** - Стилизация
- **TanStack React Query** - Управление состоянием API
- **Radix UI** - Компоненты интерфейса
- **React Hook Form + Zod** - Формы и валидация
- **Wouter** - Роутинг (легковесная альтернатива React Router)
- **i18next** - Интернационализация (русский, армянский, английский)
- **Framer Motion** - Анимации
- **Uppy** - Загрузка файлов

### **Backend (API Server)**
- **Node.js 18+** - Runtime
- **Express.js** - Веб-фреймворк
- **TypeScript** - Типизация
- **Drizzle ORM** - ORM для PostgreSQL
- **PostgreSQL** - База данных
- **JWT + Passport** - Аутентификация
- **Multer + Express File Upload** - Загрузка файлов
– **Локальная файловая система** - Хранение файлов
- **CORS + Security** - Безопасность

### **Shared (Общие ресурсы)**
- **Drizzle Schema** - Схемы базы данных
- **TypeScript Types** - Общие типы
- **Zod Schemas** - Валидация данных

---

## 📦 **Структура проекта**

### **Корневая директория**
```
photobooksgallery/
├── 📄 package.json          # Workspaces конфигурация
├── 📄 README.md             # Документация
├── 📄 .gitignore           # Git игноры
├── 📄 docker-compose.yml   # Docker (опционально)
└── 📄 ai-prompt-examples.md # AI подсказки для разработки
```

### **Frontend структура**
```
frontend/
├── 📁 public/              # Статические файлы
├── 📁 src/
│   ├── 📁 components/      # React компоненты
│   │   ├── 📁 ui/         # Базовые UI компоненты (shadcn/ui)
│   │   ├── 📁 admin/      # Админ панель
│   │   └── 📁 ...         # Другие компоненты
│   ├── 📁 pages/          # Страницы приложения
│   ├── 📁 hooks/          # Custom React hooks
│   ├── 📁 lib/            # Утилиты и конфигурации
│   ├── 📁 services/       # API сервисы
│   ├── 📁 types/          # TypeScript типы
│   └── 📄 main.tsx        # Точка входа
├── 📄 vite.config.ts      # Конфигурация Vite
├── 📄 tailwind.config.ts  # Конфигурация Tailwind
├── 📄 tsconfig.json       # TypeScript конфигурация
└── 📄 package.json        # Зависимости
```

### **Backend структура**
```
backend/
├── 📁 src/
│   ├── 📄 index.ts         # Точка входа сервера
│   ├── 📁 routers/         # API маршруты
│   │   ├── 📄 auth-router.ts      # Аутентификация
│   │   ├── 📄 ecommerce-router.ts # Категории/Продукты
│   │   ├── 📄 orders-router.ts    # Заказы
│   │   └── 📄 ...                # Другие роутеры
│   ├── 📁 middleware/      # Express middleware
│   ├── 📁 services/        # Бизнес-логика
│   ├── 📄 storage.ts       # Работа с БД (Drizzle)
│   ├── 📄 db.ts           # Подключение к БД
│   └── 📄 routes.ts       # Основные маршруты
├── 📁 migrations/         # Drizzle миграции
├── 📁 scripts/            # Скрипты обслуживания
├── 📁 public/             # Статические файлы
├── 📁 objects/            # Загруженные файлы
├── 📄 drizzle.config.ts   # Конфигурация Drizzle
├── 📄 tsconfig.json       # TypeScript конфигурация
└── 📄 package.json        # Зависимости
```

### **Shared структура**
```
shared/
├── 📄 schema.ts           # Drizzle схемы БД
├── 📄 package.json        # Зависимости
└── 📄 types.ts            # Общие типы (опционально)
```

---

## 🔧 **Конфигурация и переменные окружения**

### **Backend (.env)**
```env
# Backend Environment Variables
NODE_ENV=development
PORT=5002

# Database Configuration
DATABASE_URL=postgresql://photobooks:Manana08012023@localhost:5432/photobooks_dev

# Security
SESSION_SECRET=dev_secret_key_not_for_production

# Application Settings
DOMAIN=localhost
FRONTEND_URL=http://localhost:3001
API_URL=http://localhost:5002/api

# File Upload
UPLOAD_DIR=./uploads

# Development Settings
STRICT_PREDEPLOY=0
```

### **Frontend (.env.local)**
```env
VITE_API_URL=http://localhost:5002/api
VITE_APP_ENV=development
```

---

## 🚀 **Запуск проекта**

### **1. Установка зависимостей**
```bash
# Установка всех зависимостей (корень + workspaces)
npm run install:all

# Или по отдельности:
npm install                    # Корневые зависимости
cd frontend && npm install     # Frontend зависимости
cd ../backend && npm install   # Backend зависимости
cd ../shared && npm install    # Shared зависимости
```

### **2. Настройка базы данных**
```bash
# Синхронизация схемы с БД
npm run db:push

# Или генерация миграций
npm run db:generate
npm run db:migrate
```

### **3. Запуск в режиме разработки**
```bash
# Запуск frontend + backend одновременно
npm run dev

# Или по отдельности:
npm run dev:front    # Только frontend (http://localhost:3000)
npm run dev:back     # Только backend (http://localhost:5002)
```

### **4. Сборка для production**
```bash
# Сборка всего проекта
npm run build

# Или по частям:
npm run build:front  # Сборка frontend
npm run build:back   # Сборка backend
```

### **5. Запуск в production**
```bash
# Запуск production версии
npm run start

# Или по частям:
npm run start:back   # Backend (node dist/index.js)
npm run start:front  # Frontend (serve dist)
```

---

## 🐳 **Docker развертывание (опционально)**

### **Docker Compose**
```yaml
version: '3.8'
services:
  db:
    image: postgres:15
    environment:
      POSTGRES_DB: photobooks_dev
      POSTGRES_USER: photobooks
      POSTGRES_PASSWORD: Manana08012023
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  backend:
    build: ./backend
    environment:
      DATABASE_URL: postgresql://photobooks:Manana08012023@db:5432/photobooks_dev
    ports:
      - "5002:5002"
    depends_on:
      - db

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend
```

### **Команды Docker**
```bash
# Сборка образов
npm run docker:build

# Запуск контейнеров
npm run docker:up

# Остановка
npm run docker:down
```

---

## 🌐 **API Endpoints**

### **Основные endpoints:**
- `GET /api/health` - Проверка работоспособности
- `GET /api/categories` - Категории (с иерархией)
- `GET /api/products` - Продукты
- `POST /api/auth/login` - Авторизация
- `POST /api/categories` - Создание категории
- `POST /api/products` - Создание продукта
- `POST /api/orders` - Создание заказа

### **Админ endpoints:**
- `GET /api/categories/admin` - Все категории для админа
- `PUT /api/categories/:id` - Обновление категории
- `DELETE /api/categories/:id` - Удаление категории

---

## 📊 **База данных**

### **Основные таблицы:**
- `users` - Пользователи
- `categories` - Категории (иерархические)
- `products` - Продукты
- `orders` - Заказы
- `order_items` - Элементы заказов
- `reviews` - Отзывы
- `sessions` - Сессии
- `settings` - Настройки приложения

### **Особенности:**
- **Иерархические категории** (parent-child отношения)
- **Многоязычность** (ru, hy, en)
- **Файловое хранение** (локально)
- **JWT аутентификация**
- **Drizzle ORM** для типобезопасных запросов

---

## 🚀 **Развертывание на сервере**

### **1. Подготовка сервера**
```bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Установка Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Установка PostgreSQL
sudo apt install postgresql postgresql-contrib -y
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Создание БД и пользователя
sudo -u postgres psql
CREATE DATABASE photobooks_prod;
CREATE USER photobooks WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE photobooks_prod TO photobooks;
\\q
```

### **2. Загрузка и настройка проекта**
```bash
# Клонирование репозитория
git clone https://github.com/your-username/photobooksgallery.git
cd photobooksgallery

# Установка зависимостей
npm run install:all

# Настройка production переменных
cp backend/.env backend/.env.production
# Отредактировать .env.production с production настройками
```

### **3. Настройка базы данных**
```bash
# Обновление DATABASE_URL в .env
DATABASE_URL=postgresql://photobooks:your_secure_password@localhost:5432/photobooks_prod

# Применение схемы
npm run db:push
```

### **4. Сборка и запуск**
```bash
# Сборка для production
npm run build

# Запуск через PM2 (рекомендуется)
npm install -g pm2
pm2 start ecosystem.config.js

# Или через systemd
sudo nano /etc/systemd/system/photobooks.service
```

### **5. Настройка Nginx (reverse proxy)**
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5002;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Static files
    location /objects {
        proxy_pass http://localhost:5002;
        proxy_set_header Host $host;
    }
}
```

### **6. SSL сертификат (Let's Encrypt)**
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com
```

---

## 📋 **Системные требования**

### **Development:**
- **Node.js**: 18.0.0+
- **npm**: 8.0.0+
- **PostgreSQL**: 13+
- **RAM**: 4GB+
- **Disk**: 10GB+

### **Production:**
- **Node.js**: 18.0.0+
- **PostgreSQL**: 13+
- **RAM**: 2GB+
- **Disk**: 20GB+
- **CPU**: 1+ core

---

## 🔒 **Безопасность**

- **JWT токены** для аутентификации
- **CORS** настроен для frontend
- **Helmet** для security headers
- **Rate limiting** (опционально)
- **Input validation** через Zod
- **SQL injection protection** через Drizzle ORM

---

## 📈 **Мониторинг и обслуживание**

### **Логи:**
- Backend логи в консоль
- Ошибки пишутся в stderr
- PM2 для управления процессами

### **Бэкапы:**
```bash
# Бэкап базы данных
pg_dump photobooks_prod > backup_$(date +%Y%m%d_%H%M%S).sql

# Бэкап файлов
tar -czf uploads_backup_$(date +%Y%m%d).tar.gz backend/objects/
```

### **Обновление:**
```bash
# Обновление кода
git pull origin main

# Переустановка зависимостей
npm run install:all

# Миграции БД (если есть)
npm run db:migrate

# Перезапуск
npm run build
pm2 restart photobooks
```

---

## 🎯 **Ключевые особенности**

1. **Многоязычность** - поддержка 3 языков (русский, армянский, английский)
2. **Иерархические категории** - категории и подкатегории
3. **Файловое управление** - загрузка и хранение изображений
4. **Админ панель** - полное управление контентом
5. **Responsive дизайн** - адаптивность под все устройства
6. **Type safety** - полная типизация TypeScript
7. **Modern stack** - актуальные технологии 2024

---

## 📝 **Полезные команды**

### **Корневые команды (package.json):**
```bash
npm run dev              # Запуск разработки
npm run build            # Сборка production
npm run start            # Запуск production
npm run install:all      # Установка всех зависимостей
npm run clean            # Очистка node_modules
npm run type-check       # Проверка типов
npm run lint             # Линтинг кода
npm run db:push          # Синхронизация БД схемы
npm run db:migrate       # Применение миграций
npm run health           # Проверка API
```

### **Frontend команды:**
```bash
cd frontend
npm run dev              # Vite dev server
npm run build            # Сборка для production
npm run preview          # Предпросмотр сборки
npm run lint             # ESLint проверка
npm run type-check       # TypeScript проверка
```

### **Backend команды:**
```bash
cd backend
npm run dev              # tsx dev server
npm run build            # TypeScript компиляция
npm start                # Production запуск
npm run db:push          # Drizzle push
npm run db:generate      # Генерация миграций
npm run db:migrate       # Применение миграций
npm run db:test          # Тест подключения БД
```

---

## 🔧 **Troubleshooting**

### **Проблемы с запуском:**
```bash
# Очистка и переустановка
npm run clean:all
npm run install:all

# Проверка Node.js версии
node --version
npm --version

# Проверка PostgreSQL
psql -U photobooks -d photobooks_dev -c "SELECT 1;"
```

### **Проблемы с БД:**
```bash
# Пересоздание схемы
npm run db:push

# Проверка миграций
npm run db:migrate

# Резервное копирование
pg_dump photobooks_dev > backup.sql
```

### **Проблемы с зависимостями:**
```bash
# Очистка кэша npm
npm cache clean --force

# Переустановка node_modules
rm -rf node_modules
npm install
```

---

**Проект готов к развертыванию и использованию!** 🚀

Все компоненты протестированы, архитектура масштабируема, код типизирован и документирован. Для дополнительных вопросов по развертыванию или разработке - обращайтесь!

**Happy coding!** 🎉