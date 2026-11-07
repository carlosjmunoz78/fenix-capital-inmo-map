# CEREBRO OS · JARVIS V2 · CUT60 — EJECUCIÓN Y BLOQUEOS DE PRODUCCIÓN

Fecha: 2026-11-07. Company `fenix`. Entorno de ejecución de tests `LAB`. Rama `cerebro/jarvis-deepseek-weekend-lab-20261106`. Objetivo final explícito: **JARVIS V2 completo en PROD de App/Console**, no LAB.
Protegidos: App/CRM reales, Supabase transaccional PROD, DNS, Cloudflare CUT30, ANA voz, Trading LAB, GitHub main, Notion y SEO. No se solicitaron suscripciones nuevas; DeepSeek permanece PAUSED.

## HECHO 1 · Tres recibos históricos originales de Supabase auditados
- Lectura SQL solo `SELECT` en **proyecto origen** `hnqlnvakzaywtafeiybt` (nombre `fenix-capital-inmo-map`), con JOIN entre `cerebro_bootstrap_tier_run_preprod` y `cerebro_company_engine_state_preprod`.
- Se hallaron tres recibos de `KBOOT-001`, `SEOBOOT-001` y `SOCBOOT-001`: hashes de evidencia coincidentes con su estado registrado, `GREEN` de 2026-10-13, version 1.0.0, compañía fenix, PREPROD, importes 0, Trading y PROD OFF.
- Conteos originales: KBOOT 4 ítems/4 fuentes, SEOBOOT 20/3, SOCBOOT 5/2.
- Fuente congelada en `cerebro/jarvis/boost-001/cut60-upstream-historical-receipts-20261107.json`, commit `ef472b999773139d2fb3cb3ae96c0dfc6d90bdd2`.
- **No se recuperaron los bytes del contenido upstream original**: las huellas son referencias históricas de recibo, no atestación criptográfica de operación actual ni muestra de datos reales. Los 3 nombres GREEN indican estado histórico, no disponibilidad hoy.

## HECHO 2 · Ejecutado el código existente de Marketing y CRM usando dichas referencias históricas

