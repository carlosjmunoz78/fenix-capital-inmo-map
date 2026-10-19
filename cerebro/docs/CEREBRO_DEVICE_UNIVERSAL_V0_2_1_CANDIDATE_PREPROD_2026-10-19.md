# CEREBRO DEVICE UNIVERSAL V0.2.1 · CANDIDATE PREPROD

Estado: **PARCIAL / CANDIDATE_PREPROD**  
PROD: **DENEGADO**  
Coste adicional: **0 EUR**

## Evidencia física nueva
El receipt v0.2.0 confirma la identidad física correcta:
- canonical: `desktop-4c008d88919f`
- alias: `desktop-74ca87506edbd7a5`
- PROD false.

Usando el Opera de oficina autorizado se observó:
- `http://127.0.0.1:8765/health` = `CEREBRO Browser Agent Host`, versión `0.3.0`, estado `OK`.
- `http://127.0.0.1:8766/health` = `ERR_CONNECTION_REFUSED` antes de v0.2.1.

## Causa aislada
Clasificación: `RUNTIME / PROCESS_LAUNCH`.

v0.2.0 usaba un health-check demasiado genérico en 8765: cualquier JSON con `OK` podía ser interpretado como Device Agent. En este PC, 8765 pertenece correctamente a Browser Universal, por lo que el receipt podía producir un falso `agent_health=HEALTHY` sin que el Device Agent estuviera levantado.

## Corrección v0.2.1
- Browser Universal conserva exclusivamente `127.0.0.1:8765` y se valida por service identity.
- Device Agent pasa a listener separado `127.0.0.1:8766`.
- Device Agent obtiene state dir dedicado.
- El Run key usa launcher que fija `CEREBRO_AGENT_PORT=8766`, evitando competir por 8765 tras reinicio.
- No se reescriben perfiles Browser.
- No se repite Browser Universal.
- canonical device + aliases se preservan.

## Build
- Go tests: PASS.
- Windows amd64 cross-build: PASS.
- Artifact: `CEREBRO_DEVICE_ACCESSBOOT_UNIVERSAL_V0_2_1.exe`.
- SHA256: `f8eea3805b49b7282ffc855cd23489e365a66641097c6d2ad5b79e8277fbb879`.
- Size: `20518912` bytes.

## No declarado GREEN todavía
- distinct-listener physical attestation después de ejecutar v0.2.1;
- command roundtrip screen/mouse/keyboard/files/apps/processes/clipboard/shell;
- restart persistence;
- Browser handoff command/readback;
- portable vault recovery;
- rollback físico;
- camera/microphone/audio/peripherals.

## Next block
`DEVICE_V0_2_1_PHYSICAL_DISTINCT_LISTENERS_E2E`.

Una sola ejecución física del candidato, verificar 8765 + 8766 automáticamente, y continuar. PR #784 permanece DRAFT. No PROD. No auto-merge.
