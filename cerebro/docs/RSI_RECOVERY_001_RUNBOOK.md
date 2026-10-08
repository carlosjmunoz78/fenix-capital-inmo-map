# RSI-RECOVERY-001 · Runbook

Estado: DRAFT NON-PROD
Scope: `cerebro-rsi-recovery-001-20261008` / PR #502
Coste adicional: 0 EUR

## Autoridades que no se sustituyen

- Runtime base: `cerebro/runtime/runtime.mjs`.
- Observability/Audit/FinOps persistente: `cerebro/runtime/observability-audit-finops.mjs`.
- OLD vs NEW de skills: `cerebro/skills/skill-old-vs-new-contract.mjs`.
- Juez y tribunal de skills: `skill-independent-judge.mjs` + `skill-tribunal.mjs`.
- Promotion de skills: `skill-promotion-readiness.mjs` + `skill-autonomous-promotion-v1.mjs`.
- FACT-001 actual: autoridad sobre Factory; el supervisor RSI solo propone candidatos.

## Secuencia segura

1. Verificar `main` vivo, PR #502, HEAD de recovery y CI.
2. Si main cambió, comparar diff desde el base original antes de tocar la branch.
3. Ejecutar `CEREBRO RSI Recovery 001 Gate` completo.
4. Exigir GREEN para contrato, scheduler, learning, experiment, evaluation, promotion envelope, meta, multi-company, Factory, knowledge, continuity, observability adapter, E2E y bridge regression.
5. Mantener `skill-rsi-shadow-bridge` en `SHADOW_IN_MEMORY_ONLY` hasta que exista contrato de persistencia dedicado.
6. No permitir que `promotion-pipeline.mjs` active PROD. CANARY evidence termina en `CURRENT_PROMOTION_AUTHORITY_REQUIRED`.
7. No registrar autonomía en Engine Registry hasta superar reconciliación CURRENT main + PREPROD.

## Kill conditions

Detener el bloque y no promocionar si aparece cualquiera de estos estados: fallo de CI, drift no reconciliado, pérdida de rollback/rebuild, intento de PROD write, permiso/budget elevation, secret/raw company data cross-tenant, Trading access, paid fallback, ausencia de evidencia/provenance, juez no independiente o tribunal no verde.

`HUMAN_REQUIRED` solo puede usar: `LEGAL_REQUIRED`, `SIGNATURE_REQUIRED`, `LOW_CONFIDENCE`, `HIGH_RISK`, `POLICY_CONFLICT`, `SECURITY_INCIDENT`, `MONEY_LIMIT`, `CUSTOMER_HUMAN_REQUEST`.

## Rollback

Antes de merge: cerrar/revertir PR #502 o abandonar la recovery branch. `main` no ha sido modificado por RSI-RECOVERY-001.

Después de un eventual merge: identificar el merge SHA, crear PR de revert desde main vivo, ejecutar los mismos gates y verificar que las autoridades CURRENT vuelven a su comportamiento previo. No borrar historia ni PR #416.

## Rebuild

1. Partir del main autorizado y verificado.
2. Recuperar únicamente los archivos aprobados de PR #502; nunca mergear #416 como shortcut.
3. Ejecutar el gate RSI completo.
4. Verificar Skill Supply Chain / gates CURRENT afectados.
5. Confirmar `prod_authorized=false`, `prod_write_authorized=false` y coste adicional 0 EUR en los contratos recuperados.
6. Regenerar continuity state con HEAD/PR/CI vivos y `next_block` real.

## Next block canónico

`RSI-RECOVERY-002 · PREPROD INTEGRATION & CURRENT-MAIN RECONCILIATION`.
