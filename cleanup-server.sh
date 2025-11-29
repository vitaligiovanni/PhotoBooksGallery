#!/bin/bash
# Скрипт тщательной очистки production сервера от мусора

echo "🧹 НАЧАЛО ТЩАТЕЛЬНОЙ ОЧИСТКИ СЕРВЕРА"
echo "======================================"

# Показать текущее использование диска
echo ""
echo "📊 Использование диска ДО очистки:"
df -h /

# 1. Остановить все контейнеры
echo ""
echo "🛑 Остановка всех Docker контейнеров..."
cd /root/photobooks 2>/dev/null || cd /var/www/photobooksgallery 2>/dev/null || true
docker compose down 2>/dev/null || docker-compose down 2>/dev/null || true

# 2. Удалить старые Docker образы
echo ""
echo "🗑️  Удаление неиспользуемых Docker образов..."
docker image prune -af --filter "until=24h"

# 3. Удалить старые Docker volumes
echo ""
echo "🗑️  Удаление неиспользуемых Docker volumes..."
docker volume prune -f

# 4. Удалить старые Docker networks
echo ""
echo "🗑️  Удаление неиспользуемых Docker networks..."
docker network prune -f

# 5. Удалить старые build cache
echo ""
echo "🗑️  Очистка Docker build cache..."
docker builder prune -af

# 6. Очистка системного кэша
echo ""
echo "🗑️  Очистка системного кэша..."
sync
echo 3 > /proc/sys/vm/drop_caches 2>/dev/null || true

# 7. Удалить старые логи
echo ""
echo "🗑️  Удаление старых логов..."
find /var/log -type f -name "*.log" -mtime +7 -delete 2>/dev/null || true
find /var/log -type f -name "*.gz" -delete 2>/dev/null || true
truncate -s 0 /var/log/syslog 2>/dev/null || true
truncate -s 0 /var/log/messages 2>/dev/null || true

# 8. Удалить старые временные файлы
echo ""
echo "🗑️  Удаление временных файлов..."
rm -rf /tmp/* 2>/dev/null || true
rm -rf /var/tmp/* 2>/dev/null || true

# 9. Найти и удалить старые бэкапы директорий
echo ""
echo "🗑️  Поиск старых бэкапов..."
find /root -maxdepth 2 -type d -name "*.backup.*" -mtime +1 2>/dev/null | while read dir; do
    echo "  Удаляю старый бэкап: $dir"
    rm -rf "$dir"
done

find /var/www -maxdepth 2 -type d -name "*.backup.*" -mtime +1 2>/dev/null | while read dir; do
    echo "  Удаляю старый бэкап: $dir"
    rm -rf "$dir"
done

# 10. Удалить старые tar.gz архивы деплоя
echo ""
echo "🗑️  Удаление старых архивов деплоя..."
find /root -maxdepth 2 -name "deploy.tar.gz" -delete 2>/dev/null || true
find /var/www -maxdepth 2 -name "deploy.tar.gz" -delete 2>/dev/null || true

# 11. Очистка node_modules кэша (если есть)
echo ""
echo "🗑️  Очистка npm кэша..."
npm cache clean --force 2>/dev/null || true

# 12. Удалить старые uploads (если настроена ротация)
echo ""
echo "🗑️  Проверка uploads..."
if [ -d "/root/photobooks/uploads" ]; then
    UPLOADS_SIZE=$(du -sh /root/photobooks/uploads 2>/dev/null | cut -f1)
    echo "  Размер uploads: $UPLOADS_SIZE"
fi

if [ -d "/var/www/photobooksgallery/uploads" ]; then
    UPLOADS_SIZE=$(du -sh /var/www/photobooksgallery/uploads 2>/dev/null | cut -f1)
    echo "  Размер uploads: $UPLOADS_SIZE"
fi

# 13. Удалить старые ispor4ennyy проект если есть
echo ""
echo "🗑️  Поиск старых сломанных проектов..."
if [ -d "/var/www/photobooksgallery" ]; then
    echo "  Найден старый проект в /var/www/photobooksgallery"
    OLD_SIZE=$(du -sh /var/www/photobooksgallery 2>/dev/null | cut -f1)
    echo "  Размер: $OLD_SIZE"
    echo "  ⚠️  Не удаляю автоматически - может быть используется"
fi

# 14. Очистка apt кэша
echo ""
echo "🗑️  Очистка apt кэша..."
apt-get clean 2>/dev/null || apk cache clean 2>/dev/null || true

# 15. Показать самые большие директории
echo ""
echo "📊 Топ-10 самых больших директорий в /root:"
du -h /root 2>/dev/null | sort -rh | head -10 || true

echo ""
echo "📊 Топ-10 самых больших директорий в /var:"
du -h /var 2>/dev/null | sort -rh | head -10 || true

# Показать результат
echo ""
echo "📊 Использование диска ПОСЛЕ очистки:"
df -h /

echo ""
echo "✅ ОЧИСТКА ЗАВЕРШЕНА!"
echo "======================================"
