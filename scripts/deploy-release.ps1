Param(
  [string]$AppName = "photobooksgallery",
  [string]$ServerHost = $env:SERVER_HOST,
  [string]$ServerUser = $env:SERVER_USER,
  [string]$Only = $env:ONLY,
  [switch]$SkipBuild,
  [switch]$AutoRollback,
  [string]$HealthUrl = $env:HEALTH_URL,
  [int]$HealthTimeout = 20,
  [switch]$BackupBeforeMigrations,
  [string]$RemoteDbUrl = $env:REMOTE_DB_URL
)

# Override from env if provided
if($env:HEALTH_TIMEOUT){ $HealthTimeout = [int]$env:HEALTH_TIMEOUT }

if(-not $ServerHost){ $ServerHost = "82.202.129.237" }
if(-not $ServerUser){ $ServerUser = "root" }

$ErrorActionPreference = 'Stop'
function Info($m){ Write-Host "[INFO] $m" -ForegroundColor Green }
function Warn($m){ Write-Host "[WARN] $m" -ForegroundColor Yellow }
function Err($m){ Write-Host "[ERR ] $m" -ForegroundColor Red }

$timestamp = Get-Date -Format 'yyyyMMddHHmmss'
$release = "release-$timestamp"
$buildRoot = Join-Path -Path ".deploy" -ChildPath $release
$archive = "$release.tar.gz"
$remoteBase = "/var/www/$AppName"
$releasesDir = "$remoteBase/releases"
$persistDir = "$remoteBase/persistent"
$uploadsDir = "$persistDir/uploads"
$envFileRemote = "$persistDir/.env"

Remove-Item .deploy -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $buildRoot | Out-Null

if(-not $SkipBuild -and ($Only -ne 'migrations')){
  Info "Build (client+server)"
  if($env:NO_LOCAL_INSTALL -eq 'true'){
    Info "NO_LOCAL_INSTALL=true -> пропускаю npm install, использую существующий node_modules"
  } else {
    npm install
    if($LASTEXITCODE -ne 0){ throw "npm install failed" }
  }
  npm run build
  if($LASTEXITCODE -ne 0){ throw "build failed" }
} else {
  Info "Skipping build phase"
}

$selected = @('dist','server','shared','public','migrations','package.json','package-lock.json','deploy-manifest.json')
if($Only){
  Info "Partial deploy ONLY=$Only"
  switch($Only){
    'code' { $selected = @('dist','server','shared','package.json','package-lock.json','deploy-manifest.json') }
    'server' { $selected = @('server','shared','package.json','package-lock.json','deploy-manifest.json') }
    'public' { $selected = @('dist','public','package.json','package-lock.json','deploy-manifest.json') }
    'migrations' { $selected = @('migrations','package.json','package-lock.json','deploy-manifest.json') }
    default { Warn "Неизвестный ONLY=$Only. Использую полный набор." }
  }
}

if(-not (Test-Path deploy-manifest.json)){
  try { node scripts/generate-manifest.mjs --quiet } catch { Warn "Manifest generation failed" }
}

foreach($d in $selected){
  if(Test-Path $d){
    $target = Join-Path $buildRoot $d
    New-Item -ItemType Directory -Path (Split-Path $target) -Force | Out-Null
    Copy-Item $d -Destination $target -Recurse -Force -ErrorAction Stop
  }
}

# Если хотим переиспользовать текущие зависимости без локальной установки (для аварийного быстрого релиза)
if($env:NO_LOCAL_INSTALL -eq 'true' -and (Test-Path 'node_modules')){
  Info 'Копирую локальный node_modules (NO_LOCAL_INSTALL=true)'
  Copy-Item 'node_modules' -Destination (Join-Path $buildRoot 'node_modules') -Recurse -Force -ErrorAction SilentlyContinue
}

Info 'Создаю архив (.tar.gz через tar)'
if(Test-Path $archive){ Remove-Item $archive -Force }
if(Get-Command tar -ErrorAction SilentlyContinue){
  & tar -czf $archive -C .deploy $release
} else {
  throw 'tar not found: install Git for Windows (includes tar) or add tar to PATH'
}
if(-not (Test-Path $archive)){ throw 'Archive creation failed' }
Info "Archive created: $archive"

Info "Uploading archive via scp"
$scpTarget = "${ServerUser}@${ServerHost}:/tmp/"
scp $archive $scpTarget | Out-Null
if($LASTEXITCODE -ne 0){ throw "scp upload failed" }

$remoteScriptRaw = @'
#!/usr/bin/env bash
set -euo pipefail
APP_NAME="__APP_NAME__"
RELEASES_DIR="__RELEASES_DIR__"
PERSIST_DIR="__PERSIST_DIR__"
UPLOADS_DIR="__UPLOADS_DIR__"
ENV_FILE_REMOTE="__ENV_FILE__"
RELEASE="__RELEASE__"
ARCHIVE="__ARCHIVE__"
ONLY="__ONLY__"
BACKUP_BEFORE_MIGRATIONS="__BACKUP_FLAG__"
AUTO_ROLLBACK="__AUTO_ROLLBACK__"
HEALTH_URL="__HEALTH_URL__"
HEALTH_TIMEOUT="__HEALTH_TIMEOUT__"
REMOTE_DB_URL="__REMOTE_DB_URL__"
PM2_PROCESS="__APP_NAME__"

