# Full Stack Start Script (with AR Microservice)

Write-Host "🚀 PhotoBooks Gallery - Full Stack (with AR Microservice)" -ForegroundColor Cyan
Write-Host "=========================================================`n" -ForegroundColor Cyan

$dockerComposeCmd = Get-Command docker-compose -ErrorAction SilentlyContinue
if (-Not $dockerComposeCmd) {
    $dockerComposeCmd = Get-Command docker -ErrorAction SilentlyContinue
    if ($dockerComposeCmd) {
        $dockerComposeCmd = "docker compose"
    } else {
        Write-Host "❌ Docker is not installed or not in PATH" -ForegroundColor Red
        exit 1
    }
} else {
    $dockerComposeCmd = "docker-compose"
}

Write-Host "📦 Building and starting all services..." -ForegroundColor Yellow
Write-Host "  - Frontend (Next.js) → port 3000" -ForegroundColor White
Write-Host "  - Backend (Express) → port 5002" -ForegroundColor White
Write-Host "  - AR Service (Express + Worker Threads) → port 5000" -ForegroundColor White
Write-Host "  - Main Database (PostgreSQL) → port 5433" -ForegroundColor White
Write-Host "  - AR Database (PostgreSQL) → port 5434" -ForegroundColor White
Write-Host "  - Nginx (Reverse Proxy) → port 80`n" -ForegroundColor White

& $dockerComposeCmd -f docker-compose.ar-microservice.yml up --build

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n❌ Failed to start services" -ForegroundColor Red
    exit 1
}

Write-Host "`n✅ All services stopped" -ForegroundColor Green
