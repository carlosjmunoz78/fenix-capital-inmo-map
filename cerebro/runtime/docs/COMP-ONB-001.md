# COMP-ONB-001 · Company Onboarding Orchestrator V0.2

Estado: `CONFIRMED_OPERATIONAL` en PREPROD como **orquestador determinista de estado y gates**. No implica que los motores downstream estén construidos ni ejecutables.

## Alcance

- Parte de una empresa existente en `COMP-REG-001` con estado `REGISTERED`.
- Autoriza cada operación mediante `TENANT-001`; `authenticated_company_id` debe coincidir con `target_company_id`.
- Transiciona la empresa a `ONBOARDING` y crea un run idempotente por empresa.
- Expone el pipeline canónico de onboarding y sólo habilita un paso a la vez.
- Cada paso requiere evidencia explícita para marcarse `COMPLETED`.
- Puede detenerse únicamente con códigos `HUMAN_REQUIRED` canónicos o blockers de sistema declarados.
- La reanudación requiere una referencia de resolución; no existe bypass silencioso.
- Al completar todos los pasos queda en `PREPROD_PIPELINE_COMPLETE`; **no activa PROD ni cambia la empresa a ACTIVE**.

## Pipeline V0

`SCAN → KW → WAUD → SEOBOOT → COMPET → MKT-002 → SOCAUD → LOCALP → MKTBOOT → BMD → PROC → KBOOT → CRMBOOT → APPBOOT → AUTBOOT → TRNBOOT → ENGACT → COMP-HLT → COMP-BKP → COMP-DEP`

El orden materializa el flujo objetivo de nueva empresa sin duplicar runtime. `COMP-ONB-001` no llama automáticamente a esos motores: coordina readiness, evidencia, bloqueo y progreso.

## Persistencia y coste

V0 usa JSON atómico local del runtime compartido. No introduce tablas Supabase, servidor dedicado, polling, Make ni IA de pago. Coste adicional objetivo: `0 €`.

## Backup / rollback / rebuild

- Backup: snapshot atómico del store con SHA-256.
- Restore: sólo acepta schema/environment compatibles y checksum opcional.
- Rollback de versión: FACT-001 `version_engine.py` hacia scaffold 0.1.0 o versión anterior.
- Rebuild: Git + Engine Registry + runtime compartido + store restaurable.

## Autonomía

`PREPROD_DETERMINISTIC_ORCHESTRATOR_ONLY`. `PROD = DENY` hasta Promotion Policy completa. El hecho de que exista un scaffold Factory no constituye evidencia de que un downstream esté operativo.
