# План деплоя и эксплуатация (VPS, Docker Compose)

Этот документ описывает надёжный и чистый деплой проекта Photobooks на чистый VPS с Docker Compose, с упором на отсутствие мусора: временные файлы удаляются, логи ротируются, образы/контейнеры чистятся.

## 1) Требования и вводные

- VPS с Ubuntu 22.04+ (root или sudo-доступ)
- Домены и DNS готовы, указывают на VPS (A/AAAA)
- Nginx/SSL уже настроены (или используйте reverse proxy, например Caddy/Traefik)
- Доступные порты: 80/443 для внешнего прокси; 5002/8080 локально (или скройте порты в prod-override)
- Переменные окружения:
  - POSTGRES_PASSWORD
  - DOMAIN, FRONTEND_URL, API_URL
  - ALLOWED_ORIGINS
  - ADMIN_TELEGRAM_BOT_TOKEN, ADMIN_TELEGRAM_CHAT_ID (опционально)

## 2) Однократная подготовка сервера

```bash
# Обновления и базовые пакеты
sudo apt-get update -y && sudo apt-get upgrade -y
sudo apt-get install -y ca-certificates curl gnupg ufw

# Docker Engine + Compose plugin
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# Базовый фаервол (опционально)
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## 3) Развёртывание

```bash
# Клонируйте репозиторий или загрузите архив
cd /opt
sudo git clone <repo_url> photobooksgallery
cd photobooksgallery

# Создайте .env (см. пример ниже)
cp .env.example .env || true
$EDITOR .env

# Первый запуск (сборка образов, миграции, запуск сервисов)
docker compose -f docker-compose.yml -f docker-compose.prod.yml pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# Проверка
docker compose ps
docker compose logs -f backend
curl -fsS http://localhost:5002/api/health
```

Пример .env (адаптируйте под домен):

```env
POSTGRES_PASSWORD=change_me
DOMAIN=photobooksgallery.am
FRONTEND_URL=https://photobooksgallery.am
API_URL=https://photobooksgallery.am/api
ALLOWED_ORIGINS=https://photobooksgallery.am
UPLOAD_RETENTION_DAYS=30
UPLOAD_PREDELETE_NOTICE_HOURS=24
ADMIN_TELEGRAM_BOT_TOKEN=
ADMIN_TELEGRAM_CHAT_ID=
```

## 4) Интеграция с существующим Nginx/SSL

- Пробросьте 443/80 на ваш внешний Nginx.
- Настройте upstream’ы к контейнерам:
  - frontend: http://127.0.0.1:8080
  - backend: http://127.0.0.1:5002
- Или отключите публикацию портов в `docker-compose.prod.yml` и проксируйте по внутренней сети Docker.

## 5) Чистота сервера: мусор, кэш, логи

- Многоступенчатые Dockerfile уже минимизируют слои и Dev-зависимости.
- В compose настроен драйвер логов json-file c ротацией `max-size=10m`, `max-file=3`.
- Удаление старых локальных загрузок файлов:
  - Приложение ведёт статусы (scheduled_for_deletion → deleted) и удаляет файлы.
  - Доп. контейнер `cleaner` удаляет физические файлы из `./uploads` старше N дней как safety net.
- Регулярная уборка Docker (еженедельно):
  - Вариант A (контейнер): включён сервис `pruner`, использующий docker socket и выполняющий `docker system prune -af --volumes` по воскресеньям.
  - Вариант B (host cron):
    ```bash
    # Только если понимаете последствия (удалит неиспользуемые ресурсы)
    0 4 * * 0 /usr/bin/docker system prune -af --volumes >> /var/log/deploy-clean.log 2>&1
    ```
  - Выбирайте один вариант. Контейнерный `pruner` уже настроен по умолчанию.

## 6) Бэкапы (только один актуальный)

- Единый архив `backups/backup-latest.tar.gz`, пересобирается при каждом запуске бэкапа.
- Содержимое: дамп БД (`pg_dump`) + каталог `uploads`.
- Ручной запуск:
  ```bash
  docker compose run --rm backup
  ls -lh backups/backup-latest.tar.gz
  ```
- Автоматизация через host cron (рекомендуется ежедневно):
  ```bash
  5 3 * * * /usr/bin/docker compose -f /opt/photobooksgallery/docker-compose.yml -f /opt/photobooksgallery/docker-compose.prod.yml run --rm backup >> /var/log/deploy-clean.log 2>&1
  ```
- Архив пересоздаётся, предыдущий заменяется — тем самым хранится только один свежий бэкап.

## 7) Обновления/релизы

```bash
# Обновить код и/или подтянуть образы
git pull || true
docker compose -f docker-compose.yml -f docker-compose.prod.yml pull
# Пересобрать/перезапустить без простоя
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
# Посмотреть изменения
docker compose ps
docker compose logs -f backend
```

## 8) Диагностика и здоровье

- Backend: /api/health — healthcheck в контейнере.
- Логи: `docker compose logs -f backend|frontend|migrator`
- БД: `docker exec -it photobooks_db psql -U photobooks photobooks`

## 9) Что нужно от вас

1. Подтвердить домен(ы) и реализацию SSL (внешний Nginx/Certbot либо встроенный reverse proxy).
2. Предоставить/зафиксировать значения переменных окружения (.env): пароли/токены/домены.
3. Доступ к VPS (SSH) либо CI/CD, куда пушить/забрасывать docker-образы.
4. Решение по бэкапам: где хранить дампы БД и архивы uploads, глубина хранения.
5. Окно для первого деплоя (первый билд дольше: прогрев слоёв, npm кеши, загрузка образов).

## 10) Оптимизация холодного старта в будущем

- Предсборка и публикация образов в реестр (GHCR/Docker Hub), сервер только pull.
- Кэширование сборки: BuildKit + кэш-слои, мономорепозиторная структура уже этому помогает.
- Вынос мигратора в отдельную CI-стадию (выполнение миграций строго один раз).

---

Готов подключить prod-override, бэкап-сервис и Ansible-роль, если потребуется автоматизация. 
