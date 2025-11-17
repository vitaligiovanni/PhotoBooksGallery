#!/bin/bash
# =============================================================================
# Установка автоматической очистки Docker на продакшн сервере
# =============================================================================
# Запустить на сервере: bash install-cleanup.sh

echo "Installing Docker cleanup automation..."

# 1. Копируем скрипт очистки
echo "[1/4] Installing cleanup script..."
cp /opt/photobooksgallery/scripts/cleanup-docker.sh /opt/cleanup-docker.sh
chmod +x /opt/cleanup-docker.sh
echo "✓ Script installed to /opt/cleanup-docker.sh"

# 2. Создаём лог-файл
echo "[2/4] Creating log file..."
touch /var/log/docker-cleanup.log
chmod 644 /var/log/docker-cleanup.log
echo "✓ Log file created: /var/log/docker-cleanup.log"

# 3. Добавляем в crontab (если ещё не добавлено)
echo "[3/4] Setting up cron job..."
CRON_JOB="0 3 * * 0 /opt/cleanup-docker.sh >> /var/log/docker-cleanup.log 2>&1"

# Проверяем есть ли уже задача
if ! crontab -l 2>/dev/null | grep -q "cleanup-docker.sh"; then
    # Добавляем новую задачу
    (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
    echo "✓ Cron job added: Every Sunday at 3:00 AM"
else
    echo "✓ Cron job already exists"
fi

# 4. Тестовый запуск
echo "[4/4] Testing cleanup script..."
echo ""
/opt/cleanup-docker.sh

echo ""
echo "================================================================="
echo "Installation completed!"
echo "================================================================="
echo ""
echo "Cleanup will run automatically:"
echo "  - Every Sunday at 3:00 AM"
echo ""
echo "To view logs:"
echo "  tail -f /var/log/docker-cleanup.log"
echo ""
echo "To run manually:"
echo "  /opt/cleanup-docker.sh"
echo ""
echo "To view cron schedule:"
echo "  crontab -l"
echo "================================================================="
