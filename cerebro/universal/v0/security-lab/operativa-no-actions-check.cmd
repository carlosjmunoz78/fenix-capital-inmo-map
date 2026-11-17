@echo off
setlocal EnableExtensions DisableDelayedExpansion
cd /d "%~dp0..\..\..\.." || exit /b 2
where node >nul 2>nul
if errorlevel 1 (
  echo CEREBRO_NO_ACTIONS_NODE_MISSING=TRUE
  exit /b 2
)
node cerebro\universal\v0\security-lab\operativa-no-actions.mjs --status
if errorlevel 1 exit /b 1
node cerebro\universal\v0\security-lab\operativa-no-actions.mjs --self-test
if errorlevel 1 exit /b 1
echo CEREBRO_NO_ACTIONS_LOCAL_OFFLINE_GATE=PASS
exit /b 0
