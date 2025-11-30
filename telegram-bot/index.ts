import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import { getDiskStats, formatDiskMessage, getCleanupSuggestions, shouldAlert, executeCleanup } from './disk-monitor';
import { getContainersStatus, getUnhealthyContainers, formatUnhealthyAlert, checkLogsForErrors } from './container-health';
import { scanAllBackupDirs, formatAllBackupsSummary } from './backup-cleaner';
import { handleMenuCommand, handleMenuCallback } from './interactive-menu';

dotenv.config();

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) {
  console.error('[Telegram Bot] TELEGRAM_TOKEN or TELEGRAM_CHAT_ID not set in .env');
  process.exit(1);
}

// Инициализируем бота
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
const chatId = parseInt(TELEGRAM_CHAT_ID);

// Состояние для отслеживания алертов
let lastDiskAlert: number | null = null;
let lastContainerCheck = new Date();
let knownUnhealthyContainers = new Set<string>();

console.log('[Telegram Bot] 🤖 Бот запущен и готов к работе');

/**
 * Отправить сообщение с защитой от ошибок
 */
async function safeSend(message: string, options?: any) {
  try {
    await bot.sendMessage(chatId, message, options);
  } catch (error) {
    console.error('[Telegram Bot] Send error:', error);
  }
}

/**
 * Мониторинг диска (каждый час)
 */
async function monitorDisk() {
  try {
    const stats = await getDiskStats('/');
    
    if (shouldAlert(stats, lastDiskAlert)) {
      const message = formatDiskMessage(stats);
      const suggestions = getCleanupSuggestions(stats);
      
      let fullMessage = `⚠️ **ПРЕДУПРЕЖДЕНИЕ О ДИСКЕ**\n\n${message}\n\n`;
      
      if (suggestions.length > 0) {
        fullMessage += '💡 **Рекомендуемые действия:**\n\n';
        suggestions.forEach(s => {
          fullMessage += `• ${s.description} (${s.estimatedSpace})\n`;
        });
        fullMessage += '\n🔧 Используйте /menu для быстрой очистки';
      }
      
      await safeSend(fullMessage, { parse_mode: 'Markdown' });
      lastDiskAlert = stats.percent;
    }
  } catch (error) {
    console.error('[Disk Monitor] Error:', error);
  }
}

/**
 * Мониторинг контейнеров (каждые 10 минут)
 */
async function monitorContainers() {
  try {
    const containers = await getContainersStatus();
    const unhealthy = getUnhealthyContainers(containers);
    
    // Отправляем алерт только для НОВЫХ проблемных контейнеров
    const newUnhealthy = unhealthy.filter(c => !knownUnhealthyContainers.has(c.name));
    
    if (newUnhealthy.length > 0) {
      const message = formatUnhealthyAlert(newUnhealthy);
      await safeSend(message, { parse_mode: 'Markdown' });
      
      // Запоминаем проблемные контейнеры
      unhealthy.forEach(c => knownUnhealthyContainers.add(c.name));
    }
    
    // Если все здоровы — очищаем список известных проблемных
    if (unhealthy.length === 0 && knownUnhealthyContainers.size > 0) {
      await safeSend('✅ Все контейнеры восстановлены и работают нормально!');
      knownUnhealthyContainers.clear();
    }
  } catch (error) {
    console.error('[Container Monitor] Error:', error);
  }
}

/**
 * Проверка логов на ошибки (каждые 15 минут)
 */
async function monitorLogs() {
  try {
    const criticalServices = ['backend', 'ar-service', 'frontend'];
    
    for (const service of criticalServices) {
      const { hasErrors, errorLines } = await checkLogsForErrors(service);
      
      if (hasErrors && errorLines.length > 0) {
        let message = `🔴 **Ошибки в логах: ${service}**\n\n`;
        message += '```\n';
        message += errorLines.slice(0, 5).join('\n').slice(0, 500);
        message += '\n```\n\n';
        message += `Используйте /logs ${service} для полного вывода`;
        
        await safeSend(message, { parse_mode: 'Markdown' });
      }
    }
  } catch (error) {
    console.error('[Log Monitor] Error:', error);
  }
}

/**
 * Еженедельная проверка старых бэкапов (раз в неделю по понедельникам в 10:00)
 */
async function checkOldBackups() {
  try {
    const results = await scanAllBackupDirs();
    
    if (results.length > 0) {
      const message = formatAllBackupsSummary(results);
      await safeSend(`🗑️ **Еженедельная проверка бэкапов**\n\n${message}\n\n🔧 Используйте /menu → Старые бэкапы для очистки`, {
        parse_mode: 'Markdown',
      });
    }
  } catch (error) {
    console.error('[Backup Check] Error:', error);
  }
}

/**
 * Команды бота
 */
bot.onText(/\/start/, async (msg) => {
  const welcomeMessage = `👋 **Привет! Я бот-администратор сервера photobooksgallery.am**

Я помогаю следить за сервером и упрощаю обслуживание:

🔹 **Автоматический мониторинг:**
• 💾 Диск (каждый час)
• 📦 Docker контейнеры (каждые 10 мин)
• 📋 Логи сервисов (каждые 15 мин)
• 🗑️ Старые бэкапы (раз в неделю)

🔹 **Доступные команды:**
/menu - Интерактивное меню управления
/status - Общий статус сервера
/disk - Состояние диска
/containers - Статус контейнеров
/backups - Проверить старые бэкапы
/logs [service] - Показать логи

Используйте /menu для быстрого доступа ко всем функциям!`;

  await safeSend(welcomeMessage, { parse_mode: 'Markdown' });
});