- Archivo existente, **sin modificar**, `cerebro/multicompany/marketing-crm-bootstrap-v1.mjs`, blob git `03c9048deec79f6b354f89b8abaf09bc0b4a63d1`.
- Nuevo harness `cerebro/jarvis/boost-001/cut60-historical-receipts-runtime-v0.mjs`, sin usar datos de clientes: crea planes de embudos y CRM mock, llama a las funciones reales `bootstrapMarketing`, `bootstrapCrm` y `persistenceEnvelope`; compara estrictamente hashes y contadores de los 3 recibos originales.
- Verificación de credenciales, empresa distinta, autoridad ampliada, duplicidad y manipulaciones de las referencias. Los outputs tienen nuevos hashes de resultados y plan de prueba; **no se registra ni publica nada**.
- Primer run #42387647827 falló por expectativa incorrecta de código de error para una manipulación de ID; el motor la rechazaba correctamente. Test negativo corregido para distinguir ID alterado vs duplicidad verdadera, sin relajar validador.
- [Workflow GitHub #42387742454](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42387742454) **SUCCESS**, 5 pruebas existentes + 6 nuevas = **11/11 PASS**, 2/2 ejecuciones de código de motor terminadas.
- Artifact GitHub ID **13580345970** (`jarvis-cut60-historical-bootstrap-lineage-42387742454`), digest ZIP SHA256 `77383e820c04044458c15c90e3f88be03e13548f9977f1d8caabe5fe86e5bf1d`.
- Sin llamadas API de pago, sin RPC mutadora, sin insertar recibos y **sin confirmar fuentes de datos recientes, campaña real, CRM físico o App**.
- Output = `LAB_SYNTHETIC_PLAN_ONLY`. Historial verificado ≠ runtime PROD certificado.

## HECHO 3 · Contrato real de Tenant/Company Registry/Onboarding analizado en Supabase PROD

Proyecto transaccional destino: `cluhljgonannaafpmblx` (`fenix-capital-prod`).

Lecturas vivas por conector Supabase:
- Faltan `fenix` en `cerebro_company_registry_preprod` (0), `cerebro_company_onboarding_preprod` (0) y `cerebro_company_engine_state_preprod` (0).
- Faltan los recibos de `cerebro_marketing_crm_bootstrap_run_preprod` (0) y `cerebro_lrn001_continuation_preprod` (0).
- Todas las cinco tablas usan RLS; RPC `SECURITY DEFINER` correspondientes deniegan ejecución a `anon` y `authenticated` y la permiten a `service_role`. No habilitar a clientes.
- Grafo de claves externas observado: `registry` → `onboarding` → `engine_state` y, desde `onboarding`, a `marketing_crm_bootstrap_run` y `lrn001_continuation`.
- Se verificaron los UNIQUE de idempotencia del registry, onboarding y recibos.
- No hay triggers de usuario en las cinco tablas (los triggers internos de FK pueden existir).
- Funciones existentes:
  - `cerebro_company_register_preprod`: inserta registro de empresa e historial de registro.
  - `cerebro_company_onboarding_start_preprod`: exige empresa previamente registrada y misma huella de perfil; crea onboarding y **17 filas iniciales**.
  - `cerebro_marketing_crm_bootstrap_record_preprod`: crearía un recibo y, con sus propias condiciones, marcaría un motor GREEN.
  - `cerebro_lrn001_record_preprod`: exige 17 GREEN, evaluación y tribunal para continuación.
- **Advertencia crítica**: `onboarding_start_preprod` marca inicialmente **TENANT-001**, **COMP-REG-001** y **COMP-ONB-001** como GREEN **sin pruebas físicas de ejecución ni hash de evidencia**. Esto es un scaffold de control, no certificación para PROD. Por ello el gate CUT60 separa `initial_scaffold_green_count=3` de `physical_green_count=0`.
- Los contratos físicos de App PREPROD antigua se mantienen cancelados. Tablas PREPROD dentro de DB PROD NO son una App PREPROD nueva.
- No se invocó ninguna de las cuatro funciones mutadoras. No se ejecutó DDL, INSERT, UPDATE, GRANT ni se tocó ningún secreto.

## HECHO 4 · Nuevo control contra altas prematuras

- Código `cerebro/jarvis/boost-001/cut60-company-onboarding-readiness-v0.mjs`.
- [GitHub Actions #42388217199](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42388217199) **SUCCESS, 7/7 tests PASS**, artifact ID **13580845466** (`jarvis-cut60-registry-admission-no-go-42388217199`), SHA256 `42a4ad99e5c7c2053177c9595d683c7b5405710e9ec61d745a405969783207ec`.
- El gate rechaza acceso a otra empresa, base incorrecta, RLS/grants alterados, conteo inventado de GREEN, cambios de cardinalidad y ausencia de respaldo/rollback/identidad.
- Resultado `NO_GO: BACKUP_RESTORE_DEPENDENCY_IDENTITY_GATES_PENDING`; aun con flags hipotéticos en verde, el gate no autoriza escrituras automáticamente.
- El test ejecuta una política offline sobre un snapshot del catálogo, **no prueba conectividad ni backups reales**.

## Dependencias todavía abiertas

| Gate | Estado | Criterio de cierre |
| --- | --- | --- |
| Código existente MKTBOOT y CRMBOOT | HECHO · LAB | 2 ejecuciones con hashes históricamente registrados |
| Fuente upstream bytes y datos actuales | POR AUDITAR | Relectura y E2E de fuentes productivas no invasivo |
| Backup de DB PROD y restore test | BLOQUEADO | Snapshot recuperable y restore físico acreditado, sin coste extra |
| Inventario completo consumidores de Company Registry/Onboarding | PARCIAL | Contratos y RLS revisados; falta mapa de consumidores en App/CRM |
| Identidad B2/B3 Owner E2E | BLOQUEADO | Validar la identidad en Gateway y permisos antes de registrar |
| Alta `fenix` en `fenix-capital-prod` | NO HECHO | Backup + rollback + contrato de perfil + no colisión + aprobación gobernada |
| 17 motores GREEN con pruebas actuales | NO HECHO | Control independiente por motor y cadena de dependencias |
| LRN-001 ingestión física | NO HECHO | Recibos válidos, evaluación externa y tribunal |
| JARVIS V2 voz/console/Gateway en PROD | NO HECHO | Comprobación física integrada y promoción gradual |
| DeepSeek reanudación de aprendizaje de pago | OFF | Conciliación previa de coste real y regla presupuestaria |

## Rebuild, rollback y coste

- Evidencias en rama de GitHub, workflows y artifacts privados con retención 30 días.
- Rebuild del filtro: ejecutar Node 24 con `node --test` en archivos `cut60-*.test.mjs` y las pruebas existentes `marketing-crm-bootstrap-v1.test.mjs`.
- Rollback de cambios de GitHub: revertir commits exclusivos de CUT60 en rama LAB después de comparar dependencias; **no existe rollback físico de Supabase PROD porque no se ha cambiado nada**.
- Coste adicional contratado: 0 EUR. GitHub Actions consumió minutos existentes (coste facturado no conciliado). DeepSeek API CUT60: 0 llamadas.
- Siguiente bloque único: **CUT61 · inventario de consumidores de Company Registry + pruebas de backup/restauración no invasivas + Owner B2/B3 E2E; después cambio PREPROD aislado gobernado y Gate PROD real.**
