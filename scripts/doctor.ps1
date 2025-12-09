param(
  [switch]$Seed
)

Write-Host 'PhotoBooks Doctor: checking environment...' -ForegroundColor Cyan

function Check-Cmd($cmd) {
  $exists = (Get-Command $cmd -ErrorAction SilentlyContinue) -ne $null
  return $exists
}

# 1) Node & NPM
if (!(Check-Cmd node)) { Write-Error 'Node.js not found. Install Node >= 18'; exit 1 }
if (!(Check-Cmd npm)) { Write-Error 'npm not found. Install Node/npm'; exit 1 }
Write-Host ('Node: {0} | npm: {1}' -f (node -v), (npm -v))

# 2) Docker
if (!(Check-Cmd docker)) { Write-Warning 'Docker not found. Skipping containers step.' }
else {
  try { docker version | Out-Null; Write-Host 'Docker available' } catch { Write-Warning 'Docker unavailable' }
}

# 3) Dependencies
Write-Host 'Checking workspace dependencies...'
$root = (Get-Location).Path
$front = Join-Path $root 'frontend'
$back = Join-Path $root 'backend'
$shared = Join-Path $root 'shared'

function Ensure-NodeModules($dir) {
  if (-Not (Test-Path (Join-Path $dir 'package.json'))) { return }
  if (-Not (Test-Path (Join-Path $dir 'node_modules'))) {
    Write-Host ('Installing dependencies: {0}' -f $dir) -ForegroundColor Yellow
    Push-Location $dir; npm install; Pop-Location
  } else { Write-Host ('node_modules OK: {0}' -f $dir) }
}

Ensure-NodeModules $root
Ensure-NodeModules $front
Ensure-NodeModules $back
Ensure-NodeModules $shared

# 4) Databases
Write-Host 'Checking DB containers...'
try {
  docker compose up -d db | Out-Null
  docker compose up -d ar-db | Out-Null
  Write-Host 'DB and AR-DB are running'
} catch { Write-Warning 'Failed to start docker compose for DB' }

# 5) Seed (optional)
if ($Seed) {
  $sql = Join-Path $root 'restore-basic-data.sql'
  if (Test-Path $sql) {
    Write-Host 'Seeding basic data (products/categories)...' -ForegroundColor Green
    try {
      # Копируем SQL внутрь контейнера в /tmp
      docker cp $sql photobooks_db:/tmp/restore-basic-data.sql
      # Выполняем через psql из контейнера
      docker exec photobooks_db psql -U photobooks -d photobooks_db -f /tmp/restore-basic-data.sql
      Write-Host 'Seed completed successfully' -ForegroundColor Green
    } catch {
      Write-Warning 'Failed to seed via container. Try manually: psql -h localhost -p 5433 -U photobooks -d photobooks_db -f restore-basic-data.sql'
    }
  } else { Write-Warning 'File restore-basic-data.sql not found' }
}

Write-Host 'Doctor finished. Now run: npm run dev' -ForegroundColor Cyan
