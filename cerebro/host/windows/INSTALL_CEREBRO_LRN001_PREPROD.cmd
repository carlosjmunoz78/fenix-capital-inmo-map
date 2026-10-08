@echo off
setlocal
set "SCRIPT_DIR=%~dp0"
powershell.exe -NoProfile -Command "Start-Process powershell.exe -Verb RunAs -Wait -ArgumentList @('-NoProfile','-File','%SCRIPT_DIR%Install-CerebroLrn001Host.ps1','-PolicyPass','-SecurityPass','-EnableLocalPersistence')"
if errorlevel 1 (
  echo CEREBRO LRN-001 installation did not complete successfully.
  exit /b 1
)
echo.
echo CEREBRO LRN-001 PREPROD install command completed.
echo Run Get-CerebroLrn001Health.ps1 to verify physical GREEN evidence.
endlocal
