@echo off
cd /d "%~dp0"
echo Deploying Eton Safaris to GitHub / Vercel...
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Deploy-Site.ps1" %*
echo.
echo Window stays open so you can read any errors.
pause
