const { exec } = require('child_process');
const path = require('path');

// Запуск скрипта создания пользователей
const scriptPath = path.join(__dirname, 'scripts', 'create-test-users.ts');
const command = `npx tsx "${scriptPath}"`;

console.log('🔄 Запуск создания тестовых пользователей...');
console.log('Команда:', command);

exec(command, (error, stdout, stderr) => {
  if (error) {
    console.error('Ошибка:', error);
    return;
  }
  
  if (stderr) {
    console.error('Stderr:', stderr);
  }
  
  console.log('Stdout:', stdout);
});