# AR Microservice - Quick Start Guide

Write-Host "🚀 AR Microservice Setup" -ForegroundColor Cyan
Write-Host "========================`n" -ForegroundColor Cyan

# Step 1: Install dependencies
Write-Host "[1/5] 📦 Installing dependencies..." -ForegroundColor Yellow
Set-Location ar-service
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Dependencies installed`n" -ForegroundColor Green

# Step 2: Check .env file
Write-Host "[2/5] 🔧 Checking environment configuration..." -ForegroundColor Yellow

if (-Not (Test-Path ".env")) {
    Write-Host "⚠️  No .env file found. Creating from .env.example..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "✅ Created .env file. Please configure it before proceeding.`n" -ForegroundColor Green
    Write-Host "Required variables:" -ForegroundColor Cyan
    Write-Host "  - AR_DATABASE_URL" -ForegroundColor White
    Write-Host "  - BACKEND_URL" -ForegroundColor White
    Write-Host "  - BACKEND_WEBHOOK_SECRET" -ForegroundColor White
    Write-Host "  - FRONTEND_URL`n" -ForegroundColor White
    
    # Open .env in default editor
    Start-Process notepad ".env"
    
    Write-Host "Press Enter after configuring .env to continue..." -ForegroundColor Yellow
    Read-Host
}

Write-Host "✅ Environment configuration ready`n" -ForegroundColor Green

# Step 3: Start databases (Docker)
Write-Host "[3/5] 🗄️  Starting databases..." -ForegroundColor Yellow
Set-Location ..

# Check if docker-compose is available
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

# Start only databases
Write-Host "Starting ar-db and db-main..." -ForegroundColor Cyan
& $dockerComposeCmd -f docker-compose.ar-microservice.yml up -d ar-db db-main

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to start databases" -ForegroundColor Red
    exit 1
}

Write-Host "⏳ Waiting for databases to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

Write-Host "✅ Databases started`n" -ForegroundColor Green

# Step 4: Run migrations
Write-Host "[4/5] 🔄 Running database migrations..." -ForegroundColor Yellow
Set-Location ar-service

npm run migrate

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Migrations failed" -ForegroundColor Red
    Write-Host "Please check database connection and try again." -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Migrations completed`n" -ForegroundColor Green

# Step 5: Start AR service
Write-Host "[5/5] 🚀 Starting AR Microservice..." -ForegroundColor Yellow

Write-Host "`n=====================================" -ForegroundColor Cyan
Write-Host "AR Microservice is starting!" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "`nEndpoints:" -ForegroundColor Yellow
Write-Host "  Health:  http://localhost:5000/health" -ForegroundColor White
Write-Host "  Compile: POST http://localhost:5000/compile" -ForegroundColor White
Write-Host "  Status:  GET http://localhost:5000/status/:id" -ForegroundColor White
Write-Host "  Viewer:  GET http://localhost:5000/view/:id" -ForegroundColor White
Write-Host "`nPress Ctrl+C to stop`n" -ForegroundColor Yellow

npm run dev
