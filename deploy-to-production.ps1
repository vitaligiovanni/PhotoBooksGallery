# ==========================================
# PRODUCTION DEPLOYMENT SCRIPT
# ==========================================
# Deploys PhotoBooksGallery with PWA + AR Service
# Server: root@46.173.29.247
# Path: /opt/photobooksgallery
# ==========================================

param(
    [switch]$SkipBuild = $false,
    [switch]$DryRun = $false
)

$ErrorActionPreference = "Stop"
$SERVER = "root@46.173.29.247"
$REMOTE_PATH = "/opt/photobooksgallery"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "PhotoBooksGallery Production Deployment" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

if ($DryRun) {
    Write-Host "[DRY RUN MODE] No changes will be made`n" -ForegroundColor Yellow
}

# Step 1: Build frontend
if (-not $SkipBuild) {
    Write-Host "[1/8] Building frontend..." -ForegroundColor Yellow
    Set-Location frontend
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Build failed!" -ForegroundColor Red
        exit 1
    }
    Set-Location ..
    Write-Host "Build successful!`n" -ForegroundColor Green
} else {
    Write-Host "[1/8] Skipping build (using existing dist)`n" -ForegroundColor Yellow
}

# Step 2: Create archives
Write-Host "[2/8] Creating deployment archives..." -ForegroundColor Yellow

if (Test-Path ".\deployment-temp") {
    Remove-Item -Recurse -Force ".\deployment-temp"
}
New-Item -ItemType Directory -Path ".\deployment-temp" | Out-Null

# Frontend dist archive
Write-Host "  - Packing frontend/dist..." -ForegroundColor Gray
if (-not $DryRun) {
    tar -czf ".\deployment-temp\frontend-dist.tar.gz" -C ".\frontend\dist" .
}

# Backend files (no node_modules, only src + package.json)
Write-Host "  - Packing backend..." -ForegroundColor Gray
if (-not $DryRun) {
    tar -czf ".\deployment-temp\backend.tar.gz" -C ".\backend" --exclude=node_modules --exclude=objects --exclude=uploads .
}

# AR Service
Write-Host "  - Packing ar-service..." -ForegroundColor Gray
if (-not $DryRun) {
    tar -czf ".\deployment-temp\ar-service.tar.gz" -C ".\ar-service" --exclude=node_modules --exclude=storage .
}

# Shared library
Write-Host "  - Packing shared..." -ForegroundColor Gray
if (-not $DryRun) {
    tar -czf ".\deployment-temp\shared.tar.gz" -C ".\shared" --exclude=node_modules .
}

Write-Host "Archives created!`n" -ForegroundColor Green

# Step 3: Copy docker-compose.yml with production settings
Write-Host "[3/8] Preparing docker-compose for production..." -ForegroundColor Yellow
$composeContent = Get-Content ".\docker-compose.yml" -Raw -Encoding UTF8
# Change NODE_ENV to production
$composeContent = $composeContent -replace 'NODE_ENV: development', 'NODE_ENV: production'
# Change VITE_API_URL to production domain
$composeContent = $composeContent -replace 'VITE_API_URL=http://localhost:8080', 'VITE_API_URL=https://photobooksgallery.am'
if (-not $DryRun) {
    $composeContent | Set-Content ".\deployment-temp\docker-compose.yml" -Encoding UTF8
}
Write-Host "docker-compose.yml prepared!`n" -ForegroundColor Green

# Step 4: Copy configuration files
Write-Host "[4/8] Copying configuration files..." -ForegroundColor Yellow
if (-not $DryRun) {
    Copy-Item ".\frontend\nginx.conf" ".\deployment-temp\nginx.conf"
    Copy-Item ".\frontend\Dockerfile" ".\deployment-temp\frontend.Dockerfile"
    Copy-Item ".\backend\Dockerfile" ".\deployment-temp\backend.Dockerfile"
    Copy-Item ".\ar-service\Dockerfile" ".\deployment-temp\ar-service.Dockerfile"
    Copy-Item ".\.env.production" ".\deployment-temp\.env"
}
Write-Host "Configuration files copied!`n" -ForegroundColor Green

