# CEREBRO DEVICE UNIVERSAL v0.2.4 · CANDIDATE PREPROD

Estado: **PARCIAL / CANDIDATE_PREPROD**  
PROD: **DENEGADO**  
Coste adicional: **0 EUR**

## Objetivo

Conservar el Device Agent ya estabilizado en `127.0.0.1:8766`, conservar Browser Universal en `127.0.0.1:8765` y añadir un Evidence Host persistente, localhost-only y saneado en `127.0.0.1:8767`, eliminando la necesidad de pedir al humano que copie JSON o lance relays temporales.

## Cambios respecto a v0.2.3

- Corrige el nombre del receipt de AccessBoot a `receipt-v0.2.4.json`.
- Mantiene instalación side-by-side del Device Agent; no toca el árbol legacy.
- Mantiene arranque desacoplado/persistente del Device Agent.
- Añade subcomando interno `evidence-host` al mismo AccessBoot; no introduce otro runtime de negocio.
- Evidence Host expone solo `GET /health` y `GET /evidence` en localhost.
- `/evidence` usa whitelist y no sirve secretos, tokens, credenciales, cookies ni contenido de portapapeles.
- Registra arranque de Evidence Host con `HKCU Run` y VBS oculto.
- Browser Universal no se repite ni se modifica.

## Evidencia de build

- Go identity-contract tests: PASS.
- Windows amd64 cross-build: PASS.
- EXE SHA-256: `1683bf3027dac2f4ff70cce1bf54ff7f3f0fede5c022efec0a009159e06d4f43`.
- size: `23778816` bytes.
- physical Windows execution v0.2.4: **PENDING**.

## Estado físico heredado válido

La ejecución v0.2.3 ya demostró en el PC autorizado que Browser `8765` y Device `8766` pueden permanecer vivos simultáneamente después de cerrar el instalador. v0.2.4 no cambia ese contrato; añade evidencia persistente en `8767`.

## Aún pendiente

- ejecución física v0.2.4;
- health real de `8767`;
- lectura real de `/evidence` desde Opera;
- clasificación del receipt `device-physical-acceptance-v0.2.json`;
- pairing universal multiempresa y roundtrip remoto;
- restart persistence tras reinicio;
- rollback físico;
- portable vault cross-device recovery;
- cámara/micrófono/audio/periféricos.

No declarar `CONFIRMED_OPERATIONAL` hasta cerrar los gates físicos aplicables.