bot.onText(/\/menu/, async (msg) => {
  await handleMenuCommand(bot, msg.chat.id);
});

bot.onText(/\/status/, async (msg) => {
  const statusMsg = await bot.sendMessage(msg.chat.id, '🔄 Собираю информацию...');
  
  try {
    const [diskStats, containers] = await Promise.all([
      getDiskStats('/'),
      getContainersStatus(),
    ]);
    
    const unhealthy = getUnhealthyContainers(containers);
    
    let message = `📊 **Статус сервера** (${new Date().toLocaleString('ru-RU')})\n\n`;
    
    // Диск
    const diskEmoji = diskStats.percent > 80 ? '🔴' : diskStats.percent > 60 ? '🟠' : '🟢';
    message += `${diskEmoji} **Диск**: ${diskStats.used}GB / ${diskStats.total}GB (${diskStats.percent}%)\n`;
    message += `   └ Свободно: ${diskStats.free}GB\n\n`;
    
    // Контейнеры
    const runningCount = containers.filter(c => c.status === 'running').length;
    const healthyCount = containers.filter(c => c.health === 'healthy').length;
    const containersEmoji = unhealthy.length === 0 ? '🟢' : '🔴';
    
    message += `${containersEmoji} **Контейнеры**: ${runningCount}/${containers.length} запущено\n`;
    message += `   └ Healthy: ${healthyCount}\n`;
    
    if (unhealthy.length > 0) {
      message += `   └ ⚠️ Проблемные: ${unhealthy.map(c => c.name).join(', ')}\n`;
    }
    
    message += `\n🔧 Используйте /menu для управления`;
    
    await bot.editMessageText(message, {
      chat_id: msg.chat.id,
      message_id: statusMsg.message_id,
      parse_mode: 'Markdown',
    });
  } catch (error: any) {
    await bot.editMessageText(`❌ Ошибка: ${error.message}`, {
      chat_id: msg.chat.id,
      message_id: statusMsg.message_id,
    });
  }
});

bot.onText(/\/disk/, async (msg) => {
  try {
    const stats = await getDiskStats('/');
    const message = formatDiskMessage(stats);
    await safeSend(message, { parse_mode: 'Markdown' });
  } catch (error: any) {
    await safeSend(`❌ Ошибка: ${error.message}`);
  }
});

bot.onText(/\/containers/, async (msg) => {
  try {
    const containers = await getContainersStatus();
    const message = formatContainersMessage(containers);
    await safeSend(message, { parse_mode: 'Markdown' });
  } catch (error: any) {
    await safeSend(`❌ Ошибка: ${error.message}`);
  }
});

bot.onText(/\/backups/, async (msg) => {
  const statusMsg = await bot.sendMessage(msg.chat.id, '🔄 Сканирую бэкапы...');
  
  try {
    const results = await scanAllBackupDirs();
    const message = formatAllBackupsSummary(results);
    
    await bot.editMessageText(message, {
      chat_id: msg.chat.id,
      message_id: statusMsg.message_id,
      parse_mode: 'Markdown',
    });
  } catch (error: any) {
    await bot.editMessageText(`❌ Ошибка: ${error.message}`, {
      chat_id: msg.chat.id,
      message_id: statusMsg.message_id,
    });
  }
});

bot.onText(/\/logs\s*(.*)/, async (msg, match) => {
  const service = match?.[1]?.trim() || 'backend';
  
  try {
    const { getContainerLogs } = await import('./container-health');
    const logs = await getContainerLogs(service, 40);
    const truncated = logs.slice(-3000);
    
    await safeSend(`📋 **Логи: ${service}**\n\n\`\`\`\n${truncated}\n\`\`\``, {
      parse_mode: 'Markdown',
    });
  } catch (error: any) {
    await safeSend(`❌ Ошибка: ${error.message}`);
  }
});

// Обработка callback кнопок
bot.on('callback_query', async (query) => {
  await handleMenuCallback(bot, query);
});

/**
 * Запуск периодических проверок
 */
setInterval(monitorDisk, 60 * 60 * 1000); // Каждый час
setInterval(monitorContainers, 10 * 60 * 1000); // Каждые 10 минут
setInterval(monitorLogs, 15 * 60 * 1000); // Каждые 15 минут

// Еженедельная проверка бэкапов (понедельник 10:00)
setInterval(() => {
  const now = new Date();
  if (now.getDay() === 1 && now.getHours() === 10 && now.getMinutes() === 0) {
    checkOldBackups();
  }
}, 60 * 1000); // Проверяем каждую минуту

// Первая проверка при старте (через 10 секунд)
setTimeout(async () => {
  console.log('[Telegram Bot] Running initial checks...');
  await monitorDisk();
  await monitorContainers();
  await safeSend('🚀 **Бот мониторинга запущен!**\n\nИспользуйте /menu для управления', {
    parse_mode: 'Markdown',
  });
}, 10000);

// Обработка ошибок
bot.on('polling_error', (error) => {
  console.error('[Telegram Bot] Polling error:', error);
});

process.on('SIGINT', () => {
  console.log('[Telegram Bot] Stopping...');
  bot.stopPolling();
  process.exit(0);
});

export default bot;
