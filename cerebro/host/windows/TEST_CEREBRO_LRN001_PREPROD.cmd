@echo off
setlocal
set "SCRIPT_DIR=%~dp0"
powershell.exe -NoProfile -Command "$p=Start-Process powershell.exe -Verb RunAs -Wait -PassThru -ArgumentList @('-NoProfile','-File','%SCRIPT_DIR%Test-CerebroLrn001Host.ps1'); exit $p.ExitCode"
if errorlevel 1 (
  echo CEREBRO LRN-001 physical acceptance FAILED. Review the PowerShell output and local logs.
  exit /b 1
)
echo.
echo CEREBRO LRN-001 physical acceptance completed. OS reboot auto-start remains a separate final check.
endlocal
