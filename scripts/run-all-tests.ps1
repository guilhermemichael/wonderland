$ErrorActionPreference = "Stop"
$env:DATABASE_URL="postgresql://postgres@localhost/wonderland_test"
$env:TEST_DATABASE_URL="postgresql+psycopg://postgres@localhost/wonderland_test"
$env:PYTHONPATH="C:\dev\wonderland-antigravity"

Write-Host "Running Pytest..."
.\.venv\Scripts\python.exe -m pytest apps/api/tests -v

Write-Host "Running test-m04.mjs..."
node --test scripts/test-m04.mjs

Write-Host "All tests completed."
