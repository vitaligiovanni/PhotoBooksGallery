# Обновление Node.js до 20.x (Windows)

## Вариант 1: nvm-windows (рекомендуется)
1. Скачать установщик: https://github.com/coreybutler/nvm-windows/releases/latest
2. Установить в путь без пробелов (например C:\nvm) и указать папку для node (например C:\nodejs)
3. Открыть новое окно PowerShell.
4. Выполнить:
   nvm install 20.17.0
   nvm use 20.17.0
5. Проверить:
   node -v
   npm -v

## Вариант 2: Прямой MSI
1. Скачать LTS/Current 20.x: https://nodejs.org/en/download
2. Установить (галочки Install corepack можно оставить включённой).
3. Закрыть/открыть PowerShell и проверить node -v.

## Дополнительно
- После переключения на Node 20 можно вернуть cross-env в скрипты package.json если убирали.
- Для одноразового запуска с повышением прав не требуется.
- Если нужно вернуться на старую версию: nvm use 18.20.0 (при установленном nvm).
