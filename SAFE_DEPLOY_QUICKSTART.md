# Быстрый старт: Безопасный деплой

Этот документ объясняет ПРОСТО, без сложных терминов.

## Что делает система деплоя
1. Создаёт папку нового релиза (не ломая текущий сайт).
2. Копирует нужные файлы.
3. (Опционально) Применяет миграции базы.
4. Переключает символическую ссылку `current` на новый релиз.
5. Перезапускает процесс (pm2).
6. Проверяет здоровье сайта (`/api/health`). Если сайт не отвечает — откат (если включен авто-rollback).

## Важные понятия
- Релиз (release): отдельная версия кода, например `release-20250927123055`.
- Откат (rollback): переключение обратно на предыдущий релиз.
- Partial deploy: обновить только часть (например только backend или только миграции).

## Минимальная подготовка на сервере (один раз)
```
mkdir -p /var/www/photobooksgallery/{releases,persistent}
mkdir -p /var/www/photobooksgallery/persistent/uploads
# Скопируйте .env в /var/www/photobooksgallery/persistent/.env
```

## Самый простой полный деплой
В Windows PowerShell (из корня проекта):
```
./scripts/deploy-safe.ps1
```

Перед этим можно запустить проверку:
```
node scripts/predeploy-check.mjs --build
```
После успешного деплоя сохранить манифест для будущих diff:
```
node scripts/post-deploy-save-manifest.mjs
```

## Частичный деплой (примеры)
Только backend (серверный код):
```
./scripts/deploy-safe.ps1 -ServerOnly
```
Только клиент (статические файлы):
```
./scripts/deploy-safe.ps1 -PublicOnly
```
Только миграции:
```
./scripts/deploy-safe.ps1 -MigrationsOnly
```

## Авто-rollback и Health
Хотите чтобы при проблеме сайт вернулся на предыдущую версию:
```
./scripts/deploy-safe.ps1 -ServerOnly -AutoRollback -HealthUrl "http://127.0.0.1:3000/api/health"
```
HealthUrl — это URL на сервере (localhost внутри сервера), который должен отдавать статус 200.

Дополнительно можно выполнить smoke-тест уже после деплоя:
```
node scripts/smoke-test.mjs --base http://127.0.0.1:3000
```

## Переменные безопасности (можно задать перед запуском)
- `AUTO_ROLLBACK=true` — включает откат.
- `HEALTH_URL=http://127.0.0.1:3000/api/health` — что проверяем.
- `HEALTH_TIMEOUT=30` — сколько секунд ждать OK.
- `BACKUP_BEFORE_MIGRATIONS=true` и `REMOTE_DB_URL=...` — сделать бэкап БД.

Пример через PowerShell:
```
$env:AUTO_ROLLBACK="true"
$env:HEALTH_URL="http://127.0.0.1:3000/api/health"
$env:BACKUP_BEFORE_MIGRATIONS="true"
$env:REMOTE_DB_URL="postgres://user:pass@host:5432/dbname"
./scripts/deploy-safe.ps1
```

## Как сделать откат вручную
Если что-то сломалось и авто-rollback не был включён:
```
bash ./scripts/rollback-release.sh
```
(В PowerShell можно: `bash scripts/rollback-release.sh`)

## Что спрашивать у ассистента (меня)
- "Сделай полный деплой" — я подскажу команду и окружение.
- "Обнови только бэкенд" — будет использован `-ServerOnly`.
- "Применить только миграции" — `-MigrationsOnly`.
- "Хочу с авто откатом" — добавим `-AutoRollback -HealthUrl ...`.
- "Сравни изменения" — я скажу как вызвать diff манифестов.
- "Сделай predeploy check" — запуск `node scripts/predeploy-check.mjs --build`.
- "Сделай smoke тест" — запуск `node scripts/smoke-test.mjs --base http://127.0.0.1:3000`.

## Типичные ошибки
| Проблема | Причина | Решение |
|----------|---------|---------|
| Баннеры не создаются | Миграции не применены | Запустить миграции или полный деплой |
| Файлы не загружаются | Права на uploads | Проверить владельца каталога |
| Health падает | Ошибка кода или ENV | Смотреть логи pm2 / исправить .env |

## Логи
На сервере выполните:
```
pm2 logs photobooksgallery --lines 200
```

## Минимальный алгоритм для вас
1. Внесли изменения локально.
2. (Опционально) `npm run build` чтобы убедиться что всё собирается.
3. Запускаете: `./scripts/deploy-safe.ps1 -AutoRollback -HealthUrl "http://127.0.0.1:3000/api/health"`
4. Ждёте завершения. Если OK — сайт обновлён.
5. Если не ок и был авто-rollback — сайт вернётся на предыдущий релиз.

Готовы использовать. Если что-то непонятно — просто напишите мне "объясни шаг X".
