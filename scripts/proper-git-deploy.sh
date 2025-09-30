#!/bin/bash

# Правильный Git-деплой PhotoBooks Gallery

SERVER="root@82.202.129.237"
REPO_URL="https://github.com/vitaligiovanni/PhotoBooksGallery.git"
DEPLOY_PATH="/var/www/photobooksgallery-git"
CURRENT_PATH="/var/www/photobooksgallery"

echo "🚀 Начинаем правильный Git-деплой..."

# 1. Клонируем чистую версию в новую папку
ssh $SERVER "
cd /var/www &&
echo '📥 Клонируем репозиторий в новую папку...' &&
rm -rf photobooksgallery-git &&
git clone $REPO_URL photobooksgallery-git &&
cd photobooksgallery-git &&

echo '📦 Устанавливаем зависимости...' &&
npm install &&

echo '🔧 Копируем .env файл...' &&
cp ../photobooksgallery/.env . &&

echo '🏗️ Собираем проект...' &&
npm run build &&

echo '🔄 Останавливаем старый PM2...' &&
pm2 stop photobooksgallery-admin &&

echo '🔄 Переключаем на новую версию...' &&
cd /var/www &&
mv photobooksgallery photobooksgallery-old-$(date +%Y%m%d_%H%M%S) &&
mv photobooksgallery-git photobooksgallery &&

echo '▶️ Запускаем PM2...' &&
cd photobooksgallery &&
pm2 start ecosystem.config.js --name photobooksgallery-admin ||
pm2 restart photobooksgallery-admin &&

echo '✅ Git-деплой завершен!'
"