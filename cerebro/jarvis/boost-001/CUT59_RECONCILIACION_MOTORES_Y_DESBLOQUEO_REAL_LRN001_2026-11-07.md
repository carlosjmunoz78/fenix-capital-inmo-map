# CEREBRO OS · JARVIS V2 · CUT59 — Cierre técnico de discrepancia entre dos Supabase

Fecha de la inspección: **2026-11-07**.
Compañía: `fenix`. JARVIS `CUT59`, empresa y todos los motores identificados por `company_id`, `engine_id`, `environment`, `version`.
Estado de ejecución: **QA completada y auditada, LRN-001 físicamente BLOQUEADO. Ninguna modificación en App, CRM, DB, DNS, Trading, CUT30 ni main.**
Destino final exigido por propietario: **JARVIS V2 operativo en PRODUCCIÓN** tras aceptación E2E, identidad, seguridad y rollback; no dar por finalizado en LAB.

## 1. Evidencias de lectura REAL: corte 7 de noviembre

### Supabase histórico — `hnqlnvakzaywtafeiybt` / `fenix-capital-inmo-map`

Se hicieron consultas `SELECT` y lecturas RPC de estado exclusivamente.

- `cerebro_company_registry_preprod`: 1 fila de `fenix`, marca `REGISTERED_PREPROD`, del 2026-10-13, `profile_sha256=NULL`.
- `cerebro_company_engine_state_preprod`: **17 filas PREPROD**, 11 GREEN, 2 READY, 4 BLOCKED, sin actualizar desde 2026-10-13. Los estados registrados no constituyen prueba física actual.
- 8/11 GREEN tienen `evidence_sha256`; 3/11 GREEN **carecen** de hash (`TENANT-001`, `COMP-REG-001`, `COMP-ONB-001`). Las seis pendientes también carecen de hash (0/6).
- Los recibos duraderos de `cerebro_bootstrap_tier_status_preprod` acreditan **KBOOT-001 / SEOBOOT-001 / SOCBOOT-001** con sus hashes de origen y salida, 13 de octubre. Devuelve `next_gate=MARKETING_CRM_BOOTSTRAP_DURABLE_EXECUTION_REQUIRED`.
- El estado anterior de APP PREPROD **no autoriza restaurarla**: App PREPROD fue cancelada. Cualquier futura simulación tendrá que ser independiente, nunca una rama invasiva de App/CRM reales.
- No existen las dos RPC `cerebro_lrn001_*_preprod` en este proyecto.

### Supabase destino transaccional — `cluhljgonannaafpmblx` / `fenix-capital-prod`

Sin `INSERT`, `UPDATE`, `DELETE`, DDL, cambios de RLS o grants.

- `cerebro_company_registry_preprod`: 0 filas `fenix`.
- `cerebro_company_onboarding_preprod`: 0 filas `fenix`.
- `cerebro_company_engine_state_preprod`: 0 filas `fenix`.
- `cerebro_marketing_crm_bootstrap_run_preprod`: 0 recibos `fenix`.
- `cerebro_lrn001_continuation_preprod`: 0 recibos `fenix`.
- RPC `cerebro_company_engine_states_get_preprod('fenix','fenix')`: `company_not_found`.
- RPC `cerebro_marketing_crm_bootstrap_status_preprod('fenix','fenix')`: `company_not_found`.
- RPC `cerebro_lrn001_status_preprod('fenix','fenix')`: `company_not_found`.
- Funciones duraderas presentes: `cerebro_marketing_crm_bootstrap_record_preprod` y `cerebro_lrn001_record_preprod`. No fueron llamadas.
- `cerebro_marketing_crm_bootstrap_run_preprod` exige un `company_id` existente en **`cerebro_company_onboarding_preprod`** mediante foreign key. No basta registrar un motor o empresa aislado.
- Seguridad actual: tabla de recibos RLS activada; `SECURITY DEFINER` accesible por `service_role`, NO `anon` ni `authenticated`. Prohibido exponer esa credencial en cliente.
- **P0 de integridad:** la RPC de Marketing/CRM actual acepta `evidence_sha256`, `result_sha256` y contadores, pero **no valida por sí sola los bytes de prueba ni la finalización real del trabajo**. Si sus demás condiciones se cumplen, puede cambiar el motor a GREEN y APPBOOT a READY. No llamar con hashes inventados: exigir una atestación física independiente y content-addressed.

## 2. Dependencias REALES de las seis etapas sin terminar

| Fase | Motor | Estado histórico | Dependencias no GREEN en la foto | Prueba indispensable |
| --- | --- | --- | --- | --- |
| 11 | MKTBOOT-001 | READY | Ninguna | Crear plan de marketing aislado con fuentes reproducibles; evaluar y auditar la salida y el rollback; no publicar ni gastar |
| 12 | CRMBOOT-001 | READY | Ninguna | Bootstrap de esquema/contratos del CRM **sintético**, adaptador sin escritura en CRM real, no tocar clientes, comparar OLD/NEW y rollback |
| 13 | APPBOOT-001 | BLOCKED | CRMBOOT-001 | Pruebas no invasivas de contrato App existentes, sin reactivar antigua App PREPROD, verificación de autenticación y snapshot |
| 14 | AUTBOOT-001 | BLOCKED | CRMBOOT-001, APPBOOT-001 | Worker o job aislado, idempotencia, evento, permisos y kill-switch; sin ejecución en PROD |
| 15 | TRNBOOT-001 | BLOCKED | AUTBOOT-001 | Training sin clientes ni operaciones reales, offline, evaluación y tribunal, versión y rollback |
| 16 | ENGACT-001 | BLOCKED | MKTBOOT-001, CRMBOOT-001, APPBOOT-001, AUTBOOT-001, TRNBOOT-001 | Contratos/gates de todos los motores, supervisión y release manifest real; sin permisos implícitos |

