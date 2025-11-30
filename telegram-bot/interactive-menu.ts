import TelegramBot from 'node-telegram-bot-api';
import { getDiskStats, formatDiskMessage, getCleanupSuggestions } from './disk-monitor';
import { getContainersStatus, formatContainersMessage, restartContainer, getContainerLogs } from './container-health';
import { scanAllBackupDirs, formatAllBackupsSummary, cleanupAllOldBackups } from './backup-cleaner';

/**
 * Главное интерактивное меню с быстрыми действиями
 */
export function getMainMenuKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '💾 Статус диска', callback_data: 'menu_disk' },
        { text: '📦 Контейнеры', callback_data: 'menu_containers' },
      ],
      [
        { text: '🗑️ Старые бэкапы', callback_data: 'menu_backups' },
        { text: '🧹 Очистить Docker', callback_data: 'menu_docker_clean' },
      ],
      [
        { text: '📋 Логи backend', callback_data: 'logs_backend' },
        { text: '📋 Логи ar-service', callback_data: 'logs_ar-service' },
      ],
      [
        { text: '🔄 Обновить', callback_data: 'menu_refresh' },
      ],
    ],
  };
}

/**
 * Клавиатура для подтверждения действий
 */
export function getConfirmKeyboard(action: string) {
  return {
    inline_keyboard: [
      [
        { text: '✅ Да, выполнить', callback_data: `confirm_${action}` },
        { text: '❌ Отмена', callback_data: 'cancel' },
      ],
    ],
  };
}

/**
 * Клавиатура для выбора контейнера
 */
export function getContainerActionsKeyboard(containerName: string) {
  return {
    inline_keyboard: [
      [
        { text: '🔄 Перезапустить', callback_data: `restart_${containerName}` },
        { text: '📋 Показать логи', callback_data: `logs_${containerName}` },
      ],
      [
        { text: '◀️ Назад', callback_data: 'menu_containers' },
      ],
    ],
  };
}

/**
 * Обработчик команды /menu - показывает главное меню
 */
export async function handleMenuCommand(bot: TelegramBot, chatId: number) {
  const message = `🤖 **Панель управления сервером**

Выберите действие:`;

  await bot.sendMessage(chatId, message, {
    parse_mode: 'Markdown',
    reply_markup: getMainMenuKeyboard(),
  });
}

/**
 * Обработчик callback кнопок меню
 */
