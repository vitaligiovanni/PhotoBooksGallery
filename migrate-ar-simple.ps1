# Simple AR Migration Script
# Date: 2025-11-22

Write-Host "🔐 AR Product Integration Migration" -ForegroundColor Cyan
Write-Host ""

# Create backup first
Write-Host "📦 Creating backup..." -ForegroundColor Yellow
.\backup-db.ps1

# Apply migration
Write-Host "🚀 Applying migration..." -ForegroundColor Yellow
$sql = Get-Content ".\backend\migrations\add-ar-product-relation.sql" -Raw
$sql | docker exec -i photobooksgallery-db-1 psql -U photobooks_user -d photobooks_db

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Migration completed!" -ForegroundColor Green
    
    # Verify
    Write-Host "🔍 Verifying..." -ForegroundColor Yellow
    docker exec photobooksgallery-db-1 psql -U photobooks_user -d photobooks_db -c "SELECT column_name FROM information_schema.columns WHERE table_name='ar_projects' AND column_name IN ('product_id', 'attached_to_order', 'ar_price')"
    
    Write-Host ""
    Write-Host "✨ Done! Restart backend to apply schema changes." -ForegroundColor Green
} else {
    Write-Host "❌ Migration failed!" -ForegroundColor Red
}
