Write-Host "========================================================" -ForegroundColor Cyan
Write-Host " Starting SIH_RD Diabetic Retinopathy API Backend" -ForegroundColor Cyan
Write-Host " API URL: http://localhost:8000" -ForegroundColor Green
Write-Host " Docs:    http://localhost:8000/docs" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Cyan

Set-Location -Path "$PSScriptRoot\SIH_RD-main\SIH_RD-main"
& ".\.venv\Scripts\python.exe" -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
