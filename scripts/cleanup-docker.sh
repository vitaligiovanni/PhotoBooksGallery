#!/bin/bash
# =============================================================================
# Автоматическая очистка Docker и старых файлов на продакшн сервере
# =============================================================================
# Запускается еженедельно через cron для предотвращения накопления мусора
#
# Что делает:
# - Удаляет неиспользуемые Docker образы, контейнеры, volumes
# - Очищает build cache
# - Удаляет старые логи (>7 дней)
# - Удаляет временные файлы деплоя
# - Очищает apt кэш

LOG_FILE="/var/log/docker-cleanup.log"

echo "=================================================================" | tee -a "$LOG_FILE"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting cleanup..." | tee -a "$LOG_FILE"
echo "=================================================================" | tee -a "$LOG_FILE"

# 1. Очистка Docker (удаляет всё неиспользуемое)
echo "" | tee -a "$LOG_FILE"
echo "[1/6] Cleaning Docker..." | tee -a "$LOG_FILE"
docker system prune -af --volumes 2>&1 | tee -a "$LOG_FILE" | grep -i "reclaimed"

# 2. Очистка apt кэша
echo "" | tee -a "$LOG_FILE"
echo "[2/6] Cleaning apt cache..." | tee -a "$LOG_FILE"
apt-get clean 2>&1 | tee -a "$LOG_FILE"
apt-get autoremove -y 2>&1 | tee -a "$LOG_FILE" | grep -E "removed|freed"

# 3. Очистка старых логов журнала (хранить только последние 7 дней)
echo "" | tee -a "$LOG_FILE"
echo "[3/6] Cleaning old journal logs..." | tee -a "$LOG_FILE"
journalctl --vacuum-time=7d 2>&1 | tee -a "$LOG_FILE" | grep -i "freed"

# 4. Очистка старых архивов деплоя (старше 1 дня)
echo "" | tee -a "$LOG_FILE"
echo "[4/6] Cleaning old deploy archives..." | tee -a "$LOG_FILE"
find /opt -name 'deploy-*.zip' -mtime +1 -type f -delete 2>&1 | tee -a "$LOG_FILE"
find /opt -name 'deploy-*.tar' -mtime +1 -type f -delete 2>&1 | tee -a "$LOG_FILE"
find /opt -name 'backend-update*.tar' -mtime +1 -type f -delete 2>&1 | tee -a "$LOG_FILE"
echo "Old archives removed" | tee -a "$LOG_FILE"

# 5. Очистка временных файлов (старше 3 дней)
echo "" | tee -a "$LOG_FILE"
echo "[5/6] Cleaning temp files..." | tee -a "$LOG_FILE"
find /tmp -type f -mtime +3 -delete 2>/dev/null
echo "Temp files cleaned" | tee -a "$LOG_FILE"

# 6. Показать результат
echo "" | tee -a "$LOG_FILE"
echo "[6/6] Disk usage after cleanup:" | tee -a "$LOG_FILE"
df -h / | grep -v Filesystem | tee -a "$LOG_FILE"

echo "" | tee -a "$LOG_FILE"
echo "=================================================================" | tee -a "$LOG_FILE"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Cleanup completed successfully!" | tee -a "$LOG_FILE"
echo "=================================================================" | tee -a "$LOG_FILE"

# Показать Docker статистику
echo "" | tee -a "$LOG_FILE"
echo "Docker disk usage:" | tee -a "$LOG_FILE"
docker system df | tee -a "$LOG_FILE"
