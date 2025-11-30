import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

export interface BackupFile {
  name: string;
  path: string;
  size: number;      // MB
  ageInDays: number;
  createdAt: Date;
}

/**
 * Сканирует директорию на наличие старых бэкапов
 */
export async function scanOldBackups(directory: string, olderThanDays: number = 30): Promise<BackupFile[]> {
  try {
    await fs.access(directory);
  } catch {
    console.warn(`[Backup Cleaner] Directory not found: ${directory}`);
    return [];
  }
  
  try {
    const files = await fs.readdir(directory);
    const backups: BackupFile[] = [];
    const now = Date.now();
    
    for (const file of files) {
      const filePath = path.join(directory, file);
      const stats = await fs.stat(filePath);
      
      if (!stats.isFile()) continue;
      
      // Фильтруем только файлы бэкапов (sql, dump, tar, gz и т.д.)
      if (!/(\.sql|\.dump|\.tar|\.gz|\.zip|\.bak)$/i.test(file)) continue;
      
      const ageInDays = Math.floor((now - stats.mtimeMs) / (1000 * 60 * 60 * 24));
      
      if (ageInDays >= olderThanDays) {
        backups.push({
          name: file,
          path: filePath,
          size: Math.round(stats.size / 1024 / 1024 * 10) / 10, // MB с 1 знаком
          ageInDays,
          createdAt: stats.mtime,
        });
      }
    }
    
    // Сортируем по возрасту (старые первыми)
    backups.sort((a, b) => b.ageInDays - a.ageInDays);
    
    return backups;
  } catch (error) {
    console.error('[Backup Cleaner] Error scanning backups:', error);
    return [];
  }
}

/**
 * Форматирует сообщение о старых бэкапах
 */
export function formatOldBackupsMessage(backups: BackupFile[]): string {
  if (backups.length === 0) {
    return '✅ **Старые бэкапы не найдены**\n\nВсе файлы актуальны.';
  }
  
  const totalSize = backups.reduce((sum, b) => sum + b.size, 0);
  
  let message = `🗑️ **Найдено старых бэкапов: ${backups.length}**\n`;
  message += `💾 Общий размер: ${totalSize.toFixed(1)} MB\n\n`;
  
  // Показываем топ-10 самых старых или больших
  const top = backups.slice(0, 10);
  
  for (const backup of top) {
    message += `📄 **${backup.name}**\n`;
    message += `   └ Размер: ${backup.size} MB\n`;
    message += `   └ Возраст: ${backup.ageInDays} дней\n`;
    message += `   └ Создан: ${backup.createdAt.toLocaleDateString('ru-RU')}\n\n`;
  }
  
  if (backups.length > 10) {
    message += `\n... и ещё ${backups.length - 10} файлов`;
  }
  
  return message;
}

/**
 * Удаляет список бэкапов
 */
export async function deleteBackups(backups: BackupFile[]): Promise<{ success: boolean; deleted: number; errors: string[] }> {
  const errors: string[] = [];
  let deleted = 0;
  
  for (const backup of backups) {
    try {
      await fs.unlink(backup.path);
      deleted++;
      console.log(`[Backup Cleaner] Deleted: ${backup.name}`);
    } catch (error: any) {
      errors.push(`${backup.name}: ${error.message}`);
      console.error(`[Backup Cleaner] Failed to delete ${backup.name}:`, error);
    }
  }
  
  return {
    success: errors.length === 0,
    deleted,
    errors,
  };
}

/**
 * Сканирует несколько директорий и предлагает очистку
 */
export async function scanAllBackupDirs(): Promise<{ directory: string; backups: BackupFile[] }[]> {
  const dirs = [
    '/root/backups',
    '/root',
    path.join(process.cwd(), 'backups'),
    process.cwd(), // Корень проекта
  ];
  
  const results: { directory: string; backups: BackupFile[] }[] = [];
  
  for (const dir of dirs) {
    try {
      const backups = await scanOldBackups(dir, 30);
      if (backups.length > 0) {
        results.push({ directory: dir, backups });
      }
    } catch (error) {
      // Пропускаем недоступные директории
    }
  }
  
  return results;
}

/**
 * Форматирует сводное сообщение по всем директориям
 */
export function formatAllBackupsSummary(results: { directory: string; backups: BackupFile[] }[]): string {
  if (results.length === 0) {
    return '✅ **Старые бэкапы не найдены**\n\nВсе директории чисты.';
  }
  
  let message = '🗑️ **Сводка по старым бэкапам**\n\n';
  
  for (const { directory, backups } of results) {
    const totalSize = backups.reduce((sum, b) => sum + b.size, 0);
    message += `📁 **${directory}**\n`;
    message += `   └ Файлов: ${backups.length}\n`;
    message += `   └ Размер: ${totalSize.toFixed(1)} MB\n\n`;
  }
  
  const totalFiles = results.reduce((sum, r) => sum + r.backups.length, 0);
  const totalSize = results.reduce((sum, r) => 
    sum + r.backups.reduce((s, b) => s + b.size, 0), 0
  );
  
  message += `\n📊 **Итого:**\n`;
  message += `• Файлов: ${totalFiles}\n`;
  message += `• Размер: ${totalSize.toFixed(1)} MB\n`;
  message += `• Освободится: ~${totalSize.toFixed(1)} MB`;
  
  return message;
}

/**
 * Удаляет все старые бэкапы из всех директорий
 */
export async function cleanupAllOldBackups(): Promise<{ deleted: number; freedSpace: number; errors: string[] }> {
  const results = await scanAllBackupDirs();
  let totalDeleted = 0;
  let totalFreed = 0;
  const allErrors: string[] = [];
  
  for (const { backups } of results) {
    const { deleted, errors } = await deleteBackups(backups);
    totalDeleted += deleted;
    totalFreed += backups.slice(0, deleted).reduce((sum, b) => sum + b.size, 0);
    allErrors.push(...errors);
  }
  
  return {
    deleted: totalDeleted,
    freedSpace: totalFreed,
    errors: allErrors,
  };
}