mkdir -p "__RELEASES_DIR__" "__PERSIST_DIR__" "__UPLOADS_DIR__"
if [[ ! -f "__ENV_FILE__" ]]; then echo "WARNING: __ENV_FILE__ missing" >&2; fi
cd "__RELEASES_DIR__"

tar -xzf /tmp/__ARCHIVE__
rm -f /tmp/__ARCHIVE__ || true

if [[ -d "__RELEASE__/uploads" ]]; then rm -rf "__RELEASE__/uploads"; fi
ln -sfn "__UPLOADS_DIR__" "__RELEASE__/uploads"

if [[ -f "__RELEASE__/package.json" ]]; then
  (cd "__RELEASE__" && npm install --omit=dev --no-audit --no-fund) || echo "npm install failed (continuing)"
fi

PREV_RELEASE=$(ls -dt release-* 2>/dev/null | sed -n '2p' || echo "")

if [[ -d "__RELEASE__/migrations" && "__ONLY__" != "client" && "__ONLY__" != "public" && "__ONLY__" != "server" ]]; then
  echo "Migrations stage..."
  if [[ "__BACKUP_FLAG__" == "true" && -n "__REMOTE_DB_URL__" ]]; then
    if command -v pg_dump >/dev/null 2>&1; then
      BKP_FILE="__PERSIST_DIR__/backup_$(date +%Y%m%d%H%M%S).sql.gz"
      echo "Creating DB backup -> $BKP_FILE"
      if ! pg_dump "__REMOTE_DB_URL__" | gzip > "$BKP_FILE"; then echo "Backup failed (continuing)"; fi
    else
      echo "pg_dump not found. Skipping DB backup"
    fi
  fi
  if command -v npx >/dev/null 2>&1; then
    if ! npx drizzle-kit push; then echo "Migrations failed"; exit 17; fi
  fi
else
  echo "Skipping migrations (ONLY=__ONLY__)"
fi

ln -sfn "__RELEASES_DIR__/__RELEASE__" "__RELEASES_DIR__/current"
if command -v pm2 >/dev/null 2>&1; then
  if pm2 list | grep -q "__APP_NAME__"; then
    pm2 restart "__APP_NAME__" || true
  else
    pm2 start dist/server/index.js --name "__APP_NAME__" --time || pm2 start server/index.js --name "__APP_NAME__" --time || true
  fi
  pm2 save || true
fi

ROLLBACK_PERFORMED=false
if [[ -n "__HEALTH_URL__" ]]; then
  echo "Health check: __HEALTH_URL__"
  success=false
  for i in $(seq 1 __HEALTH_TIMEOUT__); do
    STATUS=$(curl -s -o /dev/null -w '%{http_code}' "__HEALTH_URL__" || echo "000")
    if [[ "$STATUS" == "200" ]]; then
      echo "Health OK"; success=true; break; fi
    sleep 1
  done
  if [[ "$success" != true ]]; then
    echo "Health failed"
    if [[ "__AUTO_ROLLBACK__" == "true" && -n "$PREV_RELEASE" ]]; then
      echo "Rolling back -> $PREV_RELEASE"
      ln -sfn "__RELEASES_DIR__/$PREV_RELEASE" "__RELEASES_DIR__/current"
      if command -v pm2 >/dev/null 2>&1; then pm2 restart "__APP_NAME__" || true; fi
      ROLLBACK_PERFORMED=true
    fi
  fi
fi
if [[ "$ROLLBACK_PERFORMED" == true ]]; then echo "Rollback executed"; else echo "Release __RELEASE__ active"; fi
'@

$remoteScript = $remoteScriptRaw `
  # Placeholders will be replaced using precomputed simple variables (avoid inline if in PS 5.1)

# Precompute replacement values
$valOnly = $Only; if(-not $valOnly){ $valOnly = '' }
$valBackup = 'false'; if($BackupBeforeMigrations){ $valBackup = 'true' }
$valAutoRollback = 'false'; if($AutoRollback){ $valAutoRollback = 'true' }
$valHealthUrl = $HealthUrl; if(-not $valHealthUrl){ $valHealthUrl = '' }
$valRemoteDb = $RemoteDbUrl; if(-not $valRemoteDb){ $valRemoteDb = '' }

$remoteScript = $remoteScriptRaw `
  -replace '__APP_NAME__', $AppName `
  -replace '__RELEASES_DIR__', $releasesDir `
  -replace '__PERSIST_DIR__', $persistDir `
  -replace '__UPLOADS_DIR__', $uploadsDir `
  -replace '__ENV_FILE__', $envFileRemote `
  -replace '__RELEASE__', $release `
  -replace '__ARCHIVE__', $archive `
  -replace '__ONLY__', $valOnly `
  -replace '__BACKUP_FLAG__', $valBackup `
  -replace '__AUTO_ROLLBACK__', $valAutoRollback `
  -replace '__HEALTH_URL__', $valHealthUrl `
  -replace '__HEALTH_TIMEOUT__', $HealthTimeout `
  -replace '__REMOTE_DB_URL__', $valRemoteDb

Info "Executing remote activation script"
$remoteScript | ssh "${ServerUser}@${ServerHost}" 'bash -s'
if($LASTEXITCODE -ne 0){ throw "remote deploy failed" }
Info "Deployment complete: $release"
