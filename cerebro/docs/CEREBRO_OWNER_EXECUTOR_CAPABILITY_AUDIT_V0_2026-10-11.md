# CEREBRO · OWNER EXECUTOR CAPABILITY AUDIT V0 · 2026-10-11

## Resultado

- **HECHO:** se ha auditado si los owners de los planes SELF-001 disponen de un ejecutor de código real y verificable.
- **EXISTENTE:** SELF-001 ya produce planes PREPROD reversibles; FACT-001 genera scaffolds; AUTO-001 existe como motor definido; APP-001, WEB-001, HCI-001, SEO-001 y MKT-001 conservan sus capacidades actuales.
- **POR AUDITAR / NO EVIDENCIADO:** no existe evidencia actual en `main` de un runtime que, por sí solo, genere un patch de código, cree rama, escriba repositorio y abra PR para los owners.
- **DECISIÓN:** no se infiere ni se concede esa autoridad. SELF-001 permanece `plan_only`.

## Evidencia histórica conservada

### AUTO-001

La rama histórica `cerebro-auto001-automation-factory-v0-20260911` contiene `cerebro/platform/automation-factory-engine.mjs`. El commit `60050bec32134e20b62320ff7b6b549f1e307060` lo define explícitamente como planificador: `read_only=true`, `plan_only=true`, `executed=false`, con bloqueo de escritura PROD, envío externo y coste > 0. El commit posterior de PREPROD solo añade tests/workflow; no convierte AUTO-001 en ejecutor de código.

### ACTGW-001

La rama histórica `cerebro-action-gateway-v0-20260911` contiene `cerebro/gateway/action-gateway-v0.mjs`. Su salida segura es `mode=PLAN_ONLY`, `executed=false`, `prod_writes=false`. Por tanto tampoco es un code executor.

### FACT-001

El `cerebro/factory.mjs` actual genera la estructura estándar de motores en disco y valida el seed canónico. Eso demuestra capacidad de scaffold, no capacidad de diagnosticar y parchear arbitrariamente un owner existente.

### Capacidades externas

El conector GitHub del asistente interactivo puede crear ramas, archivos y PRs durante una sesión, pero no se considera evidencia de una capacidad autónoma de CEREBRO. Mezclar ambas cosas produciría una falsa autonomía.

## Regla del gate

Un owner solo puede etiquetarse como `VERIFIED_PREPROD_CODE_EXECUTOR` si existe evidencia actual de:

`CURRENT_MAIN_RUNTIME + CODE_PATCH_GENERATION + REPOSITORY_WRITE + BRANCH_CREATION + PULL_REQUEST_CREATION + NO_PROD_WRITE`.

Si falta una sola pieza, el resultado es `NO_VERIFIED_EXECUTOR` y SELF-001 conserva `execute=false`.

## Backup / rollback / rebuild

No se modifica lógica de negocio ni PROD. El audit corre después del QA continuo, lee `qa-healing-plans.v0.json` de la rama dedicada `cerebro/qa-state-v0` y persiste únicamente evidencia de control. El rollback consiste en revertir este PR; el rebuild consiste en relanzar el workflow de auditoría sobre los planes SELF-001 actuales.

## Próximo gate seguro

`AUTO001_PREPROD_PATCH_EXECUTOR_V0_DESIGN`.

La siguiente evolución debe reutilizar AUTO-001, no crear otro motor. Su primera versión podrá actuar únicamente sobre rama aislada/PREPROD, con snapshot, allowlist de archivos, diff máximo, tests, OLD vs NEW, tribunal, rollback y sin auto-merge. No tendrá autoridad PROD.

## Coste

Coste adicional: **0 €**.
