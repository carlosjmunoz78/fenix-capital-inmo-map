# CEREBRO ACCESSBOOT v0.5.0 · PORTABLE SINGLE-EXE CANDIDATE PREPROD

Estado: **CANDIDATE_PREPROD_BASE_BUILT · PHYSICAL_CAPTURE_PENDING · PROD DENEGADO**  
Coste adicional: **0 EUR**.

## Objetivo

Convertir el AccessBoot físicamente GREEN del PC origen en un único EXE portable para otros PCs Windows autorizados, preservando identidad de dispositivo, tenant dinámico por comando, el stack 8765/8766/8767/8768 y el principio human-by-exception sin transportar secretos en claro.

## Diseño implementado

La base v0.5.0 se ha construido determinísticamente para Windows amd64. Incluye como payloads verificados:

- Browser AccessBoot Universal v0.3.6 · SHA-256 `0a7b57d52855db14bdefcb97438464d77dfc4b98abc2d14761ebb445068105ac`.
- Universal Device Controller v0.4.0 · SHA-256 `78733cce3f2473205f8cf7bb50ee9a73901dd58dcaf2df10ac2748eb6a0aa8ef`.

La candidata base no inventa ni sustituye el binario ya físicamente GREEN de Device 8766/Evidence 8767. En su lugar implementa un paso one-shot `--capture-current-stack` en un PC origen ya GREEN:

1. verifica 8765/8766/8767/8768;
2. descubre el proceso propietario de cada listener;
3. sólo acepta código bajo `%LOCALAPPDATA%\CEREBRO`;
4. excluye estado, vault, tokens, credenciales, cookies, logs y bases runtime;
5. genera un runtime bundle ZIP determinista/saneado;
6. lo añade al propio PE como overlay autenticado por SHA-256;
7. produce un **único `CEREBRO_ACCESSBOOT_PORTABLE_V0_5_0.exe`**.

El EXE portable resultante se instala side-by-side en otro PC, restaura los listeners, configura `HKCU\Software\Microsoft\Windows\CurrentVersion\Run` apuntando a `--resume`, y verifica readback de 8765/8766/8767/8768. `--resume` no repite Browser/Device acceptance ya cerrada: sólo verifica o reinicia listeners ausentes.

## Fail-closed de PC fresco

Un EXE base v0.5.0 sin overlay físico capturado puede reparar Browser 8765 y Controller 8768, pero **no puede declarar Device 8766/Evidence 8767 GREEN en un PC fresco**. Se bloquea con `portable_runtime_bundle_required_*` hasta que exista una captura del stack real.

Esto evita fabricar una falsa equivalencia con Device v0.2.4, cuyo hash está registrado pero cuyo binario fuente no estaba incluido en el handoff disponible.

## Vault portable cross-device

Implementado:

- fuente local: Windows DPAPI Current User;
- export: secretos descifrados sólo en memoria y bundle completo cifrado con AES-256-GCM;
- recovery key aleatoria de 32 bytes en archivo separado;
- la clave y los secretos nunca se imprimen;
- import: backup del vault destino + descifrado + re-cifrado de cada secreto con DPAPI del nuevo usuario/PC;
- merge conservador por `credential_id`;
- `vault self-test` sólo usa material sintético y no escribe secretos persistentes.

La recuperación cross-device continúa **PENDIENTE FÍSICA** hasta probar export origen → import destino → readback sintético → cleanup en dos PCs autorizados.

## Evidencia build

Artifact base:

- `CEREBRO_ACCESSBOOT.exe`
- SHA-256: `724c321f382e4304b4c3674fde673524ff4c0f7c864ae46f8c71375f41fa9835`
- size: `38276096` bytes
- formato: PE32+ Windows x86-64

Checks:

- Go unit tests: PASS
- Go vet Linux: PASS
- Go vet Windows target: PASS
- Windows amd64 cross-build: PASS
- Windows test binary compile: PASS
- deterministic rebuild byte-for-byte: PASS
- source secret scan: PASS
- unit test AES-256-GCM portable vault: PASS
- unit test PE overlay append/readback/hash: PASS
- unit test runtime-bundle secret-file sanitization: PASS

## No HECHO todavía

No declarar `CONFIRMED_OPERATIONAL`, multi-PC físico ni PROD hasta cerrar:

1. ejecutar v0.5.0 base en el PC origen ya GREEN;
2. crear el single-EXE portable mediante captura física;
3. instalarlo en un segundo Windows autorizado;
4. verificar 8765/8766/8767/8768;
5. reinicio real Windows + persistencia;
6. rollback físico;
7. Vault cross-device sintético;
8. EVT74 E2E;
9. fresh IAM Browser/Vault exact-scope;
10. Tribunal + Backup/Rebuild + promoción gobernada a PROD.

## Gobierno

- `company_id=GLOBAL` sólo en el registro del instalador; tenant real sigue siendo mission-scoped.
- `tenant_binding=DYNAMIC_MULTI_COMPANY`.
- `environment=PREPROD`.
- `prod_allowed=false`.
- `trading_access=false`.
- wildcard grants prohibidos.
- secretos crudos prohibidos en receipts/logs/runtime bundle.
- coste adicional 0 EUR.
