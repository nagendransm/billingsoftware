@echo off
title Billr - Retail POS Billing
cd /d "%~dp0"

echo ========================================================
echo   Starting Billr Retail POS Billing Software...
echo ========================================================

:: Start backend server if not running
start /b "" node server/index.js

:: Wait a brief moment for server to initialize
timeout /t 2 /nobreak >nul

:: Launch via Edge Desktop App Window (100% immune to Windows Smart App Control)
if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
    start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --app="http://localhost:5000" --window-size=1440,900
) else if exist "C:\Program Files\Microsoft\Edge\Application\msedge.exe" (
    start "" "C:\Program Files\Microsoft\Edge\Application\msedge.exe" --app="http://localhost:5000" --window-size=1440,900
) else (
    start "" "http://localhost:5000"
)
