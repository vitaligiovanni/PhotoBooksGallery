#!/usr/bin/env bash
# setup-git-server.sh - Настройка Git-based deployment на Beget сервере
# Запускается ОДИН РАЗ для инициализации

set -euo pipefail

APP_NAME="photobooksgallery"
APP_DIR="/var/www/$APP_NAME"
DATA_DIR="/var/www/$APP_NAME-data"
REPO_URL=""  # Will be set when you have remote repository

echo "=== Git Server Setup for $APP_NAME ==="

# Проверяем наличие Git
if ! command -v git >/dev/null 2>&1; then
    echo "ERROR: Git не установлен на сервере"
    exit 1
fi

# Создаём директории
echo "Creating directories..."
mkdir -p "$APP_DIR"
mkdir -p "$DATA_DIR/uploads"
mkdir -p "$APP_DIR/backups"

# Инициализируем Git репозиторий или клонируем
cd "$APP_DIR"

if [[ -n "$REPO_URL" ]]; then
    echo "Cloning repository from $REPO_URL..."
    git clone "$REPO_URL" . || {
        echo "ERROR: Failed to clone repository"
        exit 1
    }
else
    echo "Repository URL not set. Manual setup required:"
    echo "1. Create repository on GitHub/GitLab"
    echo "2. Set REPO_URL variable in this script"
    echo "3. Re-run this script"
    echo ""
    echo "For now, initializing empty Git repository..."
    git init
    git branch -M main
fi

# Копируем текущие файлы (если есть) в Git
if [[ -f "../$APP_NAME.old/package.json" ]]; then
    echo "Found existing installation, merging files..."
    cp -r "../$APP_NAME.old/"* . 2>/dev/null || true
    git add .
    git commit -m "Initial commit from existing installation" || true
fi

# Устанавливаем правильные права
chown -R www-data:www-data "$APP_DIR" 2>/dev/null || true
chown -R www-data:www-data "$DATA_DIR" 2>/dev/null || true

# Копируем deploy скрипт
if [[ ! -f "deploy-git.sh" ]]; then
    echo "ERROR: deploy-git.sh not found in repository"
    echo "Make sure to commit and push deploy-git.sh to your repository"
    exit 1
fi

chmod +x deploy-git.sh

echo "✅ Git server setup completed!"
echo ""
echo "Next steps:"
echo "1. On your local machine, add remote:"
echo "   git remote add origin <your-repo-url>"
echo "   git push -u origin main"
echo ""
echo "2. Test deployment:"
echo "   ./scripts/git-deploy.ps1 -Message 'Initial deployment'"
echo ""
echo "3. Your deploy script is now available at:"
echo "   $APP_DIR/deploy-git.sh"