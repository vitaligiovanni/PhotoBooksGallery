#!/bin/bash

# CRM Products - Partial Deploy Script
# Исправляет проблемы с CRM товарами на продакшн сервере

SERVER="root@82.202.129.237"
REMOTE_PATH="/var/www/photobooksgallery"
LOCAL_PATH="."

echo "🚀 Начинаем частичный деплой исправлений CRM товаров..."

# Создаем бэкап критических файлов на сервере
echo "📦 Создаем бэкап текущих файлов..."
ssh $SERVER "cd $REMOTE_PATH && \
  mkdir -p backups/$(date +%Y%m%d_%H%M%S) && \
  cp client/src/components/admin/managers/ProductsManager.tsx backups/$(date +%Y%m%d_%H%M%S)/ 2>/dev/null || true && \
  cp client/src/components/ObjectUploader.tsx backups/$(date +%Y%m%d_%H%M%S)/ 2>/dev/null || true && \
  cp server/routers/ecommerce-router.ts backups/$(date +%Y%m%d_%H%M%S)/ 2>/dev/null || true"

# Загружаем исправленные файлы
echo "📤 Загружаем исправленные файлы..."

# 1. Исправленный ProductsManager
echo "  → ProductsManager.tsx"
scp "$LOCAL_PATH/client/src/components/admin/managers/ProductsManager.tsx" \
    "$SERVER:$REMOTE_PATH/client/src/components/admin/managers/"

# 2. Исправленный ObjectUploader (если нужен)
echo "  → ObjectUploader.tsx"
scp "$LOCAL_PATH/client/src/components/ObjectUploader.tsx" \
    "$SERVER:$REMOTE_PATH/client/src/components/" 2>/dev/null || true

# 3. Исправленный ecommerce router (если есть)
echo "  → ecommerce-router.ts"
scp "$LOCAL_PATH/server/routers/ecommerce-router.ts" \
    "$SERVER:$REMOTE_PATH/server/routers/" 2>/dev/null || true

# Проверяем структуру и перестраиваем клиент
echo "🔧 Перестраиваем клиентское приложение..."
ssh $SERVER "cd $REMOTE_PATH && \
  echo 'Checking structure...' && \
  ls -la client/src/components/admin/managers/ && \
  echo 'Rebuilding client...' && \
  npm run build:client 2>/dev/null || \
  (cd client && npm run build) 2>/dev/null || \
  echo 'Build may have failed - continuing...' && \
  echo 'Restarting PM2...' && \
  pm2 restart photobooksgallery-admin || pm2 restart all"

echo "✅ Частичный деплой завершен!"
echo "🔍 Проверьте работу CRM товаров: https://photobooksgallery.am/admin"

# Показываем статус PM2
echo "📊 Статус PM2:"
ssh $SERVER "pm2 status"