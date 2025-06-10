@echo off
chcp 65001 >nul
title Ngrok Tunnel Starter
echo ========================================
echo  Ngrok Tunnel Starting Script
echo ========================================
echo.
echo Starting Ngrok tunnel for FastAPI server (localhost:8000)...
echo.

REM Check if Ngrok is installed
where ngrok >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Ngrok is not installed.
    echo.
    echo Installation steps:
    echo 1. Go to https://ngrok.com/
    echo 2. Create account and download Ngrok
    echo 3. Place ngrok.exe in your PATH
    echo.
    pause
    exit /b 1
)

echo Starting Ngrok tunnel...
echo.
echo You can access the application using the generated URL.
echo Press Ctrl+C to stop.
echo.

ngrok http 8000
