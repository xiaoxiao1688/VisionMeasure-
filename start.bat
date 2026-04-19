@echo off
setlocal

set "ROOT=%~dp0"
cd /d "%ROOT%"

powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%start.ps1"

endlocal
