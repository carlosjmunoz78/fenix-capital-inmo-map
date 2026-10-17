# CEREBRO GLOBAL OPERATIONAL CONVERGENCE V4 · RUNBOOK

Fecha: 2026-10-17  
Owner lógico: `FACT-001`  
Entorno: `PREPROD`  
Coste adicional: `0 €`

## Objetivo

Mantener un único resumen operativo actual de CEREBRO sin reescribir la historia. V4 reconcilia el estado de `main` después de los cierres estrictos de runtime, operaciones hipotecarias y skills, y separa tres conceptos que no deben confundirse:

1. adopción semántica/runtime probada;
2. evidencia física de adaptadores, dispositivos o fuentes externas;
3. autoridad de PROD o de efectos externos.

## HECHO

- Registry canónico: `179` motores lógicos.
- Catálogo de rollout: `184/184` capacidades normalizadas, sin deuda de normalización.
- COMPET, CAP, LEAD, SALE, COM/NOTIF/C360, Customer Journey y Mortgage Operations tienen evidencia `FULL_E2E_REAL_PREPROD` en sus registries actuales.
- Las `5/5` skills admitidas están `FULL_SAFE_PREPROD`.
- `supabase-postgres-best-practices` y `agent-browser` tienen `10` bindings pertinentes gobernados en total.
- El write path servidor→WordPress de Universal QA/Core Guard tiene E2E sintético PREPROD con readback, replay idempotente, compensación y gate cerrado al finalizar.
- COMPET tiene tres targets reales de Córdoba configurados, baseline físico GET-only GREEN y scheduler diario de coste 0 €.
- CAP tiene fuente oficial IECA Córdoba GET-only configurada, discovery físico PREPROD GREEN y scheduler diario de coste 0 €.

## PARCIAL

- Android 48/183: APK firmada y STAGING verificados; falta dispositivo físico autorizado.
- Watch & Learn: scheduler diario configurado; la evidencia canónica todavía declara `soak_complete=false` y `scheduled_soak_runs_verified=0`.
- COMPET: targets y baseline real ya están cerrados; falta exclusivamente el soak de tres ejecuciones programadas genuinas GREEN.
- CAP: fuente oficial y primera evidencia física ya están cerradas; falta exclusivamente el soak de ejecuciones programadas genuinas exigido por su contrato.
- Los restantes dominios con efectos físicos se conservan `POR_AUDITAR_PHYSICAL` hasta evidencia fresca; no se promocionan por inferencia.

## HUMAN_REQUIRED

### PR #731

`POLICY_CONFLICT`: vinculación de una credencial GitHub de escritura al runtime `PROD_GOVERNED_WRITE`. V4 no concede esa autoridad y no requiere ni permite compartir credenciales en chat.

### PR #732

`POLICY_CONFLICT`: contrato exacto del journal B3 directo y grant mínimo PREPROD. Este gate es distinto del write path genérico Universal QA/Core Guard ya probado. No se amplían permisos por inferencia.

## Regla de lectura

Usar `cerebro/registry/current-operational-convergence.v1.json` como puntero al resumen actual. Los ficheros V2 y V3 siguen siendo evidencia histórica y no se borran ni se reescriben para aparentar un estado más verde.

## Validación

El workflow `CEREBRO Global Operational Convergence V4` debe comprobar como mínimo:

- 179 motores canónicos;
- 184 capacidades normalizadas y `all_184_physically_active=false`;
- registries estrictos actuales en `FULL_E2E_REAL_PREPROD`;
- skills `5/5 FULL_SAFE_PREPROD` y 10 bindings de la pareja antes HIGH_RISK;
- B3 genérico GREEN sin cerrar falsamente PR #732;
- Android físico todavía false;
- Watch & Learn soak todavía no cerrado mientras el registry lo declare así;
- COMPET baseline real de tres targets preservado y scheduler configurado, sin fingir el soak de tres cron;
- CAP fuente oficial IECA y discovery físico preservados, sin fingir el soak programado;
- PROD, writes, provider side effects, customer data, gasto, Trading y ejecución de código externo denegados.

## Backup

El backup lógico es la preservación intacta de V2/V3 y de todos los registries de evidencia referenciados. V4 es aditivo y no sustituye runtime, App, CRM, Supabase, WordPress, SEO, Training ni Trading.

## Rollback

Revertir únicamente:

- `cerebro/registry/cerebro-global-operational-convergence-v4.json`
- `cerebro/registry/current-operational-convergence.v1.json`
- `cerebro/tests/global-operational-convergence-v4.test.mjs`
- `.github/workflows/cerebro-global-operational-convergence-v4.yml`
- este runbook.

No existe rollback de datos de negocio porque esta reconciliación no muta recursos externos ni datos de clientes.

## Rebuild

1. Leer registry canónico actual.
2. Leer V3 solo como baseline histórico.
3. Leer registries estrictos actuales y evidencia de skills.
4. Leer gates físicos Android/Watch & Learn/B3 y los registries de fuentes reales COMPET/CAP.
5. Verificar en GitHub los PR HUMAN_REQUIRED activos.
6. Generar un nuevo estado únicamente con evidencia observada; nunca convertir ausencia de evidencia en GREEN.
7. Ejecutar OLD-vs-NEW/regresión y gates de gobernanza antes de promover el puntero actual.

## Changelog

`2026-10-17`: V4 reconcilia el mapa global después de cierres de COMPET/CAP/LEAD, Lote 3, Mortgage Operations y skill bindings. Se corrige además la clasificación de COMPET/CAP: sus fuentes reales y baselines físicos ya existen; lo pendiente es el soak programado, no la configuración de fuentes. La deuda lógica cerrada no elimina los gates físicos ni los conflictos de política reales.

## Estado de autonomía

`PREPROD_GOVERNED / PROD_FALSE / TRADING_ISOLATED / ZERO_ADDITIONAL_COST`.