No promover ninguno por las etiquetas `READY` o `GREEN` históricas. El requisito LRN es 17/17 GREEN **en el proyecto destino**, pero la garantía de autonomía demanda además actualidad, procedencia, ejecución física, verificación del dueño y rollback.

## 3. Implementación efectiva CUT59 en GitHub, rama aislada

- Datos de metadatos observados hoy: `cerebro/jarvis/boost-001/cut59-legacy-to-prod-observation-20261107.json`, commit `21860f0d16f8d46c4e9c35780e511ecc5bb04377`. **Snapshot**, no fuente viva ni prueba E2E.
- Analizador determinista de dependencia/permiso: `cerebro/jarvis/boost-001/cut59-engine-reconciliation-v0.mjs`. Rechaza cambios de empresa, DB, topología corrupta/cíclica, 17 motores falsificados, costes, acceso Trading, permisos PROD, metadatos inventados y antigüedad no declarada.
- Tests: `cerebro/jarvis/boost-001/cut59-engine-reconciliation-v0.test.mjs`.
- [GitHub Actions #42386287743](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42386287743) **SUCCESS**, **7/7 tests PASS**, sin llamadas a Supabase ni DeepSeek durante el job, sin modificaciones PROD.
- Artifact `cerebro-jarvis-cut59-engine-reconciliation-42386287743`, ID `13579402788`, hash SHA256 `d3a10deb908b3de504613a7f10fa66d81c5779a0c12f86d28d278338b0f22303`; reporte de análisis verificable SHA256 de entrada `044ac122f2283f5c78c12eeb093edcdf46b073447d9f15ac603ef175eb1ced56`.
- Resultado exacto: `priority_pivots=[CRMBOOT-001,MKTBOOT-001]`, `current_physical_green_proofs=0`, `lrn_ingest_authorized=false`, `prod_authorized=false`. **Esto es progreso verificable en auditoría, NO activación de motores.**

## 4. Orden de cierre recomendado para el siguiente bloque

**CUT60-A — Marketing/CRM aceptados físicamente sin PROD:** reutilizar los runtime de FACT/JOB/ACTGW y los contratos existentes. Capturar salidas reales de los dos motores en entorno aislado, sin escritura de CRM ni publicación; evidencias con hash del contenido, versión, fecha, company_id, datos sintéticos, tests, evaluación adversarial y rollback comprobado.

**CUT60-B — Tenant/Registry correcto en backend destino:** determinar cuál es el origen canónico del `company_id=fenix` para el proyecto `fenix-capital-prod`, levantar inventario y dependencias de `cerebro_company_registry_preprod`, `cerebro_company_onboarding_preprod`, `cerebro_company_engine_state_preprod`, RLS, triggers, constraints, consumidores y RPCs; backup probado, migración paralela idempotente, snapshot OLD vs NEW, rollback real. La mera presencia de esquemas PREPROD no implica App PREPROD.

**CUT60-C — Registros idempotentes y LRN:** una vez acreditados todos los gates, registrar `fenix` y el onboarding bajo el contrato aprobado; después recibir los resultados MKT/CRM y siguientes cuatro en orden de dependencias, con evidencias físicas nuevas y sin fabricar GREEN. Solo cuando las 17 comprobaciones sean reales, ensayar `cerebro_lrn001_record_preprod` con evaluación y tribunal independientes; su salida no es despliegue.

**CUT60-D — PROD real de JARVIS V2:** cerrar PRs de identidad B2/B3, verificación owner real, Gateway, voz/dictado, integración LRN/FACT, coste exacto DeepSeek, healthcheck físico E2E, observabilidad, backup y rollback probado; entonces promoción gradual segura a la App/Console REAL. No crear nueva App PREPROD ni tocar CUT30.

## 5. Riesgos y prioridades

- **P0: NO USE** `cerebro_marketing_crm_bootstrap_record_preprod` con hashes no autenticados.
- **P0:** no reemplazar la falta de 17 estados con una copia de octubre.
- **P0:** evitar cualquier conexión directa de un modelo de IA a `SECURITY DEFINER` / `service_role`.
- **P1:** no confluir los dos proyectos DB. Las relaciones de `company_registry`, `company_onboarding`, motores y RPC de LRN obligan a una migración gobernada, no a un insert manual.
- **P1:** CUT37 sigue `PAUSED`, 1,80 USD contabilizados conservadoramente, consumo efectivo pendiente de conciliar. No relanzar bucles DeepSeek para suplir pruebas técnicas.
- **P1:** mantener ENGINE Registry, contrato, mapa de dependencias, runbook, changelog, backup y rebuild actualizados.

**Estado final CUT59: HECHO auditoría / DEFINIDO secuencia / BLOQUEADA ingestión física LRN / PRODUCCIÓN NO HECHA.**
