# CEREBRO PC-001 · recuperación secuencial 8765 → 8768 → 8766

Fecha: 2026-11-04. Entorno PREPROD. Estado: **candidato empaquetado, controles estáticos 48/48 PASS, SIN prueba Windows todavía**.

## Diagnóstico físico precedente

En `CEREBRO_PC001_DIAGNOSTICO_REINICIO_V2.json` aportado por el propietario, con arranque Windows 2026-11-04T16:51:26Z y diagnóstico 2026-11-04T17:28:03Z:
- PC identity exacta, boot age 2198 s (supera la espera mínima de 180 s).
- `8765=false`, `8766=false`, `8767=true` (HTTP 200, version 0.2.4), `8768=false`.
- **Un único listener**: 8767, PID 3964 `CEREBRO_DEVICE_ACCESSBOOT_UNIVERSAL.exe`. Otros procesos CEREBRO visibles: este host y `CEREBRO_ControlUniversal.exe`; no están activos los tres hosts específicos.
- Entradas HKCU Run existentes y hash verificado: `CEREBROBrowserAgentHost` → `CEREBRO-Browser-Agent-Host.exe`, SHA-256 `91c044544d160d89c33221bfcb6fae7771b5d073b8a32c051d506262daa2a946`, sin argumentos; `CEREBROUniversalDeviceControllerV2` → `CEREBRO-Universal-Controller-V2.exe`, SHA-256 `78733cce3f2473205f8cf7bb50ee9a73901dd58dcaf2df10ac2748eb6a0aa8ef`, argumento exacto `host`; `CEREBRODeviceAgentUniversalV023` → `CEREBRO-PC-8766-Launcher-V07.exe`, SHA-256 `74d9c61249d6cd526c77b2950aaec793d14309c7989df769c4b6485797b51bbd`, argumento exacto `--startup`.
- No puertos relevantes excluidos. Tarea `CEREBRO-Supervisor-PREPROD` marcada Running y último resultado 267009, no equivale a aceptar que el supervisor sirve las tres rutas. Trabajador Gateway `HOLD_RETRY_BACKOFF`.
- Dos arranques antiguos ya fueron retirados con backup DPAPI en el paso anterior: un Run duplicado V07 y un CMD Startup inseguro. No atribuir causalidad de la caída de los otros puertos sin evidencia.

## Candidato de intervención

ZIP: `CEREBRO_PC001_RECUPERACION_SECUENCIAL_PREPROD_V1.zip`.
SHA-256: `28d853c99bfa52035ee417ee5fe0f42f588ea3fcda05647f984406774fd1171a`.
Biblioteca: `/CEREBRO_OS/WINDOWS_UNIVERSAL_V0_2026_11_04/CEREBRO_PC001_RECUPERACION_SECUENCIAL_PREPROD_V1.zip`.

Contiene fuente PowerShell `PC001-Recuperacion-Secuencial-V1.ps1`, lanzadores `RECUPERAR_PC001_3_SERVICIOS.cmd` y `COMPROBAR_PC001_SIN_CAMBIOS.cmd`, pruebas `test_static.py`, instrucciones y SHA256SUMS.

- Exige Windows, identidad física exacta PC-001, monitor PREPROD válido, protección de PROD/Trading, 180 s transcurridos tras arranque.
- Lee la salud de los cuatro puertos (loopback only). Exige 8767 saludable antes de intentar una acción.
- **Fase 1**: si 8765 está mal, comprueba Run, ruta local, SHA y tamaño conocido del Browser Host; inspecciona listener, puertos excluidos y proceso anterior. Si no hay riesgo de duplicidad, lo inicia sin argumentos y espera readback.
- **Fase 2**: si 8765/8767 están bien y 8768 está mal, comprueba con los mismos guardas el Controller; lo inicia únicamente con argumento literal `host`. Nunca lo ejecuta vacío, lo que activaría instalador heredado.
- **Fase 3**: con 8765, 8767 y 8768 sanos, si 8766 falla y no hay otro Agent ni marcador V07 one-shot, ejecuta únicamente el lanzador V07 hash-pinned `--startup`. Este valida y arranca el viejo binario internamente con `--agent` y puerto 8766. No ejecutar directamente el antiguo EXE.
- Máximo **un intento por componente**, sin loops de reintento permanentes. Registra por puerto `PRESERVED`, `RECOVERED`, `HOLD` o `NOT_RECOVERED` con causas saneadas.
- No elimina nada, no cambia Run/Startup, tareas, servicios, firewall, ejecutables, tokens, credenciales o vaults; no detiene procesos ni toca PROD. Solo inicia procesos explícitos ya verificados y escribe su JSON en carpeta extraída. La reversión de la limpieza anterior no se altera.
- El JSON de salida `CEREBRO_PC001_RECUPERACION_RESULTADO.json` permite comprobar 4/4 y distinguir reinicio de Gateway; aun con 4/4, no declarar Gateway conectado sin heartbeat nuevo.

## Acceptance gates

- 48/48 controles estáticos ejecutados: PASS.
- ZIP CRC y manifiesto SHA-256 de fuentes: PASS.
- Parseo PowerShell y ejecución física en el Windows objetivo: PENDIENTE.
- Arranque/health 8765, 8768, 8766 y Gateway heartbeat actualizado: PENDIENTE.
- Persistencia sin intervención tras reinicio Windows: PENDIENTE.
- Rollback físico y captura AccessBoot portable para segundo PC: PENDIENTE.

Siguiente paso: propietario descomprime y ejecuta **solo** `RECUPERAR_PC001_3_SERVICIOS.cmd` una vez, sube el JSON. Sin reiniciar. Si 4/4 PASS, se implementa arranque ordenado y monitorizado con mínimo coste y se realiza reboot y rollback. No escalar a segundo PC con herramienta pinneada a PC-001.
