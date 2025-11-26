# ==========================================
# Test Data Cleanup Script
# ==========================================

Write-Host "Cleaning test files..." -ForegroundColor Cyan

$removed = 0
$errors = 0

# Функция безопасного удаления
function Remove-SafePath {
    param([string]$Path)
    
    if (Test-Path $Path) {
        try {
            Remove-Item -Path $Path -Recurse -Force -ErrorAction Stop
            $script:removed++
            Write-Host "Removed: $Path" -ForegroundColor Green
            return $true
        } catch {
            $script:errors++
            Write-Host "Error removing: $Path - $($_.Exception.Message)" -ForegroundColor Red
            return $false
        }
    } else {
        Write-Host "Not found: $Path" -ForegroundColor Yellow
        return $false
    }
}

Write-Host "`nCleaning backend/objects/ar-storage..." -ForegroundColor Yellow

# Удаляем тестовые AR проекты
$testProjects = @(
    "backend\objects\ar-storage\demo-*",
    "backend\objects\ar-storage\test-*",
    "backend\objects\ar-storage\manual-test*",
    "backend\objects\ar-storage\*-test"
)

foreach ($pattern in $testProjects) {
    $items = Get-ChildItem -Path $pattern -ErrorAction SilentlyContinue
    foreach ($item in $items) {
        Remove-SafePath -Path $item.FullName
    }
}

Write-Host "`nCleaning backend/objects/uploads..." -ForegroundColor Yellow

# Удаляем тестовые загрузки
$testUploads = @(
    "backend\objects\uploads\demo_*",
    "backend\objects\uploads\test_*",
    "backend\objects\uploads\*.tmp"
)

foreach ($pattern in $testUploads) {
    $items = Get-ChildItem -Path $pattern -ErrorAction SilentlyContinue
    foreach ($item in $items) {
        Remove-SafePath -Path $item.FullName
    }
}

Write-Host "`nCleaning temp files..." -ForegroundColor Yellow

# Удаляем временные файлы и кеш
$tempItems = @(
    "ar-service\storage\mind-cache",
    "test-masks-output",
    "*.log",
    "*.tmp",
    "backend-update.tar",
    "frontend-dist.tar.gz",
    "full-backup.dump",
    "production-backup.dump",
    "production-data-dump.sql",
    "production-data-utf8.sql",
    "plain-backup.sql",
    "restore-basic-data.sql",
    "restore-data-correct.sql"
)

foreach ($pattern in $tempItems) {
    $items = Get-ChildItem -Path $pattern -ErrorAction SilentlyContinue
    foreach ($item in $items) {
        Remove-SafePath -Path $item.FullName
    }
}

Write-Host "`nCleaning test scripts..." -ForegroundColor Yellow

# Удаляем тестовые скрипты
$testScripts = @(
    "test-mask-generation.js",
    "test-multi-target.mjs",
    "test-multi-target.ps1",
    "test-video-resize-logic.mjs",
    "migrate-ar-*.ps1",
    "migrate-ar-projects.mjs",
    "cleanup-failed-ar-projects.sql"
)

foreach ($script in $testScripts) {
    Remove-SafePath -Path $script
}

Write-Host "`nCleanup complete!" -ForegroundColor Cyan
Write-Host "  Removed: $removed items" -ForegroundColor Green
Write-Host "  Errors: $errors" -ForegroundColor $(if ($errors -gt 0) { "Red" } else { "Green" })

Write-Host "`nGit status:" -ForegroundColor Cyan
git status --short

Write-Host "`nCleanup completed!" -ForegroundColor Green
