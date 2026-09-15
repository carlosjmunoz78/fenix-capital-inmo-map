# APP RESTORATION · BACKEND LIVE COMPARISON · 2026-09-15

Estado: HECHO EN RAMA / NO PROMOCIONADO A PROD

Baseline de reconciliación: `main@e10ba788b60215e5b7130e4419e1c0ec8ed1508e`.
PR: #385.

Objetivo: comparar los artefactos backend restaurados contra Supabase PROD antes de cualquier deploy/apply y evitar sobrescribir versiones vivas con código antiguo.

## 1. `fenix-document-extract`

PROD auditado directamente en Supabase:
- estado: ACTIVE
- versión: 12
- `verify_jwt`: true
- bundle `ezbr_sha256`: `54b2a282be040ceeef3564cc6c7d7653c59b96e25ce3db9e7af27c9634b531d2`

El source baseline versionado en esta rama está fijado por SHA-256 `c8ccc623be364dcfc67b8be8f6b5320476909f4c1af77bf2e3339723b8a0b1c9` y representa la versión PROD v12 auditada.

La restauración NO debe desplegar ese baseline tal cual: el builder `scripts/build-fenix-document-extract-candidate.mjs` genera un candidato mínimo que únicamente amplía la proyección laboral permitida:
- `modalidad_contrato`
- `fecha_inicio_contrato`
- `fecha_fin_contrato`
- `jornada`
- `categoria_profesional`
- `numero_pagas`

El verificador exige que no exista ningún otro cambio fuera de `NUMBER_FIELDS`, `FIELD_KEYS` y `CANONICAL_KEYS`.

Estado: `BASELINE_LIVE_PINNED=HECHO`; `CANDIDATE_STATIC_GATE=GREEN`; `CANDIDATE_DEPLOY=NO`.

## 2. `fenix-document-intelligence`

PROD auditado directamente en Supabase:
- estado: ACTIVE
- versión: 12
- `verify_jwt`: true
- bundle `ezbr_sha256`: `ea16a46859f783dd3e7758bf5a7b16f800cd52b5b58acc076728a773fff64293`

Delta confirmado del candidato de #385 frente a PROD v12:
- añade normalización de confianza 0..1 / 0..100 mediante `normalizeConfidence`;
- amplía `buyerChanges` con los campos laborales `tipo_contrato`, `modalidad_contrato`, `fecha_inicio_contrato`, `fecha_fin_contrato`, `jornada`, `categoria_profesional`, `numero_pagas`;
- amplía `route()` para reconocer el alias de test además del slug PROD;
- conserva autenticación Bearer, CORS PROD, `fenix_prod_session_context`, política `document_auto_ingest_min_confidence`, `LOW_CONFIDENCE`, `POLICY_CONFLICT`, confirmación de conflictos y los scopes existentes.

Este candidato NO es byte-equivalente al LIVE: contiene funcionalidad adicional necesaria para que la restauración laboral llegue a la proyección canónica.

Estado: `LIVE_COMPARISON=HECHO`; `DEPLOY_REQUIRED_FOR_FULL_LABOR_RESTORATION=SI`; `DEPLOY=NO` hasta rollback + E2E.

## 3. `fenix-expediente-people`

PROD auditado directamente en Supabase:
- estado: ACTIVE
- versión: 2
- `verify_jwt`: true
- bundle `ezbr_sha256`: `72f62f3d04dff27ebdb4c1e177d9383449c62f22454e47ea9cc1bae74f7e8d49`

Delta confirmado del candidato de #385 frente a PROD v2:
- añade `mergeLabor()`;
- en `GET ?expediente=...` conserva `fenix_prod_exp_people_server` y añade lectura de `fenix_prod_exp_labor_profile_server`;
- fusiona el perfil laboral canónico por `id/cliente_code` sin alterar las rutas de contacto, create, update o list_assign.

Dependencia live verificada: `public.fenix_prod_exp_labor_profile_server(text,text)` ya existe en PROD, es `SECURITY DEFINER`, tiene EXECUTE para `service_role` y no para `authenticated` ni `anon`.

Estado: `LIVE_COMPARISON=HECHO`; `DEPENDENCY_LIVE=GREEN`; `DEPLOY_REQUIRED_FOR_FULL_LABOR_RESTORATION=SI`; `DEPLOY=NO` hasta rollback + E2E.

## 4. Migración SQL laboral

`supabase/migrations/20260914162500_explicit_participant_labor_profile.sql` NO debe reaplicarse a PROD: la función objetivo ya existe LIVE con el mismo contrato funcional y permisos de servicio. El SQL se conserva como contrato/rebuild y contiene rollback explícito.

Estado: `LIVE_ALREADY_APPLIED=HECHO`; `REAPPLY=NO`.

## 5. Dependencias RPC

Verificadas en PROD y disponibles con ejecución de `service_role`:
- `fenix_prod_actor_context_by_auth_server(uuid)`
- `fenix_prod_contact_get_server(text,text)`
- `fenix_prod_contact_list_assign_server(text,text,text,boolean)`
- `fenix_prod_contact_lists_server(text,text)`
- `fenix_prod_evidence_scope_server(text,text,text)`
- `fenix_prod_exp_labor_profile_server(text,text)`
- `fenix_prod_exp_people_server(text,text)`
- `fenix_prod_exp_person_create_server(text,text,jsonb)`
- `fenix_prod_exp_person_update_server(...)`
- `fenix_prod_runtime_policy_server(text)`

`fenix_prod_session_context()` permanece ejecutable por `authenticated`, como contrato actual de sesión.

## 6. Gate actual

App Restoration Build Gate para HEAD `88144d2a4e16f863bb588549dd08f207bfddb309`: SUCCESS.

Incluye:
- `npm ci`
- materialización/verificación del extractor candidato
- contratos de restauración A+B+D
- TypeScript
- build Vite

## 7. Promoción bloqueada correctamente

No promover todavía. Faltan:
1. snapshot/rollback exacto de las versiones LIVE de `fenix-document-intelligence` y `fenix-expediente-people`;
2. materializar/pinear el candidato deployable de `fenix-document-extract`;
3. E2E autenticado del circuito extractor → intelligence → people;
4. QA visual/autenticado de las pantallas afectadas;
5. rehearsal de rollback del HEAD final;
6. verificar de nuevo `main` y el efecto de auto-deploy antes de cualquier merge.

Hasta entonces: `SAFE_TO_MERGE=NO`, `SAFE_TO_DEPLOY_BACKEND=NO`, `SAFE_TO_RETIRE_LEGACY=NO`.
