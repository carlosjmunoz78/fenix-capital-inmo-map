# fenix-document-extract PROD v12 — snapshot contract

Estado: HECHO EN RAMA / NO PROMOCIONADO A PROD

Fuente auditada directamente en Supabase PROD del proyecto `cluhljgonannaafpmblx` y versionada en `supabase/functions/fenix-document-extract/index.ts`.

- Function: `fenix-document-extract`
- Version PROD auditada: `12`
- `verify_jwt`: `true`
- Supabase bundle `ezbr_sha256`: `54b2a282be040ceeef3564cc6c7d7653c59b96e25ce3db9e7af27c9634b531d2`
- Hash SHA-256 del source versionado en repo: `c8ccc623be364dcfc67b8be8f6b5320476909f4c1af77bf2e3339723b8a0b1c9`
- Bucket leído por backend: `fenix-prod-documents`
- Apply target: `fenix-document-intelligence`
- MIME soportados: PDF, PNG, JPEG, WEBP
- Límite: 12 MiB

## Contratos que deben preservarse sin regresión

- Autenticación Bearer + `fenix_prod_session_context`.
- Resolución de ámbito mediante `fenix_prod_document_extract_resolve_server`.
- Persistencia de runs mediante `fenix_prod_document_extract_run_upsert_server` y `fenix_prod_document_extract_run_update_server`.
- Política de confianza por `fenix_prod_runtime_policy_server(document_auto_ingest_min_confidence)`.
- `POLICY_CONFLICT` y `LOW_CONFIDENCE` siguen siendo HUMAN_REQUIRED.
- No aplicar campos si la confianza no supera la política vigente.
- `legacy_status` y `legacy_batch` siguen limitados a Dirección.
- No modificar OCR/clasificación/modelo/proveedor en esta restauración.

## Hueco confirmado

`FIELD_KEYS` de PROD v12 ya puede extraer `tipo_contrato`, `categoria_profesional`, `fecha_inicio_contrato`, `fecha_fin_contrato` y `jornada`, pero `CANONICAL_KEYS` solo deja pasar parte del conjunto laboral hacia `fenix-document-intelligence`.

Campos que deben quedar admitidos en la proyección canónica del candidato, sin cambiar el resto del flujo:

- `tipo_contrato`
- `modalidad_contrato`
- `fecha_inicio_contrato`
- `fecha_fin_contrato`
- `jornada`
- `categoria_profesional`
- `numero_pagas`

El builder `scripts/build-fenix-document-extract-candidate.mjs` parte exclusivamente del source versionado, valida su hash, exige anchors únicos y genera solo la ampliación laboral mínima. No despliega nada.

## Gate

Workflow `34867656937`: COMPLETED / SUCCESS. Contratos A+B+D + snapshot/source pin de extractor + TypeScript/Vite en verde para HEAD `8e0e62a34bf398c818a236d4d9be67c58d5efb05`.

## Rollback

La referencia de rollback inmediata es la función PROD v12 identificada por bundle `ezbr_sha256` `54b2a282be040ceeef3564cc6c7d7653c59b96e25ce3db9e7af27c9634b531d2`, con el source auditado/versionado en esta rama y hash repo `c8ccc623be364dcfc67b8be8f6b5320476909f4c1af77bf2e3339723b8a0b1c9`. No desplegar una variante si no existe forma de volver a esta versión funcional.
