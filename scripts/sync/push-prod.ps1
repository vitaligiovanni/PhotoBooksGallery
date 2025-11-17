$ErrorActionPreference = 'Stop'

$repoRoot = Resolve-Path "$PSScriptRoot\..\.."
. "$PSScriptRoot\_load-env.ps1" "$repoRoot\.env.sync"

$REMOTE = "$env:SYNC_USER@$env:SYNC_HOST"
$REMOTE_DIR = $env:REMOTE_DIR
$SSH_PORT = if ($env:SSH_PORT) { $env:SSH_PORT } else { '22' }

Set-Location $repoRoot
if (!(Test-Path ".\backend\objects")) { New-Item -ItemType Directory ".\backend\objects" | Out-Null }
if (!(Test-Path ".\uploads")) { New-Item -ItemType Directory ".\uploads" | Out-Null }

Write-Host "[sync:push] Creating local archive..." -ForegroundColor Cyan
tar -czf ".\pbg-files.tgz" backend/objects uploads

Write-Host "[sync:push] Uploading to remote..." -ForegroundColor Cyan
scp -P $SSH_PORT ".\pbg-files.tgz" "${REMOTE}:/tmp/pbg-files.tgz"
Remove-Item ".\pbg-files.tgz" -Force

Write-Host "[sync:push] Unpacking on remote and restarting backend..." -ForegroundColor Cyan
ssh -p $SSH_PORT $REMOTE "tar -xzf /tmp/pbg-files.tgz -C $REMOTE_DIR && rm /tmp/pbg-files.tgz && cd $REMOTE_DIR && docker compose restart backend"

Write-Host "[sync:push] Done." -ForegroundColor Green
