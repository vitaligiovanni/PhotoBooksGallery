import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface DiskStats {
  total: number;      // GB
  used: number;       // GB
  free: number;       // GB
  percent: number;    // %
  path: string;
}

/**
 * Получить статистику диска для заданного пути
 */
export async function getDiskStats(path: string = '/'): Promise<DiskStats> {
  try {
    const { stdout } = await execAsync(`df -BG ${path} | tail -1`);
    const parts = stdout.trim().split(/\s+/);
    
    const total = parseInt(parts[1].replace('G', ''));
    const used = parseInt(parts[2].replace('G', ''));
    const free = parseInt(parts[3].replace('G', ''));
    const percent = parseInt(parts[4].replace('%', ''));
    
    return { total, used, free, percent, path: parts[5] };
  } catch (error) {
    console.error('[Disk Monitor] Error getting disk stats:', error);
    throw error;
  }
}

/**
 * Форматирует сообщение о состоянии диска
 */
export function formatDiskMessage(stats: DiskStats): string {
  const emoji = stats.percent > 80 ? '🔴' : stats.percent > 60 ? '🟠' : '🟢';
  
  return `${emoji} **Статус диска** (${stats.path})
  
💾 Всего: ${stats.total}GB
📊 Использовано: ${stats.used}GB (${stats.percent}%)
✅ Свободно: ${stats.free}GB

${stats.percent > 80 ? '⚠️ **ВНИМАНИЕ**: Мало свободного места!' : ''}`;
}

/**
 * Предлагает варианты очистки в зависимости от занятости диска
 */
export interface CleanupSuggestion {
  type: 'docker' | 'logs' | 'backups' | 'temp';
  description: string;
  estimatedSpace: string;
  command: string;
  requiresConfirm: boolean;
}

export function getCleanupSuggestions(stats: DiskStats): CleanupSuggestion[] {
  const suggestions: CleanupSuggestion[] = [];
  
  if (stats.percent > 50) {
    suggestions.push({
      type: 'docker',
      description: '🐳 Очистить неиспользуемые Docker образы и кеш',
      estimatedSpace: '~2-5GB',
      command: 'docker system prune -af --volumes',
      requiresConfirm: true,
    });
  }
  
  if (stats.percent > 60) {
    suggestions.push({
      type: 'logs',
      description: '📋 Очистить старые логи systemd (>7 дней)',
      estimatedSpace: '~0.5-2GB',
      command: 'journalctl --vacuum-time=7d',
      requiresConfirm: true,
    });
  }
  
  if (stats.percent > 40) {
    suggestions.push({
      type: 'backups',
      description: '💾 Удалить старые бэкапы (>30 дней)',
      estimatedSpace: '~1-10GB',
      command: 'find /root/backups -type f -mtime +30',
      requiresConfirm: true,
    });
  }
  
  suggestions.push({
    type: 'temp',
    description: '🗑️ Очистить временные файлы',
    estimatedSpace: '~0.1-1GB',
    command: 'rm -rf /tmp/* /var/tmp/*',
    requiresConfirm: false,
  });
  
  return suggestions;
}

/**
 * Выполнить команду очистки
 */
export async function executeCleanup(suggestion: CleanupSuggestion): Promise<{ success: boolean; output: string; freedSpace?: number }> {
  try {
    const statsBefore = await getDiskStats('/');
    
    console.log(`[Disk Monitor] Executing cleanup: ${suggestion.type}`);
    const { stdout, stderr } = await execAsync(suggestion.command);
    
    // Подождём 2 секунды для обновления статистики
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const statsAfter = await getDiskStats('/');
    const freedSpace = statsBefore.used - statsAfter.used;
    
    return {
      success: true,
      output: stdout || stderr || 'Команда выполнена успешно',
      freedSpace,
    };
  } catch (error: any) {
    console.error(`[Disk Monitor] Cleanup failed:`, error);
    return {
      success: false,
      output: error.message || 'Ошибка выполнения команды',
    };
  }
}

/**
 * Проверяет, нужно ли отправить предупреждение о диске
 */
export function shouldAlert(stats: DiskStats, lastAlertPercent: number | null): boolean {
  // Отправляем алерт если:
  // 1. Превышен критический порог (80%) и не было алерта или последний был при меньшем %
  // 2. Превышен предупредительный порог (70%) и прошло достаточно времени с последнего алерта
  
  if (stats.percent >= 80 && (lastAlertPercent === null || lastAlertPercent < 80)) {
    return true;
  }
  
  if (stats.percent >= 70 && (lastAlertPercent === null || lastAlertPercent < 70)) {
    return true;
  }
  
  return false;
}
