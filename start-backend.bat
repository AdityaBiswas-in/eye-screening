@echo off
echo ========================================================
echo  Starting SIH_RD Diabetic Retinopathy API Backend
echo  API running at: http://localhost:8000
echo  Documentation at: http://localhost:8000/docs
echo ========================================================
cd /d "%~dp0SIH_RD-main\SIH_RD-main"
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
pause
