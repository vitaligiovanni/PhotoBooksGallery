import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface ContainerStatus {
  id: string;
  name: string;
  status: 'running' | 'exited' | 'restarting' | 'paused' | 'dead';
  health: 'healthy' | 'unhealthy' | 'starting' | 'none';
  uptime: string;
}

/**
 * Получить статус всех контейнеров проекта
 */
export async function getContainersStatus(): Promise<ContainerStatus[]> {
  try {
    const { stdout } = await execAsync(
      `docker ps -a --format "{{.ID}}|{{.Names}}|{{.Status}}|{{.State}}" --filter "label=com.docker.compose.project=photobooksgallery"`
    );
    
    const lines = stdout.trim().split('\n').filter(l => l);
    const containers: ContainerStatus[] = [];
    
    for (const line of lines) {
      const [id, name, statusStr, state] = line.split('|');
      
      // Парсим health из статуса (например: "Up 2 hours (healthy)")
      let health: ContainerStatus['health'] = 'none';
      if (statusStr.includes('(healthy)')) health = 'healthy';
      else if (statusStr.includes('(unhealthy)')) health = 'unhealthy';
      else if (statusStr.includes('(health: starting)')) health = 'starting';
      
      containers.push({
        id: id.substring(0, 12),
        name,
        status: state.toLowerCase() as any,
        health,
        uptime: statusStr,
      });
    }
    
    return containers;
  } catch (error) {
    console.error('[Container Health] Error getting containers:', error);
    return [];
  }
}

/**
 * Форматирует сообщение о статусе контейнеров
 */
export function formatContainersMessage(containers: ContainerStatus[]): string {
  if (containers.length === 0) {
    return '⚠️ **Контейнеры не найдены**\n\nВозможно, проект не запущен.';
  }
  
  let message = '📦 **Статус контейнеров**\n\n';
  
  for (const c of containers) {
    const statusEmoji = c.status === 'running' ? '🟢' : '🔴';
    const healthEmoji = 
      c.health === 'healthy' ? '✅' : 
      c.health === 'unhealthy' ? '❌' : 
      c.health === 'starting' ? '⏳' : '⚪';
    
    message += `${statusEmoji} **${c.name}**\n`;
    message += `   └ Health: ${healthEmoji} ${c.health}\n`;
    message += `   └ Status: ${c.status}\n`;
    message += `   └ Uptime: ${c.uptime}\n\n`;
  }
  
  return message;
}

/**
 * Проверяет, есть ли проблемные контейнеры
 */
export function getUnhealthyContainers(containers: ContainerStatus[]): ContainerStatus[] {
  return containers.filter(c => 
    c.status !== 'running' || 
    c.health === 'unhealthy'
  );
}

/**
 * Форматирует критическое предупреждение о проблемных контейнерах
 */
export function formatUnhealthyAlert(unhealthy: ContainerStatus[]): string {
  let message = '🚨 **КРИТИЧНО: Проблемы с контейнерами!**\n\n';
  
  for (const c of unhealthy) {
    message += `❌ **${c.name}**\n`;
    message += `   Status: ${c.status}\n`;
    message += `   Health: ${c.health}\n`;
    message += `   Uptime: ${c.uptime}\n\n`;
  }
  
  message += '\n💡 **Рекомендации:**\n';
  message += '• Проверьте логи: `docker logs [container]`\n';
  message += '• Перезапустите контейнер: `docker restart [container]`\n';
  message += '• Пересоберите проект: `docker compose up -d --build`';
  
  return message;
}

/**
 * Перезапустить контейнер
 */
export async function restartContainer(containerName: string): Promise<{ success: boolean; message: string }> {
  try {
    console.log(`[Container Health] Restarting container: ${containerName}`);
    const { stdout } = await execAsync(`docker restart ${containerName}`);
    
    // Подождём 3 секунды для старта
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Проверим новый статус
    const containers = await getContainersStatus();
    const restarted = containers.find(c => c.name === containerName);
    
    if (restarted && restarted.status === 'running') {
      return {
        success: true,
        message: `✅ Контейнер **${containerName}** успешно перезапущен\n\nНовый статус: ${restarted.status}`,
      };
    } else {
      return {
        success: false,
        message: `⚠️ Контейнер перезапущен, но статус: ${restarted?.status || 'unknown'}`,
      };
    }
  } catch (error: any) {
    console.error(`[Container Health] Restart failed:`, error);
    return {
      success: false,
      message: `❌ Ошибка перезапуска: ${error.message}`,
    };
  }
}

/**
 * Получить последние логи контейнера
 */
export async function getContainerLogs(containerName: string, lines: number = 50): Promise<string> {
  try {
    const { stdout } = await execAsync(`docker logs --tail ${lines} ${containerName} 2>&1`);
    return stdout;
  } catch (error: any) {
    return `Ошибка получения логов: ${error.message}`;
  }
}

/**
 * Проверяет логи на наличие ошибок
 */
export async function checkLogsForErrors(containerName: string): Promise<{ hasErrors: boolean; errorLines: string[] }> {
  try {
    const logs = await getContainerLogs(containerName, 100);
    const lines = logs.split('\n');
    
    const errorLines = lines.filter(line => 
      line.toLowerCase().includes('error') ||
      line.toLowerCase().includes('fatal') ||
      line.toLowerCase().includes('exception') ||
      line.includes('❌')
    ).slice(-10); // Последние 10 ошибок
    
    return {
      hasErrors: errorLines.length > 0,
      errorLines,
    };
  } catch (error) {
    return { hasErrors: false, errorLines: [] };
  }
}
