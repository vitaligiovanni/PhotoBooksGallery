# Локальный запуск (Dev) без падения сервера

## Цели
- Стабильный dev сервер на http://localhost:3000
- Рабочий HMR и WebSocket
- Доступ к /admin, /manifest.json и /icons/*

## Почему раньше падало
Вы запускали несколько команд в одной строке PowerShell: после завершения первой (server) шел следующий пайплайн, PowerShell воспринимал это как batch и показывал приглашение Y/N, останавливая Node.

## Правильная схема
Используем два терминала:

Терминал 1 (сервер):
```powershell
$env:NODE_ENV='development'
npx tsx server/index.ts
```
Держим открытым. Не запускаем в нем другие команды.

Терминал 2 (проверки):
```powershell
(Invoke-WebRequest -Uri http://localhost:3000/admin -UseBasicParsing).StatusCode
(Invoke-WebRequest -Uri http://localhost:3000/manifest.json -UseBasicParsing).Content.Substring(0,120)
Invoke-WebRequest -Uri http://localhost:3000/icons/icon-144x144.png -UseBasicParsing -OutFile test_icon.png
(Get-Item .\test_icon.png).Length
```

## Дополнительно
- Если порт занят: `netstat -ano | Select-String ':3000'` затем `taskkill /PID <PID> /F`
- Если нужно авто‑рестарт при изменениях сервера: установить nodemon и добавить скрипт
```powershell
npm i -D nodemon
```
`package.json`:
```json
"scripts": { "dev:server": "nodemon --watch server --ext ts,tsx --exec tsx server/index.ts" }
```
Запуск:
```powershell
$env:NODE_ENV='development'
npm run dev:server
```

## Проверка PNG сигнатуры в PowerShell 5.1
```powershell
[byte[]]$b = Get-Content -Path .\test_icon.png -Encoding Byte -TotalCount 8
$b | ForEach-Object { '{0:X2}' -f $_ } -join ' '
```
Ожидаемо: `89 50 4E 47 0D 0A 1A 0A`

## Частые ошибки
- Слипание команд: `(Get-Item file).LengthFormat-Hex ...` -> нужно разделять переносом строки.
- `Format-Hex -Count` недоступен в PowerShell 5.1 (есть в более новых версиях Core).

## Завершение
Теперь /admin и статика работают стабильно. При необходимости перенесите реальные иконки и удалите заглушки.
