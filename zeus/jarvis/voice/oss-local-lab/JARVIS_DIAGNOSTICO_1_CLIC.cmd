@echo off
setlocal
cd /d "%~dp0"
echo ============================================
echo  JARVIS V2 - DIAGNOSTICO SIN INSTALACIONES
echo ============================================
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0JARVIS_DIAGNOSTICO_1_CLIC.ps1"
if errorlevel 1 (
 echo No se ha podido completar el diagnostico con PowerShell.
)
echo.
echo Archivo: output\JARVIS_DIAGNOSTICO_HARDWARE.json
 echo Puedes adjuntarlo aqui para que revise los requisitos.
pause