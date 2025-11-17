Param(
  [switch]$Prune
)

$ErrorActionPreference = 'Stop'
Write-Host "==> Building images (this may take a while)..." -ForegroundColor Cyan

docker compose build

Write-Host "==> Starting services..." -ForegroundColor Cyan

docker compose up -d

docker compose ps

Write-Host "==> Waiting 10s for backend to warm up..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

Write-Host "==> Health check: /api/health" -ForegroundColor Cyan
try {
  $status = (Invoke-WebRequest -Uri http://localhost:5002/api/health -UseBasicParsing).StatusCode
  Write-Host "Health: $status" -ForegroundColor Green
} catch {
  Write-Warning "Health check failed: $($_.Exception.Message)"
}

Write-Host "==> Running one-off DB backup (backup-latest.sql) ..." -ForegroundColor Cyan
# one-shot backup container to refresh the latest dump
# (service has its own schedule, this forces an immediate backup)
docker compose run --rm backup

if ($Prune) {
  Write-Host "==> Pruning unused docker resources (images, containers, volumes) ..." -ForegroundColor Magenta
  docker system prune -af --volumes
}

Write-Host "==> Done. Frontend: http://localhost:3000  Backend: http://localhost:5002" -ForegroundColor Green
