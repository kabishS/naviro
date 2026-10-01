@echo off
title PX4 SITL Bridge Launcher
echo ======================================================================
echo Starting PX4 Integration Bridge Server...
echo ======================================================================
cd /d "%~dp0"
python bridge_server.py
pause