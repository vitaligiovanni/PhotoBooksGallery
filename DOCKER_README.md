## Локальная разработка

1. **Установите Docker Desktop**
   - ✅ Docker Desktop уже установлен через winget
   - ✅ WSL2 компонент установлен

2. **Включите виртуализацию в BIOS** (требуется для Docker)
   - Перезагрузите компьютер и войдите в BIOS (обычно F2, F10, Del или Esc)
   - Найдите раздел "Advanced" или "CPU Configuration"
   - Включите опцию "Intel Virtualization Technology" или "AMD-V"
   - Сохраните изменения и выйдите (F10 + Y)

3. После включения виртуализации перезагрузите компьютер еще раз

4. Создайте `.env.local` файл (уже создан):
   ```
   DATABASE_URL=postgresql://photobooks_user:secure_password_123@db:5432/photobooksgallery
   SESSION_SECRET=development_secret_key_change_in_production_12345678901234567890
   ```

5. Запустите:
   ```bash
   docker compose up --build
   ```

6. Откройте http://localhost:3000кальная разработка

1. **Установите Docker Desktop**
   - ✅ Docker Desktop уже установлен через winget
   - ✅ WSL2 компонент установлен

2. **Перезагрузите систему** (требуется для применения WSL2)

3. После перезагрузки создайте `.env.local` файл (уже создан):
   ```
   DATABASE_URL=postgresql://photobooks_user:secure_password_123@db:5432/photobooksgallery
   SESSION_SECRET=development_secret_key_change_in_production_12345678901234567890
   ```

4. Запустите:
   ```bash
   docker compose up --build
   ```

5. Откройте http://localhost:3000 Gallery

## Обзор

Docker обеспечивает консистентную среду для развертывания PhotoBooks Gallery, сохраняя все функции CRM панели и загрузку фотографий.

## Файлы

- `Dockerfile` - Контейнеризация приложения
- `docker-compose.yml` - Локальная разработка
- `docker-compose.prod.yml` - Продакшен на Beget
- `.dockerignore` - Исключаемые файлы
- `scripts/deploy-docker.sh` - Деплой скрипт (Linux/Mac)
- `scripts/deploy-docker.ps1` - Деплой скрипт (Windows)

## Локальная разработка

1. **Установите Docker Desktop**
   - Скачайте с https://www.docker.com/products/docker-desktop
   - Установите и запустите

2. Создайте `.env.local` файл (уже создан):
   ```
   DATABASE_URL=postgresql://photobooks_user:secure_password_123@db:5432/photobooksgallery
   SESSION_SECRET=development_secret_key_change_in_production_12345678901234567890
   ```

3. Запустите:
   ```bash
   docker compose up --build
   ```

4. Откройте http://localhost:3000

## Продакшен деплой на Beget

### Подготовка сервера

1. Установите Docker на Beget:
   ```bash
   # На сервере
   curl -fsSL https://get.docker.com | sh
   sudo usermod -aG docker $USER
   ```

2. Установите docker-compose:
   ```bash
   # На сервере
   sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose
   ```

3. Настройте SSH ключ для доступа с локальной машины

### Деплой

1. Отредактируйте скрипт `scripts/deploy-docker.sh`:
   - Замените `user@your-beget-server` на ваш SSH доступ
   - Замените `your-beget-server` на домен/IP

2. Запустите деплой:
   ```bash
   # Linux/Mac
   chmod +x scripts/deploy-docker.sh
   ./scripts/deploy-docker.sh

   # Windows
   .\scripts\deploy-docker.ps1 -Server your-beget-server -User your-username
   ```

## Что сохраняется

- ✅ Фотографии товаров (volume: uploads)
- ✅ База данных (volume: db_data)
- ✅ Все CRM функции
- ✅ Настройки и конфигурация

## Мониторинг

После деплоя проверьте:
- http://your-beget-server/api/health - Здоровье приложения
- http://your-beget-server/api/categories - CRM API
- http://your-beget-server/admin - CRM панель

## Откат

Если что-то пошло не так:
```bash
# На сервере
cd /home/user/docker-deploy-YYYYMMDD_HHMMSS  # Предыдущая директория
docker-compose -f docker-compose.prod.yml up -d
```

## Альтернативные решения

Если виртуализация недоступна, можно использовать:

### Вариант 1: Docker на Beget сразу
Пропустите локальное тестирование и разверните сразу на Beget:
```bash
# На Beget сервере
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Затем используйте deploy-docker.sh
```

### Вариант 2: Тестирование на Beget
- Разверните на Beget через скрипты
- Тестируйте CRM функции на реальном сервере
- Все равно получите консистентную среду

### Вариант 3: Локальная разработка без Docker
- Используйте `npm run dev` для фронтенда
- Настройте локальную PostgreSQL базу
- Тестируйте CRM функции локально