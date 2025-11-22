# AR Migration - Simple Version
Write-Host "AR Product Integration Migration" -ForegroundColor Cyan
Write-Host ""

# Backup
Write-Host "[1/3] Creating backup..." -ForegroundColor Yellow
Write-Host "SKIP backup for now (manual if needed)" -ForegroundColor Gray

# Apply
Write-Host "[2/3] Applying migration..." -ForegroundColor Yellow
$sql = Get-Content ".\backend\migrations\add-ar-product-relation.sql" -Raw
$sql | docker exec -i photobooks_db psql -U photobooks -d photobooks

if ($LASTEXITCODE -eq 0) {
    Write-Host "[3/3] Verifying..." -ForegroundColor Yellow
    docker exec photobooks_db psql -U photobooks -d photobooks -c "SELECT column_name FROM information_schema.columns WHERE table_name='ar_projects' AND column_name IN ('product_id', 'attached_to_order', 'ar_price')"
    Write-Host ""
    Write-Host "SUCCESS! Migration completed." -ForegroundColor Green
    Write-Host "Next: Restart backend (npm run dev)" -ForegroundColor Cyan
} else {
    Write-Host "ERROR: Migration failed" -ForegroundColor Red
}
