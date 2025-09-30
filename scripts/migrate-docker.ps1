Param(
  [switch]$Rebuild,
  [switch]$Clean,
  [int]$WaitSeconds = 90,
  [switch]$SkipSmoke,
  [switch]$SkipCatalog,
  [string]$ApiBase = "http://localhost:3000/api"
)

Write-Host "[migrate-docker] Start" -ForegroundColor Cyan

if ($Clean) {
  Write-Host "[migrate-docker] docker compose down -v" -ForegroundColor Yellow
  docker compose down -v | Out-Null
}

if ($Rebuild) {
  Write-Host "[migrate-docker] docker compose build" -ForegroundColor Yellow
  docker compose build
  if ($LASTEXITCODE -ne 0) { exit 1 }
}

Write-Host "[migrate-docker] docker compose up -d" -ForegroundColor Yellow
docker compose up -d
if ($LASTEXITCODE -ne 0) { exit 1 }

# Wait for DB healthy
$deadline = (Get-Date).AddSeconds($WaitSeconds)
$dbId = docker compose ps -q db
if (-not $dbId) { Write-Error "DB container id not found"; exit 2 }

Write-Host "[migrate-docker] Waiting for Postgres health..." -ForegroundColor Yellow
$healthy = $false
while ((Get-Date) -lt $deadline) {
  $state = docker inspect -f '{{ .State.Health.Status }}' $dbId 2>$null
  if ($state -eq 'healthy') { $healthy = $true; break }
  Start-Sleep -Seconds 2
}
if (-not $healthy) { Write-Error "Postgres not healthy in time"; exit 3 }
Write-Host "[migrate-docker] DB healthy" -ForegroundColor Green

# Tail app logs until started or timeout
$appId = docker compose ps -q app
if (-not $appId) { Write-Error "App container id not found"; exit 4 }

Write-Host "[migrate-docker] Waiting app to start (migrations) ..." -ForegroundColor Yellow
$started = $false
$deadlineApp = (Get-Date).AddSeconds($WaitSeconds)
while ((Get-Date) -lt $deadlineApp) {
  $logs = docker logs $appId --tail 50 2>$null
  if ($logs -match "Starting application") { $started = $true; break }
  if ($logs -match "\[entrypoint\]\[ERROR\]") {
    Write-Error "Migrations failed"; docker logs $appId; exit 5
  }
  Start-Sleep -Seconds 2
}
if (-not $started) { Write-Error "App did not start in time"; docker logs $appId; exit 6 }
Write-Host "[migrate-docker] App started" -ForegroundColor Green

# Export DATABASE_URL for local scripts
$env:DATABASE_URL = "postgresql://photobooks:photobooks@localhost:5433/photobooks"
Write-Host "[migrate-docker] DATABASE_URL set for host scripts" -ForegroundColor DarkCyan

# Predeploy verify
Write-Host "[migrate-docker] Running predeploy:verify" -ForegroundColor Yellow
npm run predeploy:verify
if ($LASTEXITCODE -ne 0) { Write-Warning "predeploy:verify returned non-zero (continuing)" }

if (-not $SkipCatalog) {
  Write-Host "[migrate-docker] Running verify:catalog" -ForegroundColor Yellow
  npm run verify:catalog
  if ($LASTEXITCODE -eq 2) {
    Write-Host "[migrate-docker] Catalog empty, creating demo data..." -ForegroundColor Yellow
    npm run seed:demo
    if ($LASTEXITCODE -ne 0) {
      Write-Error "Failed to create demo data"
      exit 1
    }
    Write-Host "[migrate-docker] Demo data created successfully" -ForegroundColor Green
  } elseif ($LASTEXITCODE -ne 0) {
    Write-Warning "verify:catalog failed (code: $LASTEXITCODE)"
  }
}

if (-not $SkipSmoke) {
  Write-Host "[migrate-docker] Running crm:smoke with --skip-blog" -ForegroundColor Yellow
  npm run crm:smoke -- --skip-blog
  if ($LASTEXITCODE -ne 0) { Write-Warning "crm:smoke failed" }
}

Write-Host "[migrate-docker] Done" -ForegroundColor Cyan
