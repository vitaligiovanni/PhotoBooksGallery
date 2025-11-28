-- Очистка старых/упавших AR-проектов из базы данных
-- Используется для удаления проектов со статусом 'error' или 'pending' старше 1 дня

-- 1. Удалить из AR базы (ar_db на порту 5434)
-- Подключиться: psql -U photobooks -h localhost -p 5434 -d ar_db

-- Посмотреть проблемные проекты
SELECT id, status, error_message, created_at, is_demo, expires_at
FROM ar_projects
WHERE status IN ('error', 'pending')
   OR (is_demo = true AND expires_at < NOW())
ORDER BY created_at DESC;

-- Удалить проекты со статусом error старше 1 дня
DELETE FROM ar_projects
WHERE status = 'error'
  AND created_at < NOW() - INTERVAL '1 day';

-- Удалить истёкшие demo-проекты
DELETE FROM ar_projects
WHERE is_demo = true
  AND expires_at < NOW();

-- Удалить проекты в pending старше 1 часа (застряли)
DELETE FROM ar_projects
WHERE status = 'pending'
  AND created_at < NOW() - INTERVAL '1 hour';

-- 2. Очистить записи из основной БД (photobooks_db на порту 5433)
-- Подключиться: psql -U photobooks -h localhost -p 5433 -d photobooks_db

-- Посмотреть несинхронизированные записи
SELECT id, ar_project_id, status, created_at
FROM ar_projects
WHERE ar_project_id = '57da26d8-d09f-4e22-87e6-845bf150eeda';

-- Удалить конкретный проект (замените ID)
DELETE FROM ar_projects
WHERE ar_project_id = '57da26d8-d09f-4e22-87e6-845bf150eeda';

-- Или удалить все проекты со статусом error
DELETE FROM ar_projects
WHERE status = 'error'
  AND created_at < NOW() - INTERVAL '1 day';

-- 3. Очистить файлы (PowerShell)
-- Удалить папки проектов, которых нет в БД:

-- Get-ChildItem "c:\Projects\NextjsBlog\NextjsBlog-broken-backup\photobooksgallery\backend\objects\ar-storage" |
-- Where-Object { $_.PSIsContainer -and $_.Name -match "^(demo|prod)-" } |
-- ForEach-Object {
--     $projectId = $_.Name;
--     # Проверить в БД, существует ли проект
--     # Если нет - удалить папку
--     Write-Host "Check project: $projectId";
-- }

-- 4. Альтернатива: Удалить ВСЕ demo-проекты старше 24 часов
-- В AR базе
DELETE FROM ar_projects
WHERE is_demo = true
  AND created_at < NOW() - INTERVAL '24 hours';

-- В основной базе
DELETE FROM ar_projects
WHERE is_demo = true
  AND created_at < NOW() - INTERVAL '24 hours';

-- ИТОГ:
-- После выполнения этих команд админка будет показывать только актуальные проекты
