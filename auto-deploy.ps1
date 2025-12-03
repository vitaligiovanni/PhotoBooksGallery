# Auto deploy script used by VS Code task
# Builds frontend with prerender and deploys to server

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

Push-Location "$PSScriptRoot\frontend"
try {
  Exec 'npm ci'
  Exec 'npm run build:prerender'
}
finally {
  Pop-Location
}

$dist = Join-Path "$PSScriptRoot" 'frontend/dist'
if (!(Test-Path $dist)) { throw "Build output not found: $dist" }

$timestamp = Get-Date -Format 'yyyyMMddHHmmss'
$tmpPath = "$ServerPath/releases/$timestamp"

# Ensure directories on server
Exec "ssh -i `"$SshKeyPath`" $ServerUser@$ServerHost 'mkdir -p $ServerPath/releases $tmpPath $ServerPath/assets'"

# Upload to temp release
Exec "scp -i `"$SshKeyPath`" -r `"$dist/*`" ${ServerUser}@${ServerHost}:`"$tmpPath/`""

# Atomic publish: assets then indexes
$cmds = @(
  "set -e",
  "mkdir -p $ServerPath/assets",
  "cp -r $tmpPath/assets/* $ServerPath/assets/ 2>/dev/null || true",
  "cp -r $tmpPath/* $ServerPath/",
  "cp $tmpPath/index.html $ServerPath/index.html"
) -join '; '

Exec "ssh -i `"$SshKeyPath`" ${ServerUser}@${ServerHost} '$cmds'"

Write-Host "Auto deploy completed: $ServerHost -> $ServerPath" -ForegroundColor Green
