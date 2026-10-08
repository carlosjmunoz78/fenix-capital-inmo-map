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
5. Mantener las autoridades CURRENT de skill learning/promotion; cualquier persistencia recuperada queda limitada por sus contratos PREPROD y no eleva permisos.
6. No permitir que `promotion-pipeline.mjs` active PROD. CANARY evidence termina en `CURRENT_PROMOTION_AUTHORITY_REQUIRED`.
7. No registrar autonomía PROD en Engine Registry hasta superar reconciliación CURRENT main + PREPROD + gates de promoción aplicables.

## Aplicabilidad de gates de promoción

Los gates son fail-closed y se seleccionan por superficie realmente modificada; una PR CEREBRO-only no puede fabricar un GREEN de App que el propio base no tiene.

Para una integración a `main` que sea exclusivamente CEREBRO, aditiva y NON-PROD, se exige sobre el exact HEAD:

- Factory PREPROD-equivalent GREEN.
- RSI Recovery y Skill Supply Chain afectados GREEN.
- tribunal independiente GREEN.
- diff fail-closed con cero cambios en `src/**`, `tests/**`, `supabase/**`, `public/**`, configuración de build/test App y workflows App/PROD.
- build de repositorio GREEN y smoke PREPROD aplicable GREEN.
- PR mergeable y revisión del estado exacto antes de quitar DRAFT.

El workflow legado `PRE-PROD App Build` sigue siendo autoridad para cambios App cuando sea aplicable, pero actualmente está marcado en `main` como App PRE-PROD cancelada/manual. Un Browser QA legado rojo sobre superficies App/test no modificadas por esta PR se registra como debt EXISTENTE; no se convierte en GREEN con `continue-on-error`, no se repara masivamente dentro de RSI y no autoriza despliegue App.

Si PR #502 toca en el futuro cualquier superficie App/test/configuración App, la excepción de alcance deja de aplicar automáticamente y vuelve a exigirse el gate App correspondiente antes de integrar esos cambios.

La evidencia y decisión detalladas están en `cerebro/docs/RSI_RECOVERY_010_PROMOTION_READINESS.md`.

## Kill conditions

Detener el bloque y no promocionar si aparece cualquiera de estos estados: fallo de un gate aplicable, drift no reconciliado, pérdida de rollback/rebuild, intento de PROD write, permiso/budget elevation, secret/raw company data cross-tenant, Trading access, paid fallback, ausencia de evidencia/provenance, juez no independiente o tribunal no verde.

`HUMAN_REQUIRED` solo puede usar: `LEGAL_REQUIRED`, `SIGNATURE_REQUIRED`, `LOW_CONFIDENCE`, `HIGH_RISK`, `POLICY_CONFLICT`, `SECURITY_INCIDENT`, `MONEY_LIMIT`, `CUSTOMER_HUMAN_REQUEST`.

## Rollback

Antes de merge: cerrar/revertir PR #502 o abandonar la recovery branch. `main` no ha sido modificado por RSI-RECOVERY-001.

Después de un eventual merge: identificar el merge SHA, crear PR de revert desde main vivo, ejecutar los mismos gates aplicables y verificar que las autoridades CURRENT vuelven a su comportamiento previo. No borrar historia ni PR #416.

## Rebuild

1. Partir del main autorizado y verificado.
2. Recuperar únicamente los archivos aprobados de PR #502; nunca mergear #416 como shortcut.
3. Ejecutar el gate RSI completo.
4. Verificar Skill Supply Chain / gates CURRENT afectados.
5. Confirmar `prod_authorized=false`, `prod_write_authorized=false` y coste adicional 0 EUR en los contratos recuperados.
6. Regenerar continuity state con HEAD/PR/CI vivos y `next_block` real.

## Next block canónico

`RSI-RECOVERY-010 · PROMOTION READINESS` hasta dejar exact HEAD reconciliado; después, integración gradual a `main` solo si todos los gates aplicables están GREEN. PROD permanece HOLD.