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

El source baseline versionado está fijado por SHA-256 `c8ccc623be364dcfc67b8be8f6b5320476909f4c1af77bf2e3339723b8a0b1c9` y representa la versión PROD v12 auditada.

El builder genera de forma determinista un candidato mínimo con SHA-256 `ad6c48c3319cd1259861dda5183f57383651e65d27e270063032a8c6f0eefd4e`. Solo amplía `NUMBER_FIELDS`, `FIELD_KEYS` y `CANONICAL_KEYS` para admitir la proyección laboral: `modalidad_contrato`, `fecha_inicio_contrato`, `fecha_fin_contrato`, `jornada`, `categoria_profesional`, `numero_pagas`.

Estado: `BASELINE_LIVE_PINNED=HECHO`; `CANDIDATE_STATIC_GATE=GREEN`; `CANDIDATE_DEPLOY=NO`.

## 2. `fenix-document-intelligence`

PROD auditado directamente en Supabase:
- estado: ACTIVE
- versión: 12
- `verify_jwt`: true
- bundle `ezbr_sha256`: `ea16a46859f783dd3e7758bf5a7b16f800cd52b5b58acc076728a773fff64293`

Delta confirmado del candidato de #385 frente a PROD v12:
- normalización de confianza 0..1 / 0..100 mediante `normalizeConfidence`;
- `buyerChanges` admite `tipo_contrato`, `modalidad_contrato`, `fecha_inicio_contrato`, `fecha_fin_contrato`, `jornada`, `categoria_profesional`, `numero_pagas`;
- `route()` reconoce el alias de test además del slug PROD;
- conserva autenticación Bearer, CORS PROD, `fenix_prod_session_context`, política `document_auto_ingest_min_confidence`, `LOW_CONFIDENCE`, `POLICY_CONFLICT`, confirmación de conflictos y scopes existentes.

Rollback exacto versionado en `supabase/rollback/fenix-document-intelligence-v12/index.ts`.
SHA-256 del source de rollback validado en CI: `a6e0db33104fb4141ead849ebc6af25e1db7e4a58ba1fb879e2956be58395af9`.
Git blob: `c18ae8742692185e4e56666f7d84407bcc4698bb`.

Estado: `LIVE_COMPARISON=HECHO`; `ROLLBACK_SOURCE_PINNED=HECHO`; `DEPLOY_REQUIRED_FOR_FULL_LABOR_RESTORATION=SI`; `DEPLOY=NO` hasta E2E.

## 3. `fenix-expediente-people`

PROD auditado directamente en Supabase:
- estado: ACTIVE
- versión: 2
- `verify_jwt`: true
- bundle `ezbr_sha256`: `72f62f3d04dff27ebdb4c1e177d9383449c62f22454e47ea9cc1bae74f7e8d49`

Delta confirmado del candidato de #385 frente a PROD v2:
- añade `mergeLabor()`;
- `GET ?expediente=...` conserva `fenix_prod_exp_people_server` y añade lectura de `fenix_prod_exp_labor_profile_server`;
- fusiona el perfil laboral canónico por `id/cliente_code` sin alterar contacto, create, update o list_assign.

Dependencia live verificada: `public.fenix_prod_exp_labor_profile_server(text,text)` ya existe en PROD, es `SECURITY DEFINER`, tiene EXECUTE para `service_role` y no para `authenticated` ni `anon`.

Rollback exacto versionado en `supabase/rollback/fenix-expediente-people-v2/index.ts`.
SHA-256 del source de rollback validado en CI: `711d23069c9f768effbdecee9e5c05e0b2f413a28c76f61adbe8d09c3357588a`.
Git blob: `ce89ae11370c0951658f2af9720d9037b4525667`.

Estado: `LIVE_COMPARISON=HECHO`; `DEPENDENCY_LIVE=GREEN`; `ROLLBACK_SOURCE_PINNED=HECHO`; `DEPLOY_REQUIRED_FOR_FULL_LABOR_RESTORATION=SI`; `DEPLOY=NO` hasta E2E.

## 4. Migración SQL laboral

`supabase/migrations/20260914162500_explicit_participant_labor_profile.sql` NO debe reaplicarse a PROD: la función objetivo ya existe LIVE con el mismo contrato funcional y permisos de servicio. El SQL se conserva como contrato/rebuild y contiene rollback explícito.

Estado: `LIVE_ALREADY_APPLIED=HECHO`; `REAPPLY=NO`.

## 5. Dependencias RPC

Verificadas en PROD y disponibles con ejecución de `service_role`: `fenix_prod_actor_context_by_auth_server`, `fenix_prod_contact_get_server`, `fenix_prod_contact_list_assign_server`, `fenix_prod_contact_lists_server`, `fenix_prod_evidence_scope_server`, `fenix_prod_exp_labor_profile_server`, `fenix_prod_exp_people_server`, `fenix_prod_exp_person_create_server`, `fenix_prod_exp_person_update_server`, `fenix_prod_runtime_policy_server`.

`fenix_prod_session_context()` permanece ejecutable por `authenticated`, como contrato actual de sesión.

## 6. Gate exact-head

HEAD auditado: `55786ee9efc1ec112a08f34db6bc7b395f33b05a`.
Workflow run: `34930744284` / SUCCESS.

Resultado:
- extractor baseline y candidato verificados;
- rollback snapshots auditados;
- 28/28 contratos A+B+D PASS;
- TypeScript PASS;
- Vite production build PASS;
- bundle inmutable de promoción/rollback archivado como artifact `10380953266`.

Artifact:
- nombre: `app-restoration-backend-55786ee9efc1ec112a08f34db6bc7b395f33b05a`
- digest: `sha256:1035d875e2e169008e9ed9afc14c9560ed3b75880573cab85e77f73054343fb8`
- contiene candidato extractor generado, candidatos intelligence/people, snapshots rollback, migración SQL y este contrato de auditoría.

## 7. Promoción bloqueada correctamente

Snapshot/rollback estructural ya no es bloqueo. Siguen pendientes:
1. E2E autenticado del circuito extractor → intelligence → people;
2. QA visual/autenticado de las pantallas afectadas;
3. rehearsal operativo de rollback del HEAD final;
4. revalidar `main` y el efecto de auto-deploy antes de cualquier merge.

Hasta entonces: `SAFE_TO_MERGE=NO`, `SAFE_TO_DEPLOY_BACKEND=NO`, `SAFE_TO_RETIRE_LEGACY=NO`.
