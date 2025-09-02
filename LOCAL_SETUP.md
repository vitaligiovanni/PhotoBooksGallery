# Локальная установка ФотоКрафт

Пошаговая инструкция для установки проекта ФотоКрафт на локальный компьютер.

## Требования

- Node.js версии 18 или выше
- PostgreSQL версии 14 или выше
- Git (опционально)

## 1. Скачивание проекта

### Вариант A: Скачать из Replit
1. Откройте проект в Replit
2. Нажмите меню "..." (три точки) в правом верхнем углу
3. Выберите "Download as zip"
4. Распакуйте архив в нужную папку

### Вариант B: Клонировать через Git (если есть репозиторий)
```bash
git clone [URL_РЕПОЗИТОРИЯ]
cd fotokraft
```

## 2. Установка зависимостей

Откройте терминал в папке проекта и выполните:

```bash
npm install
```

## 3. Настройка базы данных

### Установка PostgreSQL

**Windows:**
1. Скачайте PostgreSQL с официального сайта
2. Установите с настройками по умолчанию
3. Запомните пароль для пользователя postgres

**macOS:**
```bash
brew install postgresql
brew services start postgresql
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Создание базы данных

```bash
# Подключитесь к PostgreSQL
sudo -u postgres psql

# Создайте базу данных
CREATE DATABASE fotokraft;

# Создайте пользователя (опционально)
CREATE USER fotokraft_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE fotokraft TO fotokraft_user;

# Выйдите
\q
```

## 4. Настройка переменных окружения

Создайте файл `.env` в корне проекта:

```env
# База данных
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/fotokraft

# Или если создали отдельного пользователя:
# DATABASE_URL=postgresql://fotokraft_user:your_password@localhost:5432/fotokraft

# Сессии
SESSION_SECRET=your_very_long_random_secret_key_here

# Notion (если используете)
NOTION_INTEGRATION_SECRET=your_notion_secret
NOTION_PAGE_URL=your_notion_page_url

# Домены (для локальной разработки)
REPLIT_DOMAINS=localhost:5000
ISSUER_URL=https://replit.com/oidc
REPL_ID=your_repl_id
```

## 5. Применение схемы базы данных

```bash
npm run db:push
```

## 6. Запуск проекта

```bash
npm run dev
```

Приложение будет доступно по адресу: http://localhost:5000

## 7. Создание администратора

Поскольку аутентификация Replit работает только в Replit, для локальной разработки можно:

1. **Временно отключить аутентификацию** в файлах роутов
2. **Использовать mock пользователя** для тестирования
3. **Настроить другую систему аутентификации** (например, NextAuth.js)

### Быстрое решение для тестирования

В файле `server/routes.ts` временно закомментируйте middleware `isAuthenticated`:

```javascript
// Закомментируйте эту строку для локального тестирования
// app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {

// И замените на:
app.get('/api/auth/user', async (req: any, res) => {
  // Mock пользователь для локального тестирования
  res.json({
    id: 'local-admin',
    email: 'admin@local.test',
    firstName: 'Админ',
    lastName: 'Локальный'
  });
});
```

## 8. Альтернативные решения

### Использование Docker

Создайте `docker-compose.yml`:

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:14
    environment:
      POSTGRES_DB: fotokraft
      POSTGRES_USER: fotokraft
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

Запустите:
```bash
docker-compose up -d
```

### Использование облачной базы данных

Вместо локальной PostgreSQL можно использовать:

- **Neon** (neon.tech) - бесплатный tier
- **Supabase** (supabase.com) - бесплатный tier
- **Railway** (railway.app) - простое развертывание

## 9. Возможные проблемы

### Порт занят
```bash
# Найти процесс на порту 5000
lsof -i :5000
# Убить процесс
kill -9 [PID]
```

### Ошибки подключения к базе данных
1. Проверьте, что PostgreSQL запущен
2. Проверьте правильность DATABASE_URL
3. Убедитесь, что база данных создана

### Ошибки с зависимостями
```bash
# Очистить кэш и переустановить
rm -rf node_modules package-lock.json
npm install
```

## 10. Разработка

### Структура проекта
```
fotokraft/
├── client/          # React фронтенд
├── server/          # Express бэкенд
├── shared/          # Общие типы и схемы
├── package.json     # Зависимости
└── .env            # Переменные окружения
```

### Полезные команды
```bash
npm run dev          # Запуск в режиме разработки
npm run build        # Сборка проекта
npm run db:push      # Применение схемы БД
npm run db:studio    # Открыть Drizzle Studio
```

### Режим отладки
```bash
# Запуск с подробными логами
DEBUG=* npm run dev
```

Готово! Проект должен работать локально. Для полной функциональности потребуется настроить аутентификацию и хранилище файлов.