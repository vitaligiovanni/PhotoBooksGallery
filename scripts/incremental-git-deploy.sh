#!/bin/bash

# Инкрементальный Git-деплой (для существующего Git репозитория)

SERVER="root@82.202.129.237"
DEPLOY_PATH="/var/www/photobooksgallery"

echo "🔄 Инкрементальный Git-деплой..."

ssh $SERVER "
cd $DEPLOY_PATH &&

# Проверяем что это Git репозиторий
if [ ! -d .git ]; then
    echo '❌ Это не Git репозиторий! Используйте полное клонирование.'
    exit 1
fi

echo '📥 Получаем обновления...' &&
git fetch origin main &&

echo '🔍 Проверяем изменения...' &&
git log --oneline HEAD..origin/main &&

echo '✅ Применяем изменения...' &&
git pull origin main &&

echo '📦 Обновляем зависимости...' &&
npm install &&

echo '🏗️ Пересобираем...' &&
npm run build &&

echo '🔄 Перезапускаем PM2...' &&
pm2 restart photobooksgallery-admin &&

echo '✅ Инкрементальный деплой завершен!'
"