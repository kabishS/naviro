@echo off
title Rover Path Planning in Simulated Terrain
echo Starting simulation server on port 8080...
start http://localhost:8080
python -m http.server 8080
pause