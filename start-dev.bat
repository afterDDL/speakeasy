@echo off
setlocal
set "ROOT=%~dp0"
set "NODE_DIR=%ROOT%.tools\node-v24.16.0-win-x64"
set "PATH=%NODE_DIR%;%PATH%"
cd /d "%ROOT%"
"%NODE_DIR%\npm.cmd" run dev -- --port 5173
