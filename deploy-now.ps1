# Simple deploy script for PhotoBooksGallery frontend
# 1) Build frontend
# 2) Upload dist to server atomically: assets first, then index.html
# NOTE: Customize server connection variables below.

param(
  [string]$ServerHost = "photobooksgallery.am",
  [string]$ServerUser = "deploy",
  [string]$ServerPath = "/var/www/photobooksgallery/frontend",
  [string]$SshKeyPath = "$HOME/.ssh/id_rsa"
)

$ErrorActionPreference = 'Stop'

function Exec($cmd) {
  Write-Host "> $cmd" -ForegroundColor Cyan
  iex $cmd
}

# Move into frontend
Push-Location "$PSScriptRoot\frontend"
try {
  Exec 'npm run build'
}
finally {
  Pop-Location
}

$dist = Join-Path "$PSScriptRoot" 'frontend/dist'
if (!(Test-Path $dist)) { throw "Build output not found: $dist" }

# Rsync-like copy via scp (PowerShell): copy assets first
$assetDir = "$ServerPath/assets"
$indexFile = "$ServerPath/index.html"

# Create a temporary upload path for atomic swap
$timestamp = Get-Date -Format 'yyyyMMddHHmmss'
$tmpPath = "$ServerPath/releases/$timestamp"

# Ensure directories
Exec "ssh -i `"$SshKeyPath`" $ServerUser@$ServerHost 'mkdir -p $ServerPath/releases $tmpPath $ServerPath/assets'"

# Upload all files to temp release
Exec "scp -i `"$SshKeyPath`" -r `"$dist/*`" $ServerUser@$ServerHost:`"$tmpPath/`""

# Atomic move: assets first, then index.html
$cmds = @(
  "set -e",
  "mkdir -p $ServerPath/assets",
  "cp -r $tmpPath/assets/* $ServerPath/assets/ 2>/dev/null || true",
  "cp -r $tmpPath/* $ServerPath/",
  "cp $tmpPath/index.html $ServerPath/index.html"
) -join '; '

Exec "ssh -i `"$SshKeyPath`" $ServerUser@$ServerHost '$cmds'"

Write-Host "Deploy completed: $ServerHost -> $ServerPath" -ForegroundColor Green
