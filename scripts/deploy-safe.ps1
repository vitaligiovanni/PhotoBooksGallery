Param(
  [string]$Only = "",
  [switch]$MigrationsOnly,
  [switch]$ServerOnly,
  [switch]$PublicOnly,
  [switch]$CodeOnly,
  [switch]$SkipBuild,
  [switch]$AutoRollback,
  [string]$HealthUrl = "",
  [int]$HealthTimeout = 25
)

# Simple PowerShell wrapper for Windows users
# Examples:
#   ./scripts/deploy-safe.ps1 -ServerOnly
#   ./scripts/deploy-safe.ps1 -MigrationsOnly -AutoRollback -HealthUrl "http://127.0.0.1:3000/api/health"

if ($MigrationsOnly) { $Only = "migrations" }
elseif ($ServerOnly) { $Only = "server" }
elseif ($PublicOnly) { $Only = "public" }
elseif ($CodeOnly) { $Only = "code" }

$env:ONLY = $Only
if ($SkipBuild) { $env:SKIP_BUILD = "true" }
if ($AutoRollback) { $env:AUTO_ROLLBACK = "true" }
if ($HealthUrl) { $env:HEALTH_URL = $HealthUrl }
if ($HealthTimeout) { $env:HEALTH_TIMEOUT = $HealthTimeout }

Write-Host "Starting deploy (ONLY=$Only)" -ForegroundColor Cyan

function Has-Bash {
  $bashPath = (Get-Command bash -ErrorAction SilentlyContinue)
  return $bashPath -ne $null
}

if (Has-Bash) {
  Write-Host "Using bash deploy script" -ForegroundColor DarkCyan
  bash ./scripts/deploy-release.sh
  $code = $LASTEXITCODE
} else {
  Write-Host "bash не найден. Использую PowerShell версию scripts/deploy-release.ps1" -ForegroundColor Yellow
  $params = @{}
  if ($SkipBuild) { $params.Add('SkipBuild',$true) }
  if ($AutoRollback) { $params.Add('AutoRollback',$true) }
  if ($HealthUrl) { $params.Add('HealthUrl',$HealthUrl) }
  if ($HealthTimeout) { $params.Add('HealthTimeout',$HealthTimeout) }
  if ($Only) { $params.Add('Only',$Only) }
  & (Join-Path $PSScriptRoot 'deploy-release.ps1') @params
  $code = $LASTEXITCODE
}

if ($code -ne 0) {
  Write-Host "Deploy failed with exit code $code" -ForegroundColor Red
  exit $code
}

Write-Host "Deploy finished" -ForegroundColor Green
