# Apply AR DB initial schema to local ar_db (port 5434)
param(
    [string]$DbHost = "localhost",
    [int]$DbPort = 5434,
    [string]$DbName = "ar_db",
    [string]$DbUser = "postgres",
    [string]$Password = $env:AR_POSTGRES_PASSWORD,
    [string]$SqlFile = ".\ar-service\src\migrations\001_initial_schema.sql"
)

if (-not (Test-Path $SqlFile)) {
    Write-Error "SQL file not found: $SqlFile"; exit 1
}
if (-not $Password) {
    Write-Error "AR_POSTGRES_PASSWORD env var is not set"; exit 1
}

$env:PGPASSWORD = $Password
Write-Host ("Applying schema to {0} on {1}:{2} using {3}..." -f $DbName, $DbHost, $DbPort, $DbUser) -ForegroundColor Cyan

# Ensure database exists
psql -h $DbHost -p $DbPort -U $DbUser -d postgres -c "SELECT 1" 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Error ("Cannot connect to Postgres at {0}:{1}" -f $DbHost, $DbPort); exit 1
}

# Create DB if missing
$dbExists = psql -h $DbHost -p $DbPort -U $DbUser -d postgres -t -A -c "SELECT 1 FROM pg_database WHERE datname='${DbName}'" 2>$null
if (-not $dbExists) {
    Write-Host "Creating database $DbName..." -ForegroundColor Yellow
     psql -h $DbHost -p $DbPort -U $DbUser -d postgres -c "CREATE DATABASE \"${DbName}\"" | Out-Null
}

# Apply migrations
psql -h $DbHost -p $DbPort -U $DbUser -d $DbName -f $SqlFile
if ($LASTEXITCODE -ne 0) { Write-Error "Migration failed"; exit 1 }
Write-Host "AR schema applied successfully" -ForegroundColor Green
