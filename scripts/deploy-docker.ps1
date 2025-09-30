# deploy-docker.ps1 - Docker деплой на Beget (Windows)

param(
    [string]$Server = "your-beget-server",
    [string]$User = "user"
)

Write-Host "🚀 Начинаем Docker деплой на Beget..." -ForegroundColor Green

# Проверяем наличие SSH ключа
$sshKeyPath = "$env:USERPROFILE\.ssh\id_rsa"
if (!(Test-Path $sshKeyPath)) {
    Write-Host "❌ SSH ключ не найден: $sshKeyPath" -ForegroundColor Red
    Write-Host "Создайте его командой: ssh-keygen -t rsa -b 4096 -C 'your_email@example.com'" -ForegroundColor Yellow
    exit 1
}

# Проверяем подключение к серверу
Write-Host "🔍 Проверяем подключение к серверу..." -ForegroundColor Cyan
try {
    $result = ssh -o ConnectTimeout=10 -o BatchMode=yes "$User@$Server" "echo '✅ SSH подключение работает'"
    if ($LASTEXITCODE -ne 0) { throw "SSH failed" }
} catch {
    Write-Host "❌ Не удалось подключиться к серверу. Проверьте SSH ключ и адрес сервера." -ForegroundColor Red
    exit 1
}

# Создаем временную директорию на сервере
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$remoteDir = "/home/$User/docker-deploy-$timestamp"
Write-Host "📁 Создаем директорию на сервере: $remoteDir" -ForegroundColor Cyan

ssh "$User@$Server" "mkdir -p $remoteDir"

# Копируем файлы на сервер (используем rsync если есть, иначе scp)
Write-Host "📤 Копируем файлы на сервер..." -ForegroundColor Cyan

# Создаем временный exclude файл
$excludeFile = [System.IO.Path]::GetTempFileName()
@"
node_modules
.git
uploads
*.log
.env*
dist
.next
.vscode
.idea
*.tmp
scripts/
*.md
nginx-config*
"@ | Out-File -FilePath $excludeFile -Encoding UTF8

try {
    # Пробуем rsync
    rsync -avz --exclude-from="$excludeFile" . "$User@${Server}:$remoteDir/" 2>$null
    if ($LASTEXITCODE -ne 0) { throw "rsync failed" }
} catch {
    Write-Host "rsync не найден, используем scp..." -ForegroundColor Yellow
    # Альтернатива через scp (будет медленнее)
    scp -r (Get-ChildItem . -Exclude @("node_modules",".git","uploads","*.log",".env*","dist",".next",".vscode",".idea","*.tmp","scripts","*.md","nginx-config*")) "$User@${Server}:$remoteDir/"
}

Remove-Item $excludeFile

# Останавливаем старый контейнер если работает
Write-Host "🛑 Останавливаем старые контейнеры..." -ForegroundColor Cyan
ssh "$User@$Server" "cd $remoteDir && docker-compose -f docker-compose.prod.yml down" 2>$null

# Запускаем новые контейнеры
Write-Host "🐳 Запускаем новые контейнеры..." -ForegroundColor Cyan
ssh "$User@$Server" "cd $remoteDir && docker-compose -f docker-compose.prod.yml up -d --build"

# Ждем запуска
Write-Host "⏳ Ждем запуска приложения..." -ForegroundColor Cyan
Start-Sleep -Seconds 10

# Проверяем здоровье
Write-Host "🏥 Проверяем здоровье приложения..." -ForegroundColor Cyan
try {
    $health = ssh "$User@$Server" "curl -f http://localhost:3000/api/health"
    if ($LASTEXITCODE -ne 0) { throw "Health check failed" }
} catch {
    Write-Host "❌ Приложение не запустилось корректно" -ForegroundColor Red
    exit 1
}

# Проверяем CRM функции
Write-Host "🔧 Проверяем CRM функции..." -ForegroundColor Cyan
try {
    $crm = ssh "$User@$Server" "curl -f http://localhost:3000/api/categories"
    if ($LASTEXITCODE -ne 0) { throw "CRM check failed" }
} catch {
    Write-Host "❌ CRM API не работает" -ForegroundColor Red
    exit 1
}

# Очищаем старые директории (оставляем последние 3)
Write-Host "🧹 Очищаем старые деплой директории..." -ForegroundColor Cyan
ssh "$User@$Server" "ls -dt /home/$User/docker-deploy-* 2>/dev/null | tail -n +4 | xargs rm -rf" 2>$null

Write-Host "✅ Деплой завершен успешно!" -ForegroundColor Green
Write-Host "🌐 Сайт доступен по адресу: http://$Server" -ForegroundColor Green
Write-Host "📊 CRM панель: http://$Server/admin" -ForegroundColor Green