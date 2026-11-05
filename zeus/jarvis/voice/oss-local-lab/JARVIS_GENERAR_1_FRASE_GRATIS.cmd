@echo off
setlocal
cd /d "%~dp0"
echo ==============================================
echo  CEREBRO / JARVIS V2 - PRUEBA LOCAL SIN CREDITOS
 echo  Descarga modelo libre solo si equipo es apto
 echo  Requiere Internet una sola vez para los pesos
 echo  Puede ocupar varios GB. Ninguna API de pago.
 echo ==============================================
py -3.11 --version >nul 2>&1
if errorlevel 1 (
 echo Se necesita Python 3.11 instalado.
 pause
 exit /b 2
)
py -3.11 jarvis_local_voice.py probe
if errorlevel 1 (
 echo Equipo no preparado. No instalare nada.
 pause
 exit /b 3
)
if not exist .venv-jarvis-oss (
 py -3.11 -m venv .venv-jarvis-oss
 if errorlevel 1 goto fail
)
.venv-jarvis-oss\Scripts\python.exe -m pip install --disable-pip-version-check "git+https://github.com/resemble-ai/chatterbox.git@ab55923c27757c90cfcc407baa57dc25a7d25217"
if errorlevel 1 goto fail
.venv-jarvis-oss\Scripts\python.exe jarvis_local_voice.py render --allow-model-download
if errorlevel 1 goto fail
echo.
echo OK: la primera frase nueva esta en output\
echo El resultado necesita comparacion auditiva para aprobar la voz.
pause
exit /b 0
:fail
echo NO SE HA COMPLETADO LA GENERACION. La voz maestra sigue intacta.
pause
exit /b 4