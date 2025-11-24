# Safe Migration Script for AR Product Integration
# Date: 2025-11-22
# IMPORTANT: Creates backup before applying changes

Write-Host "🔐 AR Product Integration Migration" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Create backup
Write-Host "📦 Step 1: Creating database backup..." -ForegroundColor Yellow
$backupFile = ".\backups\pre-ar-integration-$(Get-Date -Format 'yyyyMMdd-HHmmss').sql"
.\backup-db.ps1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Backup failed! Aborting migration." -ForegroundColor Red
    exit 1
}
Write-Host "✅ Backup created successfully" -ForegroundColor Green
Write-Host ""

# Step 2: Check if migration already applied
Write-Host "🔍 Step 2: Checking if migration already applied..." -ForegroundColor Yellow
$checkQuery = "SELECT column_name FROM information_schema.columns WHERE table_name='ar_projects' AND column_name='product_id'"

$result = docker exec photobooksgallery-db-1 psql -U photobooks_user -d photobooks_db -t -c $checkQuery

if ($result -and $result.ToString().Contains("product_id")) {
    Write-Host "⚠️  Migration already applied! Skipping..." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "✅ Database is up to date" -ForegroundColor Green
    exit 0
}

Write-Host "✅ Migration not yet applied, proceeding..." -ForegroundColor Green
Write-Host ""

# Step 3: Apply migration
Write-Host "🚀 Step 3: Applying migration..." -ForegroundColor Yellow
Write-Host "   Adding: product_id, attached_to_order, ar_price columns" -ForegroundColor Gray

$migrationSQL = Get-Content ".\backend\migrations\add-ar-product-relation.sql" -Raw

try {
    $migrationSQL | docker exec -i photobooksgallery-db-1 psql -U photobooks_user -d photobooks_db
    
    if ($LASTEXITCODE -ne 0) {
        throw "Migration failed"
    }
    
    Write-Host "✅ Migration applied successfully" -ForegroundColor Green
    Write-Host ""
    
    # Step 4: Verify migration
    Write-Host "🔍 Step 4: Verifying migration..." -ForegroundColor Yellow
    
    $verifyQuery = "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name='ar_projects' AND column_name IN ('product_id', 'attached_to_order', 'ar_price') ORDER BY column_name"
    
    $verification = docker exec photobooksgallery-db-1 psql -U photobooks_user -d photobooks_db -c $verifyQuery
    
    Write-Host ""
    Write-Host $verification
    Write-Host ""
    
    if ($verification -match "product_id" -and $verification -match "ar_price") {
        Write-Host "✅ Verification passed! All columns created." -ForegroundColor Green
    } else {
        Write-Host "⚠️  Verification incomplete. Check output above." -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "❌ Migration failed: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "🔄 Rolling back from backup..." -ForegroundColor Yellow
    Write-Host "   Backup location: $backupFile" -ForegroundColor Gray
    Write-Host ""
    Write-Host "⚠️  To restore manually, run:" -ForegroundColor Yellow
    Write-Host "   .\restore-db.ps1 $backupFile" -ForegroundColor White
    exit 1
}

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "✨ Migration completed successfully!" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Restart backend: npm run dev" -ForegroundColor White
Write-Host "  2. Test AR creation with product" -ForegroundColor White
Write-Host "  3. Verify cart integration" -ForegroundColor White
Write-Host ""
