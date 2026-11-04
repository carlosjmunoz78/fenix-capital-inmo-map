# CEREBRO OS · Universal Control · V0.1.0 · PREPROD

**ENTREGABLE REAL:** `CEREBRO_ControlUniversal_V0_1_0.exe` es un ejecutable PE32+ Windows x64, construido con Go 1.23 sin módulos externos ni IA de pago. Es una **pieza adicional de interfaz y observabilidad**, NO el controlador remoto completo ni una sustitución de AccessBoot.

## Qué hace esta versión
- Doble clic: instala una copia versionada para el usuario actual en `%LOCALAPPDATA%\CEREBRO\UniversalControlV0\versions\v0.1.0\` e inicia la bandeja sin abrir consola negra (subsistema GUI Windows).
- Autoarranque solamente mediante la nueva clave `HKCU\...\Run\CEREBROUniversalControlV0`. No crea servicio, tarea programada ni otro supervisor.
- Icono de bandeja: botón derecho → **Activar monitor local / Pausar monitor local / Reiniciar comprobación / Comprobar estado / Desinstalar autoarranque V0 / Detener y salir**. Windows puede ocultar el icono en el menú `^` de iconos; fijarlo requiere preferencia del usuario en la barra de tareas.
- Comprobación estrictamente de solo lectura `GET http://127.0.0.1:{8765,8766,8767,8768}/health`. Sin acceso a puertos remotos ni envío de datos externos.
- Identidad local aleatoria y estable **distinta para cada equipo**. Empresa marcada `UNBOUND` hasta enrolamiento y scopes autorizados por comando; no se trasladan credenciales entre ordenadores.
- Estado auditado y redaccionado en `%LOCALAPPDATA%\CEREBRO\UniversalControlV0\status.json`; eventos mínimos en `events.log`; backup del valor previo de **la clave propia**, cifrado por Windows DPAPI Current User.
- Reinstalación idempotente: no sobrescribe un ejecutable de la misma versión con contenido distinto y no pisa ejecutables que se estén ejecutando (prevención de WinError 32).
- `--uninstall`: elimina SOLO el autoarranque V0 y detiene la bandeja, conserva binarios/versiones, backup y logs para rollback. `--rollback` restaura exclusivamente el estado anterior de esa clave propia.

## Lo que NO hace (bloqueado a propósito)
- No instala ni retira los 6 arranques anteriores, los 2 scripts Inicio ni `CEREBRO-Supervisor-PREPROD`.
- No reemplaza `CEREBRO_DEVICE_ACCESSBOOT_UNIVERSAL.exe`, no controla ratón/teclado, no toma capturas, no accede a archivos ni periféricos.
- No se conecta a Gateway, no acepta comandos remotos, no administra software, no escribe en App/CRM/Trading y no ha superado todavía pruebas físicas Windows.
- No declara estado remoto `ONLINE` por recibir 200 local: solo muestra `LOCAL_ALL_LISTENERS` o `LOCAL_PARTIAL`.
- No se autoconcede permisos, no elude UAC/MFA/consentimiento, no abre puertos escuchando y no se conecta a servicios de pago.

## Uso y pruebas en el PC
**Estado de entrega: LAB_BUILD_GREEN / WINDOWS_PHYSICAL_PENDING.** Para ensayo **side-by-side PREPROD** en un PC autorizado, hacer doble clic una vez en `CEREBRO_ControlUniversal_V0_1_0.exe`. No necesita UAC: instalación en el usuario actual. Comprobar el icono en el área de notificación (menú `^` si está oculto) y la opción *Comprobar estado*. Si aparecen advertencias de SmartScreen, el artefacto no está firmado por una entidad de confianza: verificar SHA-256 y procedencia antes de aceptar; no desactivar SmartScreen como política general.

Para ejecutar acciones de mantenimiento, desde PowerShell en la carpeta donde está el EXE:

```powershell
.\CEREBRO_ControlUniversal_V0_1_0.exe --status
.\CEREBRO_ControlUniversal_V0_1_0.exe --pause
.\CEREBRO_ControlUniversal_V0_1_0.exe --resume
.\CEREBRO_ControlUniversal_V0_1_0.exe --restart
.\CEREBRO_ControlUniversal_V0_1_0.exe --uninstall
.\CEREBRO_ControlUniversal_V0_1_0.exe --rollback
```

Para producción o desactivación del legado se requiere inventario físico detallado, backup, comparación OLD/NEW, integración validada con AccessBoot, enrolamiento por dispositivo, Gateway autenticado, pruebas de reboot y rollback físico. **No instalar como sustituto de un agente anterior.**

## Fuentes canónicas conservadas
- Biblioteca `/CEREBRO_OS/CEREBRO_WINDOWS_CONTROL_UNIVERSAL_TRASPASO_2026-11-04.md`.
- GitHub `cerebro/docs/CEREBRO_WINDOWS_UNIVERSAL_CONTROLLER_HANDOFF_2026-11-04.md` @ `381b87935dd8f7533ff1c54d1e07ad20531f5cb1`.
- `CEREBRO_DIAGNOSTICO_WINDOWS.txt` (2026-11-04, DESKTOP-028M1HO).
- Controller v0.5.0 ya construido en otra línea de desarrollo (registry `accessboot-v0.5.0-portable-prod-capable-candidate.json`), pendiente de captura del runtime físico, segundo PC y aceptación. No se duplica ni sustituye.
- Contrato `cerebro/runtime/universal-device-command-envelope-v2.mjs`: el futuro ejecutor deberá aplicar scope exacto, identidad, idempotencia, caducidad y política por comando antes de cualquier efecto.
