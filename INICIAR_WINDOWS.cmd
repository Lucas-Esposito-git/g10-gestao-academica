@echo off
cd /d "%~dp0"
echo =========================================
echo G10 - Gestao Academica - Docker Compose
echo =========================================
echo Verifique se Docker Desktop esta aberto.
docker compose version || (echo Instale/inicie Docker Desktop. & pause & exit /b 1)
docker compose up --build
if errorlevel 1 echo Ocorreu um erro. Consulte docs\como-rodar-windows.md
pause
