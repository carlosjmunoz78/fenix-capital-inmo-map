# COMPET Native V1 — PREPROD Runbook

## Estado

`COMPET-NATIVE` es la capa nativa gobernada de `COMPET-001`. V1 autoriza solo `PREPROD`, exige Gateway, mantiene coste adicional `0 €` y no crea motor nuevo. PROD, Trading y Android quedan fuera de alcance.

## Existente preservado

Se conserva sin sustitución:

- `runCompetContinuousV0` en `fact001-gap-capabilities-v0.mjs`, núcleo determinista ya existente.
- `public-source-adapter-v0.mjs`, lectura pública GET-only/HTTPS.
- `compet-real-targets-v0.mjs` y `compet-real-targets.v0.json`, prueba real Fénix ya existente.
- `TECH-CAP-SCOUT-NATIVE`, proveedor gobernado de evidencia pública adicional.
- `evaluation-tribunal.mjs` y `EVT-001`.

La prueba real Fénix mantiene su verdad actual: baseline congelado y scheduler configurado, pero `soak_complete=false`. Este wrapper no lo eleva artificialmente.

## Multiempresa y contrato

Contexto obligatorio: `company_id`, `engine_id=COMPET-001`, `environment=PREPROD`, `version`. El material de otra empresa se rechaza. Operaciones:

- `BUILD_WATCH_PLAN`
- `ACQUIRE_PUBLIC_BASELINE`
- `RUN_CYCLE`
- `BUILD_DOSSIER`
- `REPLAY_VERIFY`

Dimensiones canónicas V1: oferta, precios, SEO, campañas, expansión, posicionamiento, más hash/título de página pública para detección objetiva de cambios.

## Ejecución

El orden normal es plan de vigilancia → adquisición pública o evidencia del Scout → normalización de observaciones → ciclo determinista OLD vs NEW → dossier → replay. La adquisición directa usa el adaptador público existente y no persiste el cuerpo remoto; guarda solo metadatos/procedencia necesarios.

## Coste y frecuencia

Ruta por defecto 0 €. No hay SaaS obligatorio ni instalación automática externa. Frecuencia recomendada baja y configurable, alineada con el motor maestro. Cualquier coste incremental positivo se detiene con `HUMAN_REQUIRED/MONEY_LIMIT`.

## Seguridad y privacidad

Solo HTTPS público en adquisición directa, sin credenciales en URL ni parámetros con apariencia de secreto. Sin escritura al proveedor, datos de clientes, extracción de datos personales, bypass de autenticación/CAPTCHA o acceso a Trading. Las acciones PROD permanecen denegadas.

## Observabilidad

Se registran recibo de autorización, `plan_id`, `provenance_hash`, cambios por dimensión, siguiente ejecución determinista, `dossier_id`, replay y coste. Los eventos previstos para EVT-001 son `compet.watch_plan.ready`, `compet.public_baseline.acquired`, `compet.cycle.completed` y `compet.dossier.ready`.

## Backup, rollback y rebuild

Backup: versionar planes de vigilancia, observaciones públicas normalizadas y dossiers fuera de cargas pesadas del core transaccional. Rollback: retirar wrapper/registro V1; el core COMPET V0 y la vigilancia Fénix existente permanecen intactos. Rebuild: reinstalar desde Git y reproducir observaciones versionadas por `runCompetContinuousV0`, verificando hashes y dossiers.

## Evaluación / Tribunal

La suite cubre multiempresa, dimensiones de negocio, determinismo, aislamiento, coste, PROD/Trading deny, E2E y replay. OLD vs NEW usa benchmark de cobertura de gates y juez independiente `QA-001`. PASS solo permite `NATIVE_FULL_PREPROD`; no concede PROD.

## Changelog

- `1.0.0`: wrapper multiempresa sobre el core COMPET existente; añade Gateway, plan, dimensiones completas, adquisición pública reutilizada, dossiers/replay, contratos, observabilidad, backup/rollback/rebuild y cierre PREPROD.
