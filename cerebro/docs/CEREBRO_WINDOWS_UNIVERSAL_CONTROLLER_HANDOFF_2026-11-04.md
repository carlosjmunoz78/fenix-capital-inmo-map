# CEREBRO OS · Windows Universal Device Controller · Traspaso operativo 2026-11-04

Estado: DEFINIDO / POR IMPLEMENTAR. Fuente completa: Biblioteca personal `/CEREBRO_OS/CEREBRO_WINDOWS_CONTROL_UNIVERSAL_TRASPASO_2026-11-04.md` y fichero de diagnóstico de Windows subido al proyecto. Este documento se añade a la rama aislada, NO es autorización para borrar, instalar ni tocar PROD.

## Objetivo
Un único instalador universal Windows, ejecución silenciosa, icono visible en bandeja con ONLINE/OFFLINE/PAUSED/ERROR, activar/pausar/reiniciar, autoarranque, actualizaciones auditadas, backup/rebuild/rollback, control autorizado de escritorio y periféricos, permisos por dispositivo, inventario, gateway central y enrolamiento multiequipo. Coste adicional 0 €. No prometer funciones sin pruebas físicas ni activar control oculto.

## Diagnóstico físico 2026-11-04, DESKTOP-028M1HO
- Proceso: `CEREBRO_DEVICE_ACCESSBOOT_UNIVERSAL.exe`, PID 5624, en `%LOCALAPPDATA%\CEREBRO\UniversalDevice`.
- Tarea `\CEREBRO-Supervisor-PREPROD` Running; `powershell.exe`; LastTaskResult 267009 (no demuestra salud).
- Seis arranques `HKCU Run`: CEREBRODeviceAgent, CEREBROBrowserAgentHost, CEREBROControlledBrowser, CEREBRODeviceAgentUniversalV023, CEREBRODeviceEvidenceHostV024, CEREBROUniversalDeviceControllerV2.
- Dos Startup: `CEREBRO-AutoUpdater.cmd`, `CEREBRO-Device-Agent.cmd`.
- Puerto 8765 sin listener observado o consulta no disponible; antes había ventana de Browser Agent Host 0.3.0 y WinError 32.
- Doce subcarpetas `%LOCALAPPDATA%\CEREBRO`: AccessBoot, Backups, browser-bridge, DeviceAgent, DeviceAgentUniversal, diag-v039, Sandbox, SupervisorBootstrap, SupervisorBootstrapV2, SupervisorRuntime, UniversalBrowser, UniversalDevice.
- Nada ha sido borrado/desactivado. Faltan backups y análisis de dependencias/acciones de arranque.

## Reutilizar antes de construir
`cerebro/scripts/get-runtime001-windows-host-evidence-readonly-v1.ps1`,
`cerebro/scripts/install-supervisor-preprod-windows.ps1` (IMPORTANTE: puede detener/reemplazar tarea previa, **NO EJECUTAR SIN BACKUP**),
`cerebro/host/windows/Install-CerebroLrn001Host.ps1`,
`cerebro/runtime/universal-device-command-envelope-v2.mjs`,
`cerebro/runtime/job001-host-status-v1.mjs`,
`cerebro/runtime/cerebro-supervisor-entrypoint-v1.mjs`.
Auditar otras implementaciones Windows y reutilizar el mejor host/scheduler, sin duplicaciones.

## Secuencia
1. Inventario exhaustivo no destructivo (firmas y hashes de binarios, dependencias, procesos, tareas, registro, paths, usuario, puertos, heartbeat, logs redaccionados).
2. Backup de tareas, claves de arranque, scripts, binarios, configuraciones sin volcar claves. Rollback probado.
3. Adaptador de compatibilidad y tray con un proceso de fondo y estado verificable; ejecución en PREPROD, sin colisiones ni ventanas negras, scope company_id/device_id/environment/version, control explícito y kill-switch.
4. Installer/upgrade/uninstaller idempotentes, aislados y testeados; UAC explícito para operaciones que lo necesiten. Un único instalador para varios PCs con identidades independientes.
5. Pruebas de integración local: inicio, pausa, stop/restart, navegador, entradas de escritorio, hardware disponible con consentimiento, reconexión, reboot, journal, scope, coste, seguridad y observabilidad. Todo sin tocar App/CRM/Trading PROD.
6. Migración gradual: deshabilitar arranques antiguos uno a uno SOLO tras nuevo host healthy y rollback verificable; borrar obsoletos solo tras aceptación documentada.

## Límites y contexto
8 motores RUNTIME-001, KNW-001, TRN-001, FINOPS-001, DOC-001..004 tienen tests de integración PREPROD GitHub verdes, no autonomía PROD verificada. 179 motores en registro, 25/179 pasan clasificación estricta estática del auditor (no son 25 PROD vivos), 169 es clasificación histórica separada. El host RUNTIME-001 no tiene verificación física de heartbeat; referencias PROD smoke de GitHub aún faltan. Trading REAL aislado; main, App/CRM, DNS y Supabase PROD intocables.
No publicar secretos ni argumentaciones de comandos sensibles. Regla CONSERVAR → ENTENDER → ENVOLVER → PROBAR → MEJORAR → MIGRAR.

## Criterio DONE
Paquete de Windows realmente construido (checksum y procedencia), interfaz tray funcional y operativa, respaldo y desinstalador; tests CI y pruebas del PC real tras reinicio; ninguna ventana negra; conexión central, logs/auditoría/rollback, antiguos arranques neutralizados reversiblemente sin afectar dispositivos. Hasta entonces etiquetar PARCIAL.
