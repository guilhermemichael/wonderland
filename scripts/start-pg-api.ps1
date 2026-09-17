$ErrorActionPreference = "Stop"

.\pgsql\bin\pg_ctl.exe -D .\pgsql\data -l .\pgsql\logfile start
Start-Sleep -Seconds 2

if (-not $env:DATABASE_URL) {
    $env:DATABASE_URL="postgresql://postgres@localhost/wonderland_test"
}
$env:PYTHONPATH="C:\dev\wonderland-antigravity"
$env:WONDERLAND_ENVIRONMENT="production"

$dbUrl = $env:DATABASE_URL

if ($env:ALLOW_TEST_DB_RESET -eq "1") {
    Write-Host "Destructive reset requested. Validating safety conditions..."
    if ($dbUrl -notmatch "^postgresql://[^:]+(:[^@]+)?@(localhost|127\.0\.0\.1)(:\d+)?/wonderland_test$") {
        Write-Error "ABORT: Unsafe database URL for reset: $dbUrl"
        exit 1
    }
    Write-Host "Safety conditions met. Target database: wonderland_test on localhost. Executing destructive reset."
    cd apps\api
    ..\..\pgsql\bin\psql.exe -U postgres -d wonderland_test -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
    ..\..\.venv\Scripts\python.exe -m alembic upgrade head
    cd ..\..
} else {
    Write-Host "No reset requested. Skipping destructive schema reset."
    cd apps\api
    ..\..\.venv\Scripts\python.exe -m alembic upgrade head
    cd ..\..
}

.\.venv\Scripts\python.exe -m uvicorn apps.api.main:app --host 127.0.0.1 --port 8000
