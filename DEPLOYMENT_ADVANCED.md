# Advanced Deployment & Partial Update Strategy

Язык: RU / EN mixed for clarity.

## Цели
1. Безопасные обновления без простоя и «поломок» продакшн версии.
2. Возможность частичного деплоя (только код, только публичные файлы, только миграции, синхронизация media).
3. Быстрый откат (rollback) к предыдущему релизу.
4. Минимум ручных шагов: один скрипт запускается локально, остальное — на сервере.
5. Чёткое разделение между immutable release (код) и mutable data (uploads, .env, логи).

## Структура на сервере
```
/var/www/photobooksgallery/
  releases/
    release-20250206125901/
    release-20250207103015/
    current -> /var/www/photobooksgallery/releases/release-20250207103015
  persistent/
    uploads/
    .env
    logs/
```

Папка `current` используется процессом (pm2 / systemd). Новый релиз раскладывается параллельно и только после успешной установки зависимостей + миграций выполняется переключение симлинка.

## Persistent данные
- uploads (файлы, загружаемые через CRM)
- .env (никогда не перезаписываем при деплое)
- логи/временные файлы

## Манифест (`deploy-manifest.json`)
Файл с:
- hash каждого файла (sha256 укороченный)
- размер
- категория: code | public | migrations | uploads | other

Использование:
1. Сравнить локальный и удалённый манифест, чтобы понять что изменилось.
2. Делать выборочный деплой (например, только новые миграции и server код).

Скрипт генерации: `node scripts/generate-manifest.mjs`

## Partial Deploy варианты
Переменная окружения ONLY уже активна и реально фильтрует директории:
```
ONLY=server   ./scripts/deploy-release.sh   # Только server/ shared/ (без dist/public/ миграций)
ONLY=public   ./scripts/deploy-release.sh   # Только dist + public (клиент/ассеты)
ONLY=migrations ./scripts/deploy-release.sh # Лишь migrations + package.json (для зависимостей миграций)
ONLY=code     ./scripts/deploy-release.sh   # dist + server + shared (без public и migrations)
```
Миграции выполняются ТОЛЬКО если режим не ограничен client/public/server.

## Миграции
Текущий простой вариант: `drizzle-kit push` на сервере при каждом релизе. Улучшения (TODO):
1. Отслеживать уже применённые версии (журнал) и прогонять только новые.
2. Dry-run режим перед применением.
3. Блокировка (advisory lock) чтобы избежать гонок при параллельном деплое.

## Rollback
`scripts/rollback-release.sh` — переключает симлинк на предыдущий релиз. Важно: если миграции «вперёд» уже изменили схему, обратный код может не работать. Для критичных изменений — стратегия расширяющих миграций (expand / contract):
1. Deploy A (добавили новые столбцы, но старые не удаляем)
2. Обновление кода — использует новые поля, но fallback есть
3. После стабильности — миграция удаления устаревших полей

## Media (uploads) стратегия
Uploads НЕ входят в релиз. Они лежат в persistent/uploads. Локально для теста можно копировать подсет:
```
rsync -avz root@82.202.129.237:/var/www/photobooksgallery/persistent/uploads ./uploads-prod-sample --include '*/' --include '*.jpg' --exclude '*'
```

## Возможные причины «сломанных» баннеров/товаров на проде
1. Несовместимость схемы БД: локально миграции применены, на проде — частично.
2. Отсутствие обновлённого кода сервиса баннеров (старый dist + новый server/ts, пересборка не сделана).
3. Отсутствующие env переменные (SESSION_SECRET, DATABASE_URL, пути хранилища файлов).
4. Различие путей к статикам / public (nginx кэширует старые ассеты).
5. Неправильные права на uploads (нет записи).

## Check-list перед деплоем
1. git status чистый
2. npm run build прошёл без ошибок
3. node scripts/generate-manifest.mjs (проверить diff с предыдущим)
4. Обновлены .env на сервере (если нужно добавлены новые ключи)
5. Есть бэкап БД (pg_dump)

## Инструменты улучшений (следующие шаги)
- Автоопределение «только миграции без изменений в dist» (автоустановка ONLY=migrations).
- systemd юнит вместо pm2 для более детерминированного restarts.
- Health-check endpoint + автоматический rollback при 5xx всплеске.

## Новые вспомогательные скрипты
- `scripts/predeploy-check.mjs` — проверка git, build (по флагу), генерация манифеста, diff с прошлым.
- `scripts/post-deploy-save-manifest.mjs` — сохраняет текущий manifest как last.
- `scripts/smoke-test.mjs` — быстрый функциональный smoke: health, banners, settings.
- `scripts/diff-manifests.mjs` — сравнение двух manifest.
- `deploy/systemd/photobooksgallery.service` и `setup-systemd.sh` — альтернатива pm2.

## Опции безопасного деплоя (уже реализовано)
Переменные окружения для `scripts/deploy-release.sh`:
```
AUTO_ROLLBACK=true                  # Автооткат если health endpoint не отвечает 200
HEALTH_URL=http://127.0.0.1:3000/api/health  # Проверяемый endpoint после релиза
HEALTH_TIMEOUT=25                   # Сколько секунд ждать успешный статус
BACKUP_BEFORE_MIGRATIONS=true       # Делать pg_dump перед миграциями (нужен REMOTE_DB_URL)
REMOTE_DB_URL=postgres://user:pass@host:5432/dbname  # URL для бэкапа
SKIP_BUILD=true                     # Пропустить build (например только миграции)
ONLY=server|public|migrations|code  # Частичный деплой
```
PowerShell упрощение: `scripts/deploy-safe.ps1` (флаги вместо прямой установки переменных).
Авто-rollback: если health не проходит и включён AUTO_ROLLBACK, скрипт переключает симлинк обратно.

## Быстрый старт
1. Настроить серверную структуру: `/var/www/photobooksgallery/{releases,persistent}`
2. Поместить .env в `persistent/.env`
3. Запустить первый деплой: `./scripts/deploy-release.sh`
4. Настроить nginx указывающий на `releases/current/public` (если статика отдельно) и proxy_pass на Node порт.

## Безопасность
- Никогда не копируйте .env в git / релиз.
- Ограничить доступ SSH по ключам, отключить пароль.
- Логи и ошибки — отдельная директория, ротация (logrotate).

## FAQ
Q: Как обновить только баннерный код?  
A: Внесите изменения, `npm run build` (если меняются клиентские части), затем обычный деплой. Манифест покажет изменившиеся файлы. Для ускорения можете добавить фильтр в скрипт (расширение TODO).  

Q: Как обновить только статику (public)?  
A: Добавить логику в deploy-release.sh (проверка ONLY=public) и копировать лишь public + dist, без миграций.

Q: Почему не Docker?  
A: Можно перейти на Docker позже для унификации окружений. Текущий подход проще для быстрого внедрения.

---
Happy shipping! 🚀
