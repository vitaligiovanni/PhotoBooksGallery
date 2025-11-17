$ErrorActionPreference = 'Stop'

$repoRoot = Resolve-Path "$PSScriptRoot\..\.."
. "$PSScriptRoot\_load-env.ps1" "$repoRoot\.env.sync"

$REMOTE = "$env:SYNC_USER@$env:SYNC_HOST"
$REMOTE_DIR = $env:REMOTE_DIR
$SSH_PORT = if ($env:SSH_PORT) { $env:SSH_PORT } else { '22' }

Write-Host "[sync:pull] Packing files on remote..." -ForegroundColor Cyan
ssh -p $SSH_PORT $REMOTE "tar -C $REMOTE_DIR -czf /tmp/pbg-files.tgz backend/objects uploads" 

$dst = Join-Path $repoRoot "pbg-files.tgz"
Write-Host "[sync:pull] Downloading archive to $dst ..." -ForegroundColor Cyan
scp -P $SSH_PORT "${REMOTE}:/tmp/pbg-files.tgz" "$dst"

Write-Host "[sync:pull] Extracting locally..." -ForegroundColor Cyan
Set-Location $repoRoot
tar -xzf "$dst"
Remove-Item "$dst" -Force

Write-Host "[sync:pull] Restarting local containers (backend, frontend)..." -ForegroundColor Cyan
docker compose restart backend frontend | Out-Null

Write-Host "[sync:pull] Done." -ForegroundColor Green
