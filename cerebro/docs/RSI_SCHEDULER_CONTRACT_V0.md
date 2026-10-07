# CEREBRO OS · RSI · Scheduler Contract V0

Bloque C implementa un scheduler lógico incremental y coste adicional 0 €.

- DAILY: procesa solo desde checkpoint/cursor.
- EVENT: fallo repetido, regresión, corrección humana, cambio externo, experimento, incidente, coste/latencia, degradación o nueva capacidad.
- WEEKLY: muestra mayor, deuda acumulada, experimentos pendientes y ROI.
- MONTHLY: arquitectura, evaluadores, tooling/router, Factory y autonomía.

Seguridad operativa:
- lock determinista por empresa/motor/cadencia/checkpoint;
- max 3 intentos;
- backoff 30s/120s/600s;
- no escrituras PROD desde scheduler;
- budget_eur=0 por defecto;
- los triggers crean candidatos, nunca promoción directa;
- agotamiento de retries no equivale por sí solo a HUMAN_REQUIRED: se clasifica según política/impacto.
