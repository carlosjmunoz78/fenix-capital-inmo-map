# L9 · DeepSeek MAX concurrency · evidencia viva 2026-10-27

## Estado

- **Bottleneck confirmado:** el daemon PREPROD existente arrancaba con concurrencia global 2 y techo duro 8, mientras `DurableWorkerRunnerV1` disponía de concurrencia estática pero sin policy/pools/provider/DAG adaptativos.
- **GitHub Actions no era el cuello:** durante el diagnóstico había ejecuciones activas pero 0 workflows queued.
- **Regla preservada:** extender BOOST-001 / JOB-001 / `DurableJobRuntimeV1`; no crear segundo daemon ni segunda cola.
- **PROD:** no autorizado por este cambio.
- **Trading:** false.
- **Auto recharge:** false.
- **Hard ledger de referencia:** 100 USD para el benchmark DeepSeek y 100 EUR en policy runtime; reconciliación FinOps canónica sigue siendo gate de promoción.

## Benchmark DeepSeek vivo

GitHub Actions run: `40577380725`  
Workflow: `CEREBRO DeepSeek Max Concurrency V1`  
Head probado: `35cb796b8a7631d6adf9588b50d7d64ad15ae9f4`  
Artifact: `cerebro-deepseek-concurrency-v1` / ID `12767727998`  
Artifact digest: `sha256:5d6a1b2aa8e3d77ab01e3e3f752fa0ca5f04a40ceec97906265c447a35f42df6`

| Concurrencia | Éxitos | Fallos | 429 | Quality failures | p95 ms | Throughput req/s | Gate |
|---:|---:|---:|---:|---:|---:|---:|---|
| 1 | 1 | 0 | 0 | 0 | 768 | 1.300 | GREEN |
| 2 | 2 | 0 | 0 | 0 | 797 | 2.506 | GREEN |
| 4 | 4 | 0 | 0 | 0 | 938 | 4.255 | GREEN |
| **8** | **8** | **0** | **0** | **0** | **1147** | **6.969** | **GREEN / MAX ÚTIL** |
| 16 | 16 | 0 | 0 | 1 | 3471 | 4.608 | RED / QUALITY + THROUGHPUT REGRESSION |

Resultado del benchmark:

- `recommended_max_concurrency = 8`
- `stopped_reason = QUALITY`
- `projected_cost_usd = 1.27` como reserva conservadora del benchmark; no implica coste real igual a esa cifra.
- No se observó rate limit 429 hasta el punto de parada.

## Cambio candidato

1. `DynamicConcurrencyPolicyV1`
   - global/company/resource/provider/repo-write limits;
   - pools CPU / IO / MODEL / BROWSER_DEVICE / REPO_CI;
   - scale-up 1→2→4→N bajo presión sana;
   - scale-down inmediato ante 429/error/conflict/p95/CI/coste;
   - fail-closed para provider/ruta no allowlisted.

2. `DynamicDagPlannerV1`
   - dependencias explícitas;
   - READY/BLOCKED;
   - prioridad por camino crítico;
   - cross-company dependency = DENY;
   - enqueue idempotente sobre `DurableJobRuntimeV1` existente.

3. `cerebro-supervisor-daemon-v0.mjs`
   - sigue siendo el único daemon;
   - global default candidate = 64;
   - company default candidate = 16;
   - **DeepSeek provider default = 8**, derivado del benchmark vivo;
   - repo write default = 1;
   - multi-context + route map fail-closed;
   - heartbeat expone policy snapshot;
   - PREPROD-only, PROD false, Trading false.

## Gate pendiente

Este documento NO declara CEREBRO global PROD ni runtime físico 24/7 promovido. Antes de promoción de capability: CI/regresión GREEN sobre el head final, OLD-vs-NEW, crash/restart/checkpoint-resume, aislamiento multiempresa, ledger FinOps único reconciliado, rollback/rebuild y canary independiente.
