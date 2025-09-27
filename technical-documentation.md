# Техническая документация проекта "PhotoBooksGallery"

## 📖 Оглавление

1. [Архитектура системы](#архитектура-системы)
2. [API Endpoints](#api-endpoints)
3. [Схемы базы данных](#схемы-базы-данных)
4. [Компоненты фронтенда](#компоненты-фронтенда)
5. [Настройка и развертывание](#настройка-и-развертывание)
6. [Миграции базы данных](#миграции-базы-данных)

## 🏗️ Архитектура системы

### Монолитная архитектура:
```
photobooksgallery/
├── client/                 # Next.js фронтенд
│   ├── src/
│   │   ├── components/     # React компоненты
│   │   ├── pages/         # Страницы приложения
│   │   ├── hooks/         # Кастомные хуки
│   │   └── lib/           # Утилиты и конфигурация
├── server/                # Express бэкенд
│   ├── index.ts          # Главный серверный файл
│   ├── routes.ts         # API маршруты
│   ├── db.ts            # Подключение к базе данных
│   └── storage.ts        # Работа с файловым хранилищем
├── shared/               # Общие модули
│   └── schema.ts        # Схемы базы данных и Zod
└── migrations/          # Миграции базы данных
```

## 🌐 API Endpoints

### Аутентификация
- `GET /api/login` - Авторизация через Replit
- `GET /api/logout` - Выход из системы
- `GET /api/user` - Получение данных пользователя

### Товары и категории
- `GET /api/products` - Список всех товаров
- `POST /api/products` - Создание товара
- `PUT /api/products/:id` - Обновление товара
- `DELETE /api/products/:id` - Удаление товара
- `GET /api/categories` - Список категорий

### Заказы
- `GET /api/orders` - Список заказов
- `POST /api/orders` - Создание заказа
- `PUT /api/orders/:id` - Обновление статуса заказа

### Блог и контент
- `GET /api/blog-posts` - Список статей блога
- `POST /api/blog-posts` - Создание статьи
- `PUT /api/blog-posts/:id` - Обновление статьи
- `GET /api/reviews` - Список отзывов
- `POST /api/reviews` - Создание отзыва

### Конструктор страниц
- `GET /api/constructor/pages` - Список страниц
- `POST /api/constructor/pages` - Создание страницы
- `GET /api/constructor/pages/:id/blocks` - Блоки страницы
- `POST /api/constructor/pages/:id/blocks` - Добавление блока
- `PUT /api/constructor/blocks/:id` - Обновление блока

### Валюты
- `GET /api/currencies` - Список валют
- `GET /api/currencies/base` - Базовая валюта
- `GET /api/exchange-rates` - Курсы валют

### Загрузка файлов
- `POST /api/local-upload` - Локальная загрузка файлов
- `POST /api/upload` - Загрузка в облачное хранилище

## 🗃️ Схемы базы данных

### Основные таблицы:

#### Таблица: `products`
```sql
CREATE TABLE products (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    name JSONB NOT NULL,           -- Мультиязычное название
    description JSONB,             -- Мультиязычное описание
    price DECIMAL(10,2) NOT NULL,
    currency_id VARCHAR REFERENCES currencies(id),
    category_id VARCHAR REFERENCES categories(id),
    photobook_format VARCHAR,      -- album, book, square
    photobook_size VARCHAR,        -- "20x15", "30x20"
    min_spreads INTEGER DEFAULT 10,
    additional_spread_price DECIMAL(10,2),
    images TEXT[],                 -- Массив URL изображений
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### Таблица: `currencies`
```sql
CREATE TABLE currencies (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR NOT NULL UNIQUE,  -- USD, RUB, AMD
    name JSONB NOT NULL,           -- Мультиязычное название
    symbol VARCHAR NOT NULL,       -- $, ₽, ֏
    is_base_currency BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true
);
```

#### Таблица: `pages` (Конструктор)
```sql
CREATE TABLE pages (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR NOT NULL,
    slug VARCHAR NOT NULL UNIQUE,
    description TEXT,
    is_published BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0
);
```

#### Таблица: `blocks` (Конструктор)
```sql
CREATE TABLE blocks (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id VARCHAR REFERENCES pages(id) ON DELETE CASCADE,
    type VARCHAR NOT NULL,         -- hero, text, image, gallery
    content JSONB,                 -- Контент блока
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true
);
```

## ⚛️ Компоненты фронтенда

### Основные страницы:
- **Landing** (`/`) - Главная страница
- **Product** (`/product/:id`) - Страница товара
- **Editor** (`/editor`) - Фоторедактор
- **Cart** (`/cart`) - Корзина покупок
- **Admin** (`/admin`) - Административная панель

### Компоненты административной панели:

#### ProductsManager
- Управление товарами с полной CRUD функциональностью
- Мультиязычные поля названия и описания
- Загрузка изображений галереи
- Настройка параметров фотокниг

#### CategoriesManager
- Создание и редактирование категорий
- Мультиязычные названия и описания
- Загрузка изображений категорий

#### ReviewsManager
- Модерация пользовательских отзывов
- Создание промо-отзывов
- Управление статусами отзывов

#### BlogManager
- Управление статьями блога
- Мультиязычный контент
- Система статусов публикации

#### ConstructorApp
- Визуальный конструктор страниц
- Drag-and-drop управление блоками
- Редакторы для разных типов блоков

### Типы блоков конструктора:

1. **HeroBlock** - Герой-секция с заголовком и CTA
2. **TextBlock** - Текстовый контент с форматированием
3. **ImageBlock** - Одиночное изображение с настройками
4. **GalleryBlock** - Галерея изображений
5. **ButtonBlock** - Кнопка с ссылкой

## 🔧 Настройка и развертывание

### Требования к окружению:
- Node.js 18+
- PostgreSQL 14+
- npm или yarn

### Установка зависимостей:
```bash
npm install
# или
yarn install
```

### Настройка переменных окружения:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/photobooksgallery
SESSION_SECRET=your-secret-key
UPLOAD_PATH=./uploads
NODE_ENV=development
```

### Запуск в development:
```bash
# Запуск сервера разработки
npm run dev

# Сборка для production
npm run build
npm start
```

### Миграции базы данных:
```bash
# Применение миграций
npm run db:migrate

# Откат миграций
npm run db:rollback

# Создание новой миграции
npm run db:create-migration --name=add_new_feature
```

## 📊 Миграции базы данных

### Существующие миграции:

#### 0000_curly_katie_power.sql
- Создание основных таблиц
- Начальная структура базы данных

#### 0001_constructor_update.sql
- Добавление таблиц конструктора страниц
- Блоки и страницы контента

#### 0002_fix_comment_default.sql
- Исправление значений по умолчанию
- Оптимизация структуры комментариев

### Создание новых миграций:

```bash
# Генерация миграции
npx drizzle-kit generate

# Применение миграции
npx drizzle-kit migrate
```

## 🚀 Процесс развертывания

### Локальное развертывание:
1. Клонировать репозиторий
2. Установить зависимости `npm install`
3. Настроить переменные окружения
4. Запустить миграции базы данных
5. Запустить сервер `npm run dev`

### Production развертывание:
1. Собрать проект `npm run build`
2. Настроить reverse proxy (nginx)
3. Настроить SSL сертификаты
4. Настроить мониторинг и логирование

## 📈 Мониторинг и аналитика

### Встроенная аналитика:
- Трекинг просмотров страниц
- Аналитика конверсии заказов
- Статистика популярности товаров
- Отслеживание пользовательского поведения

### Интеграции:
- Google Analytics
- Яндекс.Метрика
- Sentry для ошибок
- LogRocket для сессий

---

*Документация актуальна на основе анализа кодовой базы проекта. Все endpoint'ы и схемы соответствуют текущей реализации.*