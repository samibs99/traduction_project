@echo off
cd /d "%~dp0editeur-ai"
echo Starting FastAPI microservice on http://127.0.0.1:8000...
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
pause
