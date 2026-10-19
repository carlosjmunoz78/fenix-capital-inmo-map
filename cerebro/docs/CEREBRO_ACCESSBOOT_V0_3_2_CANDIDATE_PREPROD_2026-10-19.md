# CEREBRO ACCESSBOOT v0.3.2 · CANDIDATE PREPROD

Estado: **PARCIAL / CANDIDATE_PREPROD**  
PROD: **DENEGADO**  
Coste adicional: **0 EUR**

## Evidencia física de partida

La ejecución física v0.3.1 ya dejó receipt visible por Evidence Host y aisló tres rojos concretos. Se conservan sin repetición los bloques verdes: SERVER_HEALTH, SCREENSHOT, MOVE, CLICK, TYPE_TEXT, FILES_SANDBOX, APP_PROCESS, CLIPBOARD y GUARDED_SHELL.

Fallos observados: GUI_ACCEPTANCE, VAULT_SYNTHETIC y STARTUP_CONFIG.

## Correcciones v0.3.2

- GUI: valida semánticamente `CTRL+A` mediante selección completa antes de sustituir por `X`, con estabilización de focus/DoEvents.
- Vault: elimina dependencia de un literal concreto de stdout en `vault use`; exige exit code 0 + readback real del portapapeles + delete + list posterior sin la credencial sintética.
- Startup: acepta el Run key compatible side-by-side `CEREBRODeviceAgentUniversalV022` o `...V024`, y exige `CEREBRODeviceEvidenceHostV024`; no reescribe legacy solo para satisfacer el test.
- Evidence: conserva UTF-8 sin BOM y el wrapper comprueba que `/evidence` expone `physical_acceptance.present=true` antes de finalizar con éxito.

## Build

- Windows amd64 build: PASS.
- `go test` bajo target Windows: PASS (`[no test files]`).
- EXE SHA-256: `7cc887b2f1ed570c034c5b07d9cc5501428565235fe9ecfb279650de5c45ebee`.
- EXE size: `29465088` bytes.
- Device v0.2.4 embebido permanece sin cambios.

## No cambia

Browser Universal 8765, Device 8766, Evidence 8767, identidad, aliases, tenant binding dinámico, PROD=false y coste 0 EUR.

## Regla anti-loop

No ejecutar v0.3.0, v0.3.1 ni Physical Acceptance V0.2 de nuevo. v0.3.2 modifica únicamente los tres fallos aislados. Si alguno persiste, leer receipt y corregir exclusivamente ese bloque.

## Gate posterior

Aun con aceptación local GREEN seguirán como gates separados: remote command roundtrip de Universal Pairing V2, reboot real, rollback físico, portable Vault cross-device recovery y periféricos no implementados. No declarar `CONFIRMED_OPERATIONAL` por CI o aceptación local solamente.
