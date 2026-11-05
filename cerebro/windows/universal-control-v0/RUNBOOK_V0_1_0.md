# Runbook · Universal Windows Control V0.1.0

## Criterio de conservación
**CONSERVAR → ENTENDER → ENVOLVER → PROBAR → MEJORAR → MIGRAR.** El instalador V0 no ejecuta `install-supervisor-preprod-windows.ps1` porque este reemplaza la tarea existente. No abre nuevos puertos ni crea worker/scheduler de negocio. Usa únicamente un proceso de UI local por sesión de usuario.

## Inventario físico disponible (corte 2026-11-04)
PC `DESKTOP-028M1HO`: seis claves Run (`CEREBRODeviceAgent`, `CEREBROBrowserAgentHost`, `CEREBROControlledBrowser`, `CEREBRODeviceAgentUniversalV023`, `CEREBRODeviceEvidenceHostV024`, `CEREBROUniversalDeviceControllerV2`), dos scripts Inicio (`CEREBRO-AutoUpdater.cmd`, `CEREBRO-Device-Agent.cmd`), tarea `CEREBRO-Supervisor-PREPROD` Running pero no verificada healthy (267009), PID 5624 `CEREBRO_DEVICE_ACCESSBOOT_UNIVERSAL.exe`, doce carpetas de generaciones CEREBRO, puerto 8765 sin listener confirmado y precedente `WinError 32`. **Ninguno se desactiva ni borra.**

## Componentes reutilizables auditados en repo
- `cerebro/runtime/universal-device-command-envelope-v2.mjs`: autoridad de alcance, fail-closed PROD, idempotencia, deny wildcard.
- `cerebro/scripts/get-runtime001-windows-host-evidence-readonly-v1.ps1`: inventario heartbeat/journal de solo lectura.
- `cerebro/runtime/cerebro-supervisor-entrypoint-v1.mjs` + JOB001: supervisor compartido existente; no crear otro.
- `cerebro/scripts/install-supervisor-preprod-windows.ps1`: **MUTANTE; NO EJECUTAR** antes de backup y aceptación física.
- `cerebro/host/windows/Install-CerebroLrn001Host.ps1`: instalador elevado SYSTEM distinto; **NO REUTILIZAR PARA UI**.
- `cerebro/registry/accessboot-v0.5.0-portable-prod-capable-candidate.json`: base single EXE de AccessBoot, con captura física del stack 8765–8768 aún pendiente. Mantenerlo como candidato ejecutor, envolverlo después.

## Gates
| Gate | Resultado |
|---|---|
| Fuente Go V0 y tests de política | HECHO · Go local |
| Build PE32+ Windows amd64 GUI | HECHO · Go cross-compile |
| Binario deterministic rebuild | HECHO · SHA256 idéntico |
| Sin sockets abiertos / sin comandos remotos | DEFINIDO EN CÓDIGO · sin ensayo Windows |
| DPAPI copia de Run propia | COMPILADO · sin ensayo Windows |
| Tray y ventana invisible en Windows real | PENDIENTE FÍSICO |
| Arranque tras reinicio / icono persistente | PENDIENTE FÍSICO |
| Control remoto + Gateway con políticas | NO IMPLEMENTADO V0 |
| Backup + rollback físico | PENDIENTE FÍSICO |
| Comparación OLD vs NEW de dispositivos | PENDIENTE |
| Retirada reversible de legado | NO AUTORIZADA TODAVÍA |
| Trading/App/CRM PROD | NO TOCADOS |

## Prueba mínima en PC real (sin eliminar nada)
1. Guardar `CEREBRO_DIAGNOSTICO_WINDOWS.txt` y registrar hash del EXE recibido antes de ejecutarlo.
2. Ejecutar EXE solo para PREPROD *side-by-side*. Verificar que aparece el icono de bandeja sin consola.
3. Comprobar menú, Pausa→Activar y `status.json` sin secretos. Registrar cuatro listeners, sin declarar conectividad remota.
4. Reiniciar Windows cuando sea posible, verificar que la UI vuelve y comparar los ocho arranques antiguos y la tarea con el inventario previo.
5. Desinstalar **solo V0** desde la bandeja y verificar que desaparece su Run propia; legacy permanece intacto. Reinstalar y verificar idempotencia.
6. No eliminar ninguna clave vieja hasta el cierre físico de AccessBoot 8765–8768, Gateway autenticado, tests de control con consentimiento, backup y restore de cada entrada.

## Recuperación
- Si la UI está presente: menú → **Desinstalar autoarranque V0**; conserva binarios y copias.
- Si no aparece: abrir PowerShell y ejecutar el EXE con `--uninstall` desde la carpeta descargada.
- Para restablecer valor previo de la clave propia: `--rollback`, usando el backup DPAPI creado en el mismo usuario/PC. Este backup **no** es portable a otro usuario/ordenador.
- Si el antivirus o Windows bloquea el EXE, **no deshabilitar protecciones**: registrar el código y revisar firma/procedencia.
- Logs: `%LOCALAPPDATA%\CEREBRO\UniversalControlV0\events.log` (solo enumeraciones estables, sin argumentos).

## Siguiente bloque exacto
`UNIVERSAL_WINDOWS_V0_PHYSICAL_INVENTORY_AND_UI_SMOKE`: recoger hashes/firmas/commandlines redaccionadas/puertos reales de AccessBoot y arranques, verificar tray y DPAPI en Windows, después adaptar el mejor ejecutor AccessBoot v0.5.0 sin sustituirlo. Ningún progreso de RUNTIME/KNW/TRN/FINOPS/DOC se declara autónomo solo por mostrar el icono.
