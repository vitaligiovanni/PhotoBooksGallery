#!/usr/bin/env pwsh
# Manual production deployment script
# Executes deployment commands directly on production server

$ServerHost = "46.173.29.247"
$ServerUser = "root"
$WorkDir = "/var/www/photobooksgallery"

Write-Host "🚀 Starting manual production deployment..." -ForegroundColor Cyan
Write-Host "Server: $ServerUser@$ServerHost" -ForegroundColor Yellow
Write-Host "Work dir: $WorkDir" -ForegroundColor Yellow
Write-Host ""

$DeployCommands = @"
cd $WorkDir && \
echo '=== Pulling latest code ===' && \
git fetch --all && \
git reset --hard origin/main && \
echo '=== Stopping containers ===' && \
docker compose down && \
echo '=== Building images ===' && \
docker compose build && \
echo '=== Starting containers ===' && \
docker compose up -d && \
echo '=== Waiting for startup ===' && \
sleep 10 && \
docker compose ps && \
echo '✅ Deployment completed!'
"@

Write-Host "Executing deployment commands..." -ForegroundColor Green
ssh "$ServerUser@$ServerHost" $DeployCommands

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Deployment successful!" -ForegroundColor Green
    Write-Host "Site: https://photobooksgallery.am" -ForegroundColor Cyan
} else {
    Write-Host "`n❌ Deployment failed with exit code $LASTEXITCODE" -ForegroundColor Red
    exit 1
}
