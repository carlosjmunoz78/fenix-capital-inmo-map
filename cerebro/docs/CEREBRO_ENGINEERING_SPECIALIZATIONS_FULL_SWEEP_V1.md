# CEREBRO OS · ENGINEERING SPECIALIZATIONS FULL SWEEP V1

Fecha: 2026-10-18  
Repo: `carlosjmunoz78/fenix-capital-inmo-map`  
Branch: `cerebro/universal-skill-activation-factory-v1-20261017`  
PR: `#784` · DRAFT · NO AUTO-MERGE  
Entorno: `PREPROD`

## OBJETIVO
Cerrar con evidencia las especializaciones de ingeniería del único perfil transversal de CEREBRO. No se crean agentes ni motores por profesión.

Especializaciones cubiertas:
- ARQUITECTO
- CODE
- SYSTEMS
- MATH
- DATA
- SECURITY
- QA
- INTEGRATOR
- TECH_SCOUT
- PERFORMANCE

## RESULTADO
`ALL_ENGINEERING_SPECIALISTS_FULL_SAFE_PREPROD`

Primera certificación GREEN del sweep:
- HEAD: `1240de63ac979749da4837447416b7a55a30ca64`
- workflow: `CEREBRO Engineering Specializations Full Sweep V1`
- run: `#2`
- run_id: `39111241508`
- artifact: `12130582388`
- digest: `sha256:a460bef2ce0bd3a502a920eef46ce38f67f5b48896f5711e28793a4daf7c9241`
- targeted sweep: GREEN
- full CEREBRO regression: GREEN

## ARQUITECTO
Se reutilizan `ARCH-001` + `FACT-001` y la disciplina Safe Engineering existente. El gate exige simultáneamente:
- contratos canónicos presentes;
- dependency map;
- runbook + handoff;
- comprensión/reutilización de lo existente;
- OLD vs NEW con evidencia;
- PREPROD;
- rollback + rebuild probados;
- exact-head gate;
- dimensiones multiempresa `company_id / engine_id / environment / version`;
- terminal truth;
- coste 0 €;
- autoridad PROD cerrada.

No se crea `ARCHITECT-ENGINE` ni equivalente.

## PERFORMANCE
Se reutilizan `OPT-001`, `QA-001`, `OBSERV-001`, `FINOPS-001` y el FAST_LANE/JOB runtime existente. La prueba ejecuta un batch real de cinco dominios con worker threads y exige:
- paralelismo acotado >= 5;
- 5/5 primarios `FULL_SAFE_PREPROD` con evidencia semántica exacta;
- p50/p95 de activación medidos;
- batch wall time medido;
- replay idempotente sin reejecutar trabajos terminados;
- cache de preparación, baseline y familias reutilizada en rerun;
- validación de binding NO omitida;
- no fail-fast global;
- 0 €;
- no PROD / no Trading.

No se usa un benchmark inventado ni un umbral arbitrario de milisegundos. PERFORMANCE certifica instrumentación, concurrencia, idempotencia y reutilización medibles sin degradar truth gates.

## RESTO DE ESPECIALIZACIONES
- CODE: Safe Engineering + worktree/sandbox + prechecks + tests + static analysis + regression + rollback + QA/EVA.
- SYSTEMS: durable worker, concurrencia acotada, retry/checkpoint/recovery, fail-closed y rollback/rebuild.
- MATH: solver determinista, sin IA obligatoria, resultado reproducible y consumidores canónicos.
- DATA: DB-SAFE-NATIVE, lectura segura, tenant/RLS y mutation gates con backup/rollback.
- SECURITY: IAM fail-closed, mínimo privilegio, no secretos, no expansión de autoridad.
- QA: full regression, terminal truth, Tribunal, audit chain y controlled rollback.
- INTEGRATOR: candidato genérico, Repository E2E, GitHub Live E2E, FAST_LANE, registro nativo e idempotencia.
- TECH_SCOUT: superficies reales de repositorio/GitHub/supply-chain, provenance/licencia, read-only, sin ejecutar código externo ni instalar dependencias.

## DEPENDENCIAS
Reutilizadas, no duplicadas:
- FACT-001
- ARCH-001
- QA-001 / EVA-001 / JDG-001 / REG-001
- LRN-001
- OBSERV-001
- FINOPS-001
- JOB-001
- OPT-001 / SIM-001
- DATA-001 / DBOFF-001 / STOROFF-001 / API-001 / CRM-001
- SEC-001 / SEC-002 / IAM-001 / DPO-001 / CMP-002 / RED-001
- INT-001 / EVT-001
- RSH-001 / INN-001

## BACKUP / ROLLBACK / REBUILD
No se modifica ningún runtime PROD. Los gates heredan B19/B20:
- backup ready;
- rollback GREEN;
- rebuild GREEN;
- idempotencia GREEN;
- observabilidad/auditoría/FinOps GREEN.

Rollback de este bloque: revertir los archivos del sweep y volver al estado B20 sin afectar el core transaccional ni producción.

## AUTONOMÍA
Este bloque no concede autoridad adicional. Sigue vigente:
- PREPROD only;
- no PROD write/mutation;
- no auto-merge;
- no customer data;
- no Trading;
- no ejecución arbitraria de código externo;
- no instalación externa no gobernada;
- coste adicional 0 €.

## TRUTH
`FULL_SAFE_PREPROD` significa que el perfil de ingeniería está certificado en PREPROD para su alcance. No significa que cualquier skill futura sea FULL automáticamente. Cada capability conserva sus gates candidate-local, y browser/device/media siguen exigiendo evidencia física cuando corresponda.

## NEXT
Con las especializaciones de ingeniería cerradas, el siguiente bloque debe volver al roadmap canónico posterior a P0 sin reabrir B15–B20 ni fabricar más profesiones.
