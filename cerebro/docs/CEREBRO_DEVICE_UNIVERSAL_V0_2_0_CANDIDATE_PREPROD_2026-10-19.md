# CEREBRO DEVICE UNIVERSAL V0.2.0 · CANDIDATE PREPROD

Estado: **PARCIAL / CANDIDATE_PREPROD**  
PROD: **DENEGADO**  
Coste adicional: **0 EUR**

## Qué corrige frente a v0.1.1
- No reutiliza ciegamente el primer `device_id` encontrado.
- Introduce `canonical_device_id + device_aliases[]` sin borrar ni reescribir perfiles Browser existentes.
- Prioriza evidencia Device V2 previa; después Browser Universal físico; después identidad universal previa; por último fingerprint local derivado de MachineGuid con SHA-256.
- Crea backup de identidad antes de migrar y conserva rollback.
- Genera receipts persistentes por STAGE: identity, agent, browser handoff, vault, capability matrix y acceptance.
- Si el Device Agent ya está sano en `127.0.0.1:8765`, lo preserva y evita reescribir el payload en uso.
- Detecta/preserva Browser Universal Bridge `0.5.4`; no repite Browser Universal.
- Vault local DPAPI sigue preservado.
- Añade backup/recuperación portátil cifrada del vault con AES-256-GCM + PBKDF2-HMAC-SHA256, con passphrase solo por STDIN.
- Añade `vault use` local auditado sin exponer secretos en receipts/logs.

## Identidad esperada en el PC actual
La regla de migración está diseñada para conservar como canónica la identidad Browser Universal física más reciente y registrar como alias la identidad histórica restante, sin reescribir perfiles. La evidencia del handoff indica los IDs históricos:
- `desktop-4c008d88919f`
- `desktop-74ca87506edbd7a5`

La selección real solo se confirma al ejecutar físicamente en Windows y leer el receipt.

## Evidencia de build
- Go unit tests de contrato de identidad: PASS
- Cross-build Windows amd64: PASS
- SHA-256 EXE: `d9e83c3c46867c6f1259bdbbfc7027b1cc0d49f667ddaec95b8737887f96e60c`
- size: `20511744` bytes
- secret literal scan: 0 suspicious values
- Browser Universal: no repetido
- PROD: false

## OLD vs NEW
- v0.1.1: selección por primer ID encontrado; riesgo de consolidar ID equivocado.
- v0.2.0: canonical + aliases, backup específico, no profile rewrite, fingerprint hashed, stage receipts.
- v0.1.1: podía refrescar payload mientras el agente estaba vivo.
- v0.2.0: si el agente ya está sano lo preserva íntegramente.
- v0.1.1: vault DPAPI local.
- v0.2.0: DPAPI local + recovery portátil cifrado implementado en código; prueba física pendiente.

## Aún NO GREEN físico
No declarar todavía `CONFIRMED_OPERATIONAL` para:
- roundtrip real screen/mouse/keyboard/files/apps/processes/clipboard/shell;
- Browser handoff dispatch/readback;
- vault portable recovery real;
- restart persistence;
- rollback físico;
- camera/microphone/audio/peripherals.

## Next block
Una sola ejecución física del candidato en el PC autorizado → leer receipts automáticamente → OLD vs NEW físico → rollback → si GREEN, continuar cierre Device Universal. PR #784 permanece DRAFT. No PROD. No auto-merge.