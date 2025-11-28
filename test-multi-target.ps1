# Test Multi-Target AR Compilation
# Send 2 photos + 2 videos to ar-service

$body = @{
    userId = "test-user-123"
    photoUrls = @(
        "/objects/uploads/demo-1763894677822-zi5sm5o-photo.jpg",
        "/objects/uploads/demo-1763895255921-n53igck-photo.jpg"
    )
    videoUrls = @(
        "/objects/uploads/demo-1763894677822-zi5sm5o-video.mp4",
        "/objects/uploads/demo-1763895255921-n53igck-video.mp4"
    )
    isDemo = $true
}

$json = $body | ConvertTo-Json -Compress

Write-Host "Sending multi-target compilation request..." -ForegroundColor Yellow
Write-Host "Photos: 2" -ForegroundColor Cyan
Write-Host "Videos: 2" -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri 'http://localhost:5000/compile' -Method POST -Body $json -ContentType 'application/json'
    Write-Host "`n✅ SUCCESS!" -ForegroundColor Green
    Write-Host "Project ID: $($response.projectId)" -ForegroundColor Green
    Write-Host "Markers: $($response.markersCount)" -ForegroundColor Green
    Write-Host "Status: $($response.status)" -ForegroundColor Green
    
    # Wait 5 seconds and check status
    Start-Sleep -Seconds 5
    Write-Host "`nChecking compilation status..." -ForegroundColor Yellow
    $status = Invoke-RestMethod -Uri "http://localhost:5000/status/$($response.projectId)"
    Write-Host "Status: $($status.status)" -ForegroundColor $(if ($status.status -eq 'ready') { 'Green' } else { 'Yellow' })
    
} catch {
    Write-Host "`n❌ ERROR!" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}
