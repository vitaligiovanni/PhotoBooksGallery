# CRM Products - Partial Deploy Script (PowerShell)
# Исправляет проблемы с CRM товарами на продакшн сервере

$SERVER = "root@82.202.129.237"
$REMOTE_PATH = "/var/www/photobooksgallery"
$LOCAL_PATH = "."

Write-Host "🚀 Начинаем частичный деплой исправлений CRM товаров..." -ForegroundColor Green

# Создаем бэкап критических файлов на сервере
Write-Host "📦 Создаем бэкап текущих файлов..." -ForegroundColor Yellow
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
ssh $SERVER "cd $REMOTE_PATH && mkdir -p backups/$timestamp && cp client/src/components/admin/managers/ProductsManager.tsx backups/$timestamp/ 2>/dev/null || true"

# Загружаем исправленные файлы
Write-Host "📤 Загружаем исправленные файлы..." -ForegroundColor Yellow

# 1. Исправленный ProductsManager
Write-Host "  → ProductsManager.tsx" -ForegroundColor Cyan
scp "$LOCAL_PATH/client/src/components/admin/managers/ProductsManager.tsx" "${SERVER}:$REMOTE_PATH/client/src/components/admin/managers/"

if ($LASTEXITCODE -eq 0) {
    Write-Host "    ✅ ProductsManager.tsx загружен успешно" -ForegroundColor Green
} else {
    Write-Host "    ❌ Ошибка загрузки ProductsManager.tsx" -ForegroundColor Red
}

# 2. Исправленный ObjectUploader
Write-Host "  → ObjectUploader.tsx" -ForegroundColor Cyan
scp "$LOCAL_PATH/client/src/components/ObjectUploader.tsx" "${SERVER}:$REMOTE_PATH/client/src/components/" 2>$null

# 3. Исправленный ecommerce router
Write-Host "  -> ecommerce-router.ts" -ForegroundColor Cyan
scp "$LOCAL_PATH/server/routers/ecommerce-router.ts" "${SERVER}:$REMOTE_PATH/server/routers/" 2>$null

# Проверяем структуру и перестраиваем
Write-Host "🔧 Проверяем структуру и перестраиваем..." -ForegroundColor Yellow
ssh $SERVER @"
cd $REMOTE_PATH
echo 'Checking uploaded files...'
ls -la client/src/components/admin/managers/ProductsManager.tsx
echo 'File size and timestamp:'
stat client/src/components/admin/managers/ProductsManager.tsx
echo 'Rebuilding frontend...'
if [ -f 'package.json' ]; then
    npm run build 2>/dev/null || (cd client && npm run build) 2>/dev/null || echo 'Build command not found'
fi
echo 'Restarting PM2...'
pm2 restart photobooksgallery-admin || pm2 restart all
echo 'Done!'
"@

Write-Host "✅ Частичный деплой завершен!" -ForegroundColor Green
Write-Host "🔍 Проверьте работу CRM товаров: https://photobooksgallery.am/admin" -ForegroundColor Cyan

# Показываем статус PM2
Write-Host "📊 Статус PM2:" -ForegroundColor Yellow
ssh $SERVER "pm2 status"

Write-Host "`n🎯 Проверьте следующее:" -ForegroundColor Magenta
Write-Host "1. Dropdown kategoriy teper dolzhen pokazyvat nazvaniya" -ForegroundColor White
Write-Host "2. Sozdanie tovarov dolzhno rabotat bez oshibok" -ForegroundColor White  
Write-Host "3. Zagruzka izobrazheniy dolzhna rabotat korrektno" -ForegroundColor White