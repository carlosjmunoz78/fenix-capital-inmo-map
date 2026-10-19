# CEREBRO ACCESSBOOT v0.3.0 · CANDIDATE PREPROD

Estado: **CANDIDATE_PREPROD / POR EJECUTAR FÍSICAMENTE**  
PROD: **DENEGADO**  
Coste adicional: **0 EUR**

## Motivo

El batch físico `CEREBRO DEVICE PHYSICAL ACCEPTANCE V0.2` cerró rápidamente y el Evidence Host siguió mostrando `physical_acceptance.present=false`. No se considera una aceptación válida.

La inspección estática del binario mostró que su runner embebido no era fiable para garantizar receipt ante fallo temprano. No se repetirá a ciegas.

## Corrección

`CEREBRO_ACCESSBOOT.exe` v0.3.0 sustituye las pruebas sueltas por un único finalizador PREPROD:

- preserva Browser Universal; solo comprueba health en `8765`;
- preserva Device Agent en `8766`;
- preserva/levanta Evidence Host v0.2.4 en `8767`;
- ejecuta aceptación sintética sobre superficie propia: screenshot, move/click, type/hotkey con readback, files sandbox, Notepad/procesos, clipboard restaurable, shell determinista y Vault sintético;
- valida configuración de arranque v0.2.4 sin afirmar reboot real;
- valida identidad v2 y scope local compatible con Command Envelope V2 multiempresa;
- escribe receipt saneado aunque exista fallo parcial;
- no imprime secretos ni usa datos de clientes.

Receipt compatible para Evidence Host:

`%LOCALAPPDATA%\\CEREBRO\\UniversalDevice\\device-physical-acceptance-v0.2.json`

Receipt canónico adicional:

`%LOCALAPPDATA%\\CEREBRO\\UniversalDevice\\accessboot-finalization-v0.3.0.json`

## Build evidence

- Windows amd64 cross-build: PASS.
- PE32+ x86-64.
- EXE SHA-256: `b291b10d48f34ede90376ee04ca5a34a36b4a765e733c43a9d9d9d04f8bf1add`.
- size: `29458944` bytes.
- Device v0.2.4 embebido SHA-256: `1683bf3027dac2f4ff70cce1bf54ff7f3f0fede5c022efec0a009159e06d4f43`.
- narrow literal secret scan: 0 suspicious hits.
- PowerShell runner static delimiter balance: braces 105/105, parentheses 188/188, here-string 1/1.

## Opera oficina

La selección de `Opera oficina` queda registrada aparte en:

- `cerebro/registry/opera-office-binding.v1.json`
- `cerebro/docs/CEREBRO_OPERA_OFICINA_BINDING_DO_NOT_REPEAT_2026-10-19.md`

No usar el otro Opera para evidencia física del PC oficina.

## Límites de promoción

Una aceptación local GREEN no equivale todavía a autorización PROD. Quedan como gates posteriores de promoción: remote command roundtrip, persistencia tras reboot real, rollback físico y portable Vault recovery cross-device. Estos gates pueden cerrarse después sin volver a bloquear el trabajo PREPROD ordinario.