# Step 5: Upload to server
Write-Host "[5/8] Uploading files to server..." -ForegroundColor Yellow
if (-not $DryRun) {
    Write-Host "  - Creating backup on server..." -ForegroundColor Gray
    ssh $SERVER "cd $REMOTE_PATH && tar -czf ../photobooks-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss').tar.gz ."
    
    Write-Host "  - Uploading archives..." -ForegroundColor Gray
    scp ".\deployment-temp\*" "${SERVER}:${REMOTE_PATH}/"
    
    Write-Host "  - Preparing directories on server..." -ForegroundColor Gray
    ssh $SERVER @"
cd $REMOTE_PATH
mkdir -p frontend/dist ar-service backend shared
"@
    
    Write-Host "  - Extracting archives on server..." -ForegroundColor Gray
    ssh $SERVER @"
cd $REMOTE_PATH
tar -xzf frontend-dist.tar.gz -C frontend/dist/
tar -xzf backend.tar.gz -C backend/
tar -xzf ar-service.tar.gz -C ar-service/
tar -xzf shared.tar.gz -C shared/
cp nginx.conf frontend/
cp frontend.Dockerfile frontend/Dockerfile
cp backend.Dockerfile backend/Dockerfile
cp ar-service.Dockerfile ar-service/Dockerfile
cp docker-compose.yml docker-compose.yml
cp .env .env
rm -f *.tar.gz *.Dockerfile nginx.conf
"@
}
Write-Host "Files uploaded and extracted!`n" -ForegroundColor Green

# Step 6: Install dependencies on server
Write-Host "[6/8] Installing dependencies on server..." -ForegroundColor Yellow
if (-not $DryRun) {
    Write-Host "  - Installing backend dependencies..." -ForegroundColor Gray
    ssh $SERVER "cd $REMOTE_PATH/backend && npm install --production --no-audit"
    
    Write-Host "  - Installing ar-service dependencies..." -ForegroundColor Gray
    ssh $SERVER "cd $REMOTE_PATH/ar-service && npm install --production --no-audit"
    
    Write-Host "  - Installing shared dependencies..." -ForegroundColor Gray
    ssh $SERVER "cd $REMOTE_PATH/shared && npm install --production --no-audit"
}
Write-Host "Dependencies installed!`n" -ForegroundColor Green

# Step 7: Rebuild and restart Docker containers
Write-Host "[7/8] Rebuilding Docker containers..." -ForegroundColor Yellow
if (-not $DryRun) {
    Write-Host "  - Stopping containers..." -ForegroundColor Gray
    ssh $SERVER "cd $REMOTE_PATH && docker compose down"
    
    Write-Host "  - Building new images..." -ForegroundColor Gray
    ssh $SERVER "cd $REMOTE_PATH && docker compose build --no-cache"
    
    Write-Host "  - Starting containers..." -ForegroundColor Gray
    ssh $SERVER "cd $REMOTE_PATH && docker compose up -d"
}
Write-Host "Docker containers restarted!`n" -ForegroundColor Green

# Step 8: Verify deployment
Write-Host "[8/8] Verifying deployment..." -ForegroundColor Yellow
Start-Sleep -Seconds 10
if (-not $DryRun) {
    $health = ssh $SERVER "curl -sf http://localhost:5002/health || echo 'FAILED'"
    if ($health -like "*FAILED*") {
        Write-Host "Health check FAILED!" -ForegroundColor Red
        Write-Host "Checking logs..." -ForegroundColor Yellow
        ssh $SERVER "cd $REMOTE_PATH && docker compose logs --tail=50 backend"
        exit 1
    }
}
Write-Host "Health check passed!`n" -ForegroundColor Green

# Cleanup
Write-Host "Cleaning up temporary files..." -ForegroundColor Gray
if (Test-Path ".\deployment-temp") {
    Remove-Item -Recurse -Force ".\deployment-temp"
}

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "DEPLOYMENT SUCCESSFUL!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "Site: https://photobooksgallery.am" -ForegroundColor White
Write-Host "API:  https://photobooksgallery.am/api/health" -ForegroundColor White
Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "  1. Test the site in browser" -ForegroundColor White
Write-Host "  2. Test PWA installation (A2HS)" -ForegroundColor White
Write-Host "  3. Test AR functionality" -ForegroundColor White
Write-Host "  4. Check Armenian/Russian/English fonts" -ForegroundColor White
Write-Host "========================================`n" -ForegroundColor Green
