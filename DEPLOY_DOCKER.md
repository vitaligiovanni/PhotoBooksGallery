# Docker Deployment Guide

## 1. Цели
Надёжный воспроизводимый деплой приложения с автоматическим применением миграций и проверкой окружения.

## 2. Предпосылки
- Docker / docker compose
- PostgreSQL (или managed instance)
- Заполнены переменные окружения (`.env` или секреты в оркестраторе)

## 3. Структура
| Компонент | Назначение |
|-----------|------------|
| `Dockerfile` | Сборка приложения и запуск через entrypoint |
| `entrypoint.sh` | Применение миграций + преддеплой проверка |
| `scripts/predeploy-verify.ts` | Диагностика БД/локали/миграций |
| `scripts/validate-env.ts` | Проверка переменных окружения |
| `docker-compose.yml` | Локальный стек (app + db) |
| `MIGRATIONS_GUIDE.md` | Политика миграций |

## 4. Основные переменные
| Переменная | Обяз. | Описание |
|------------|-------|----------|
| DATABASE_URL | Да | Подключение к PostgreSQL |
| SESSION_SECRET | Да | Секрет подписи (64+ символов) |
| PORT | Нет | Порт приложения (3000 по умолчанию) |
| STRICT_PREDEPLOY | Нет | 1 = падение при предупреждениях |

## 5. Локальная проверка
```bash
cp .env.example .env
# Отредактируйте .env
docker compose up --build
```
Приложение: http://localhost:3000
Postgres: localhost:5433

## 6. Порядок деплоя (prod)
1. Сборка образа:
   ```bash
   docker build -t photobooks:$(git rev-parse --short HEAD) .
   ```
2. Запуск миграций + старт (в среде):
   ```bash
   docker run --rm \
     -e DATABASE_URL=$DATABASE_URL \
     -e SESSION_SECRET=$SESSION_SECRET \
     -e STRICT_PREDEPLOY=1 \
     -p 3000:3000 photobooks:<tag>
   ```
3. HEALTHCHECK дождаться `healthy`.
4. Smoke-тесты:
   - /api/health
   - /api/debug/encoding
   - /api/categories, /api/products
5. Переключение трафика (reverse proxy / load balancer).

## 7. Режимы запуска
| Переменная | Эффект |
|------------|--------|
| SKIP_MIGRATIONS=1 | Пропустить применение миграций |
| USE_PUSH=1 | (Dev) Использовать старый push вместо migrate |
| STRICT_PREDEPLOY=1 | Прервать старт при предупреждениях |

## 8. Диагностика
| Симптом | Действие |
|---------|----------|
| Ошибка gen_random_uuid | Проверить миграцию pgcrypto (0006) |
| Enum drift warning | Сгенерировать новую миграцию корректирующую enum |
| Not all migrations applied | Выполнить db:migrate локально и пересобрать образ |
| Кодировка не UTF8 | Пересоздать базу с правильными initdb args |

## 9. CI Идея
Шаги pipeline:
1. npm ci
2. npm run env:check
3. npm run db:generate (проверить отсутствует diff)
4. npm run predeploy:verify (STRICT_PREDEPLOY=1)
5. docker build
6. docker push

## 10. Backup Strategy (кратко)
```bash
pg_dump --format=custom --file=pre_deploy_$(date +%Y%m%d).dump $DATABASE_URL
```
Храните минимум 7—14 дней.

## 11. Обновление
- Никогда не редактировать старые миграции
- Любое изменение — новый файл SQL
- Проверка хеша миграций (predeploy-verify) перед rollout

## 12. Security Notes
- Не хранить реальные креды в git
- SESSION_SECRET генерировать (openssl rand -hex 32)
- Ограничить сеть БД (firewall / security groups)

## 13. Следующие улучшения (опционально)
- Multi-stage Dockerfile (уменьшить размер)
- GitHub Action workflow файл
- Автоалерт при предупреждениях (Slack вебхук)

---
Готово. Используйте этот документ как контрольный лист.
