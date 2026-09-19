# CEREBRO OS · RSI · Continuous Improvement Contract V0

## Estado
Bloque B. Contrato ejecutable, fail-closed y sin escrituras PROD.

## Scope
Orquesta motores existentes; no crea un servidor por motor. Claves obligatorias: `company_id + engine_id + environment + version`.

## Entrada
Eventos normalizados con provenance/evidence. Una observación nunca activa producción directamente.

## Ledger
`raw_event -> normalized_event -> outcome_observed -> evidence_recorded -> pattern_candidate -> hypothesis -> experiment_or_replay -> evaluation -> judge_decision -> knowledge_candidate -> promotion_gate`.

## Checkpoint / cursor
Por empresa + motor. Clave idempotente determinista. Reprocesar el mismo checkpoint no debe duplicar una mejora.

## Learning record
Implementado en `runtime/continuous-improvement-contract.mjs`. Requiere evidence refs, risk, confidence, environment, version, source events y promotion state.

## OLD vs NEW
Toda promoción requiere paquete separado con baseline, candidate, tests antes/después, eval antes/después, coste, riesgos, rollback, rebuild y decisión del juez.

## Gates
Fail-closed si:
- juez no independiente;
- rollback no preparado;
- candidato puede mutar política/permisos;
- judge != PASS;
- falta provenance/evidence;
- baseline == candidate.

## Human required
Se conserva el catálogo canónico: LEGAL_REQUIRED, SIGNATURE_REQUIRED, LOW_CONFIDENCE, HIGH_RISK, POLICY_CONFLICT, SECURITY_INCIDENT, MONEY_LIMIT, CUSTOMER_HUMAN_REQUEST.

## No-go
- no autoelevar permisos/presupuesto;
- no editar el propio judge_result;
- no debilitar holdouts/tests;
- no escribir Training/LAB directo en PROD;
- no borrar evidencia negativa;
- no promover por una única observación.

## Rollback
Toda mejora promovible debe llevar `rollback_ref` y `rebuild`; si el post-monitoring viola umbrales, pasa a ROLLED_BACK.

## Aceptación Bloque B
1. contrato ejecutable;
2. idempotencia determinista;
3. multiempresa;
4. evidence/provenance;
5. OLD vs NEW;
6. independent judge gate;
7. rollback gate;
8. policy lock;
9. tests deterministas.
