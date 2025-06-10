@echo off
title MindEmo FastAPI Server
echo Starting MindEmo FastAPI Server...
cd /d "%~dp0backend"
python server.py
