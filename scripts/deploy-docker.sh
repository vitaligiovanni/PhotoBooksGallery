#!/bin/bash
# deploy-docker.sh - Деплой через Docker на Beget

set -e  # Останавливаемся при ошибке

echo "🚀 Начинаем Docker деплой на Beget..."

# Проверяем наличие SSH ключа
if [ ! -f ~/.ssh/id_rsa ]; then
    echo "❌ SSH ключ не найден. Создайте его командой: ssh-keygen -t rsa -b 4096 -C 'your_email@example.com'"
    exit 1
fi

# Проверяем подключение к серверу
echo "🔍 Проверяем подключение к серверу..."
ssh -o ConnectTimeout=10 -o BatchMode=yes user@your-beget-server "echo '✅ SSH подключение работает'" || {
    echo "❌ Не удалось подключиться к серверу. Проверьте SSH ключ и адрес сервера."
    exit 1
}

# Создаем временную директорию на сервере
REMOTE_DIR="/home/user/docker-deploy-$(date +%Y%m%d_%H%M%S)"
echo "📁 Создаем директорию на сервере: $REMOTE_DIR"
ssh user@your-beget-server "mkdir -p $REMOTE_DIR"

# Копируем файлы на сервер
echo "📤 Копируем файлы на сервер..."
rsync -avz --exclude-from='.dockerignore' \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='uploads' \
    --exclude='*.log' \
    . user@your-beget-server:$REMOTE_DIR/

# Останавливаем старый контейнер если работает
echo "🛑 Останавливаем старые контейнеры..."
ssh user@your-beget-server "cd $REMOTE_DIR && docker-compose -f docker-compose.prod.yml down" || true

# Запускаем новые контейнеры
echo "🐳 Запускаем новые контейнеры..."
ssh user@your-beget-server "cd $REMOTE_DIR && docker-compose -f docker-compose.prod.yml up -d --build"

# Ждем запуска
echo "⏳ Ждем запуска приложения..."
sleep 10

# Проверяем здоровье
echo "🏥 Проверяем здоровье приложения..."
ssh user@your-beget-server "curl -f http://localhost:3000/api/health" || {
    echo "❌ Приложение не запустилось корректно"
    exit 1
}

# Проверяем CRM функции
echo "🔧 Проверяем CRM функции..."
ssh user@your-beget-server "curl -f http://localhost:3000/api/categories" || {
    echo "❌ CRM API не работает"
    exit 1
}

# Очищаем старые директории (оставляем последние 3)
echo "🧹 Очищаем старые деплой директории..."
ssh user@your-beget-server "ls -dt /home/user/docker-deploy-* | tail -n +4 | xargs rm -rf" || true

echo "✅ Деплой завершен успешно!"
echo "🌐 Сайт доступен по адресу: http://your-beget-server"
echo "📊 CRM панель: http://your-beget-server/admin"