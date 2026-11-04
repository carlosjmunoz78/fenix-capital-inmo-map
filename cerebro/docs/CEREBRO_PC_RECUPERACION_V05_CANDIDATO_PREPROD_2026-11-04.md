# CEREBRO PC-001 · Recuperación selectiva V0.5 · 2026-11-04

**Estado:** CANDIDATO PREPROD COMPILADO — aceptación física PENDIENTE. **Coste adicional: 0 €.** NO modificación PROD.

## Causa verificada en PC

Recibo físico `CEREBRO_PC_REPARACION_V04.txt` (04-11-2026 11:30:59 CET):
- 8765 Browser: health OK; NO arrancar duplicado.
- 8767 Evidence Host: health OK; NO alterar AccessBoot.
- 8768 Universal Controller: offline, `UNKNOWN_FLAGS_FAIL_CLOSED`, UN argumento posicional no identificado; no arrancado.
- 8766 Device Agent: offline; VBS verificado por hash, 6 líneas, estructura completa pendiente; no ejecutado.
- Backup DPAPI de Run creado; ninguna modificación de registro, arranque, tareas o monitor V0.2.

## V0.5: única recuperación puntual de legado sin duplicación

Package: `CEREBRO_PC_RECUPERACION_V0_5_PREPROD.zip` (contiene fuente Go y binario Windows PE32+ GUI).
EXE: `CEREBRO_PC_RECUPERACION_V0_5.exe` · SHA256 `4f8478e7cdeb9377d659aa706638b252a297851e9ffc783039ab4ba17e399d89`.

**Nueva ruta 8768:** tras validar ubicación real bajo LocalAppData/CEREBRO, SHA256 exacto de `CEREBRO-Universal-Controller-V2.exe` (`78733cce...`) y entradas HKCU existentes, aceptar UN único subcomando posicional de servicio reconocido `run/serve/start/resume/background/daemon` o los flags de inicio existentes permitidos por la política. Si difiere: FAIL_CLOSED, sin ejecutar ni divulgar su valor. Solo ejecutar si no existe el proceso ni el listener.

**Nueva ruta 8766:** NO ejecutar el lanzador VBS. Auditarlo de forma estática y, solo cuando 8766 siga inactivo, comprobar la entrada heredada `CEREBRODeviceAgent` que referencia el `CEREBRO-Device-Agent.exe` previamente inventariado; exigir ubicación local, SHA256 exacto `0b8159b8...`, opciones de inicio permitidas, sin duplicado, y backup DPAPI de TODAS las entradas antes de iniciar. En caso contrario FAIL_CLOSED.

**Mantener:** 8765 y 8767; monitor V0.2 con Z azul y TXT; autorrestarts legacy intactos; 0 cambios en Supabase/App/CRM/DNS/Trading/GitHub main; 0 nuevos supervisores, 0 pagos.

## Evidencia build y próximos gates

- go test PASS; Go vet Linux/Windows PASS; GUI Windows amd64 PE32+ PASS; compilación repetible bit a bit PASS; Windows test binary compiles PASS.
- No ejecución del VBS, ni de valores desconocidos, ni remote commands, ni micrófono/cámara.
- FÍSICO PENDIENTE: usuario ejecuta el EXE una sola vez y aporta `CEREBRO_PC_RECUPERACION_V05.txt`. NO repetir V0.3 o V0.4.
- Aun con 4 listeners OK: falta Gateway autenticado y roundtrip E2E con scope, persistencia reboot, rollback físico, permisos cámara/micrófono, observabilidad y tribunal. NO declarar PC COMPLETADO antes de cerrar.

**Política:** preservar `PC-001` independiente de extensión universal `BRX-001`, móvil `MOB-001` y tablet `TAB-001`. CONSERVAR → ENTENDER → ENVOLVER → PROBAR → MEJORAR → MIGRAR.
