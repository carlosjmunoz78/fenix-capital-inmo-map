# fenix-document-extract PROD v12 — snapshot contract

Estado: PARCIAL / POR PROMOCIONAR

Fuente auditada directamente en Supabase PROD del proyecto `cluhljgonannaafpmblx`.

- Function: `fenix-document-extract`
- Version PROD: `12`
- `verify_jwt`: `true`
- PROD source SHA-256: `54b2a282be040ceeef3564cc6c7d7653c59b96e25ce3db9e7af27c9634b531d2`
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

Antes de promocionar cualquier nueva versión de `fenix-document-extract`, el source candidato debe compararse contra este snapshot y mantener todos los contratos anteriores.

## Rollback

La referencia de rollback inmediata es PROD v12 con SHA-256 `54b2a282be040ceeef3564cc6c7d7653c59b96e25ce3db9e7af27c9634b531d2`. No desplegar una variante si no existe forma de volver a esta versión funcional.
