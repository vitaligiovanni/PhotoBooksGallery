Param(
  [string]$Message = "Auto deploy $(Get-Date -Format 'yyyy-MM-dd HH:mm')",
  [switch]$SkipBuild,
  [switch]$Force
)

# Git-based deployment script for Beget server
# Usage: ./scripts/git-deploy.ps1 -Message "Fix banner system"

$ErrorActionPreference = 'Stop'

function Info($msg) { Write-Host "[INFO] $msg" -ForegroundColor Green }
function Warn($msg) { Write-Host "[WARN] $msg" -ForegroundColor Yellow }
function Error($msg) { Write-Host "[ERROR] $msg" -ForegroundColor Red }

Info "Starting Git-based deployment"

# Step 1: Check if we have uncommitted changes
$status = git status --porcelain
if (-not $status -and -not $Force) {
    Warn "No changes to commit. Use -Force to push anyway."
    exit 0
}

# Step 2: Build project locally (optional)
if (-not $SkipBuild) {
    Info "Building project locally..."
    try {
        npm run build
        if ($LASTEXITCODE -ne 0) { throw "Build failed" }
    } catch {
        Error "Local build failed: $_"
        exit 1
    }
}

# Step 3: Add all changes to Git
Info "Adding changes to Git..."
git add .
if ($LASTEXITCODE -ne 0) {
    Error "Failed to add files to Git"
    exit 1
}

# Step 4: Commit changes
Info "Committing changes: $Message"
git commit -m "$Message"
if ($LASTEXITCODE -ne 0) {
    Warn "No changes to commit or commit failed"
}

# Step 5: Push to remote repository
Info "Pushing to remote repository..."
git push origin main
if ($LASTEXITCODE -ne 0) {
    Error "Failed to push to remote repository"
    exit 1
}

# Step 6: Trigger deployment on server
Info "Triggering deployment on Beget server..."
try {
    ssh root@82.202.129.237 'cd /var/www/photobooksgallery && bash deploy-git.sh'
    if ($LASTEXITCODE -eq 0) {
        Info "Deployment completed successfully!"
    } else {
        Error "Server deployment failed with exit code $LASTEXITCODE"
        exit 1
    }
} catch {
    Error "Failed to connect to server or execute deployment: $_"
    exit 1
}

# Step 7: Quick health check
Info "Performing health check..."
try {
    $response = ssh root@82.202.129.237 'curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/ || echo "FAIL"'
    if ($response -eq "200") {
        Info "✅ Site is responding correctly (HTTP 200)"
    } else {
        Warn "⚠️  Site response: $response (may need time to restart)"
    }
} catch {
    Warn "Could not perform health check"
}

Info "Git deployment completed!"
Write-Host ""
Write-Host "Next time you can deploy with:" -ForegroundColor Cyan
Write-Host "  ./scripts/git-deploy.ps1 -Message 'Your commit message'"
Write-Host "  ./scripts/git-deploy.ps1 -SkipBuild  # if dist is already built"