export async function handleMenuCallback(bot: TelegramBot, query: TelegramBot.CallbackQuery) {
  const chatId = query.message!.chat.id;
  const messageId = query.message!.message_id;
  const data = query.callback_data!;

  try {
    // Статус диска
    if (data === 'menu_disk') {
      await bot.answerCallbackQuery(query.id, { text: 'Проверяю диск...' });
      const stats = await getDiskStats('/');
      const message = formatDiskMessage(stats);
      const suggestions = getCleanupSuggestions(stats);
      
      let keyboard = {
        inline_keyboard: [
          ...suggestions.map(s => [{
            text: `${s.type === 'docker' ? '🐳' : s.type === 'logs' ? '📋' : s.type === 'backups' ? '🗑️' : '🧹'} ${s.description.split(' ').slice(1).join(' ')}`,
            callback_data: `cleanup_${s.type}`,
          }]),
          [{ text: '◀️ Назад', callback_data: 'menu_refresh' }],
        ],
      };
      
      await bot.editMessageText(`${message}\n\n💡 **Доступные действия:**`, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      });
    }
    
    // Статус контейнеров
    else if (data === 'menu_containers') {
      await bot.answerCallbackQuery(query.id, { text: 'Проверяю контейнеры...' });
      const containers = await getContainersStatus();
      const message = formatContainersMessage(containers);
      
      const keyboard = {
        inline_keyboard: [
          ...containers.map(c => [{
            text: `${c.status === 'running' ? '🟢' : '🔴'} ${c.name}`,
            callback_data: `container_${c.name}`,
          }]),
          [{ text: '◀️ Назад', callback_data: 'menu_refresh' }],
        ],
      };
      
      await bot.editMessageText(message, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      });
    }
    
    // Детали контейнера
    else if (data.startsWith('container_')) {
      const containerName = data.replace('container_', '');
      await bot.answerCallbackQuery(query.id, { text: `Контейнер: ${containerName}` });
      
      const message = `📦 **Контейнер: ${containerName}**\n\nВыберите действие:`;
      
      await bot.editMessageText(message, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown',
        reply_markup: getContainerActionsKeyboard(containerName),
      });
    }
    
    // Перезапуск контейнера
    else if (data.startsWith('restart_')) {
      const containerName = data.replace('restart_', '');
      await bot.answerCallbackQuery(query.id, { text: 'Перезапускаю...' });
      
      await bot.editMessageText(`🔄 Перезапускаю контейнер **${containerName}**...`, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown',
      });
      
      const result = await restartContainer(containerName);
      
      await bot.editMessageText(result.message, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[{ text: '◀️ Назад к контейнерам', callback_data: 'menu_containers' }]],
        },
      });
    }
    
    // Логи контейнера
    else if (data.startsWith('logs_')) {
      const containerName = data.replace('logs_', '');
      await bot.answerCallbackQuery(query.id, { text: 'Получаю логи...' });
      
      const logs = await getContainerLogs(containerName, 30);
      const truncated = logs.slice(-3000); // Telegram лимит ~4096 символов
      
      await bot.sendMessage(chatId, `📋 **Логи: ${containerName}**\n\n\`\`\`\n${truncated}\n\`\`\``, {
        parse_mode: 'Markdown',
      });
      
      await bot.answerCallbackQuery(query.id, { text: 'Логи отправлены' });
    }
    
    // Старые бэкапы
    else if (data === 'menu_backups') {
      await bot.answerCallbackQuery(query.id, { text: 'Сканирую бэкапы...' });
      
      const results = await scanAllBackupDirs();
      const message = formatAllBackupsSummary(results);
      
      const keyboard = results.length > 0 ? {
        inline_keyboard: [
          [{ text: '🗑️ Удалить все старые бэкапы', callback_data: 'confirm_delete_backups' }],
          [{ text: '◀️ Назад', callback_data: 'menu_refresh' }],
        ],
      } : {
        inline_keyboard: [
          [{ text: '◀️ Назад', callback_data: 'menu_refresh' }],
        ],
      };
      
      await bot.editMessageText(message, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      });
    }
    
    // Подтверждение удаления бэкапов
    else if (data === 'confirm_delete_backups') {
      await bot.editMessageText(
        '⚠️ **Подтвердите удаление старых бэкапов**\n\nЭто действие нельзя отменить!',
        {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'Markdown',
          reply_markup: getConfirmKeyboard('delete_backups'),
        }
      );
    }
    
    // Удаление бэкапов
    else if (data === 'confirm_confirm_delete_backups') {
      await bot.answerCallbackQuery(query.id, { text: 'Удаляю бэкапы...' });
      
      await bot.editMessageText('🗑️ Удаляю старые бэкапы...', {
        chat_id: chatId,
        message_id: messageId,
      });
      
      const result = await cleanupAllOldBackups();
      
      let resultMessage = `✅ **Очистка завершена**\n\n`;
      resultMessage += `• Удалено файлов: ${result.deleted}\n`;
      resultMessage += `• Освобождено: ${result.freedSpace.toFixed(1)} MB\n`;
      
      if (result.errors.length > 0) {
        resultMessage += `\n⚠️ Ошибки: ${result.errors.length}\n`;
        resultMessage += result.errors.slice(0, 3).join('\n');
      }
      
      await bot.editMessageText(resultMessage, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[{ text: '◀️ Назад', callback_data: 'menu_refresh' }]],
        },
      });
    }
    
    // Очистка Docker
    else if (data === 'menu_docker_clean') {
      await bot.editMessageText(
        '🐳 **Очистка Docker**\n\nУдалить неиспользуемые образы, контейнеры и кеш?\n\n⚠️ Освободится ~2-5GB',
        {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'Markdown',
          reply_markup: getConfirmKeyboard('docker_prune'),
        }
      );
    }
    
    // Отмена
    else if (data === 'cancel') {
      await bot.answerCallbackQuery(query.id, { text: 'Отменено' });
      await handleMenuCommand(bot, chatId);
    }
    
    // Обновить главное меню
    else if (data === 'menu_refresh') {
      await bot.answerCallbackQuery(query.id, { text: 'Обновлено' });
      await bot.editMessageText('🤖 **Панель управления сервером**\n\nВыберите действие:', {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown',
        reply_markup: getMainMenuKeyboard(),
      });
    }
    
  } catch (error: any) {
    console.error('[Interactive Menu] Callback error:', error);
    await bot.answerCallbackQuery(query.id, {
      text: `Ошибка: ${error.message}`,
      show_alert: true,
    });
  }
}
