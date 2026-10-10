# HCI-001 + MOTION-001 · Runtime Code Acceptance · 2026-10-10

## Resultado

**PREPROD CODE TESTED / NOT LIVE CONNECTED**.

Los motores ya no están únicamente en scaffold: existe lógica conductual determinista y tests en el repositorio. Aun así, no se afirma que estén conectados a telemetría viva ni que hayan superado EVA-001/JDG-001 como motores completos.

## Evidencia

- PR: `#563`
- PR head: `7de12747fbda753512315b69573e8ed778773399`
- Merge SHA: `6ee3512fe1e2b088a117cc236737657bfcb1d7ec`
- Workflow: `CEREBRO RSI Promotion Readiness Shadow V0`
- Run: `38063606678`
- Resultado: `success`
- PROD Live Deploy: `skipped`

El gate verificó el conjunto de tests y contratos CEREBRO, aislamiento de superficies App y seguridad de promoción.

## HCI-001 implementado en código

- normalización de eventos minimizados;
- métricas de claridad/fricción/esfuerzo;
- candidatos de mejora deterministas;
- OLD vs NEW con muestra mínima;
- sin transcript/raw content;
- sin inferencia de rasgos sensibles;
- sin promoción directa;
- bridge a `METRIC_OBSERVATION` y `ENGINE_EVENT` para LRN-001.

## MOTION-001 implementado en código

- estados IDLE, LISTENING, PROCESSING, SPEAKING, HUMAN_REQUIRED, DEGRADED y ERROR;
- perfiles visuales acotados;
- audio-reactividad;
- `prefers-reduced-motion`;
- métricas de latencia, sincronía, frames, recursos y accesibilidad;
- OLD vs NEW;
- sin promoción directa.

## Estado de autonomía

No hay ejecución autónoma en PROD. No existe binding vivo todavía entre estos runtimes y la UI/telemetría real. El siguiente gate es un LAB conectado, seguido de OLD vs NEW físico, EVA-001 y JDG-001.

Coste adicional: `0 €`. Trading: aislado. PROD writes: desautorizados.
