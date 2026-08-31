# Auditoría de dependencias backend PROD · 2026-08-31

## Objetivo
Preparar el backend PROD separado sin copiar PRE-PROD a ciegas, sin importar fixtures TEST/QA/DEMO y sin debilitar RBAC, fail-closed ni los gates de acciones sensibles.

## Estado verificado
- Candidato app: `prod-preparation` @ `e2a6f5e8931ace2cc6e5e2520fe31ee758d52683` antes de este commit documental.
- Supabase PRE-PROD: `hnqlnvakzaywtafeiybt`.
- Supabase PROD: `cluhljgonannaafpmblx` (`fenix-capital-prod`).
- PROD está sano como proyecto, pero vacío para la APP: 0 migraciones, 0 tablas de aplicación y 0 Edge Functions.
- PRE-PROD contiene 24 tablas en el schema `preprod_test` y 103 RPC públicas con prefijo `preprod_test_`.
- Los datos existentes en `preprod_test` son de validación/QA; no deben copiarse a PROD. `qa_evidence` por sí sola contiene cientos de filas de prueba.

## Contrato frontend que debe respetar PROD
`src/supabase.ts` fija siete nombres de Edge Functions en PROD, sin sufijo `-test`:
- `fenix-app-gateway`
- `fenix-ana-api`
- `fenix-ana-knowledge`
- `fenix-ana-canonical`
- `fenix-evidence-api`
- `fenix-memory-api`
- `fenix-b2b-actions`

El almacenamiento de auth PROD es independiente (`fenix-prod-auth-v1`) y no admite fallback a sesiones PRE-PROD.

## Hallazgo crítico: gateway incompleto si se renombra sin más
`fenix-app-gateway-test` no es autocontenido. Las rutas que no maneja directamente se reenvían a `fenix-app-api-test`.

Sin embargo, el contrato PROD documentado y el frontend solo declaran siete funciones y no incluyen `fenix-app-api`.

Por tanto, está prohibido hacer una sustitución mecánica `*-test -> PROD`: dejaría rutas sin backend o introduciría una octava función no aprobada/documentada. Antes del despliegue hay que cerrar esta discrepancia de una de estas dos formas, con tests:
1. consolidar en `fenix-app-gateway` las rutas que hoy viven en `fenix-app-api-test`, o
2. formalizar explícitamente `fenix-app-api` como componente interno PROD y actualizar contrato, gates y pruebas.

No se elegirá una de las dos por inferencia silenciosa.

## Dependencias observadas de las funciones objetivo
### `fenix-app-gateway-test` / `fenix-app-api-test`
Dependen fuertemente de `preprod_test`: identidad de actor, navegación, expedientes, tareas, búsqueda, documentación, bancos/envíos/ofertas, tasaciones, firmas, contactos, inmobiliarias y acciones sensibles. Usan bucket `fenix-preprod-documents-test` y RPC `preprod_test_*`.

### `fenix-ana-api-test`
Usa Supabase para contexto/correcciones y Notion para materializar aprendizaje/tareas. Actualmente genera marcadores `TEST`, `PRE-PROD` y `Es TEST=true`; no es desplegable sin adaptación productiva.

### `fenix-ana-knowledge-test`
Es mayoritariamente Notion-first, pero la autenticación/contexto depende de `preprod_test_session_context`. Genera conocimiento y tareas marcadas como TEST/PRE-PROD. Debe eliminar esos marcadores en la versión PROD y mantener el gate humano de autoridad.

### `fenix-ana-canonical-test`
Lee conocimiento canónico de Notion pero autentica mediante `preprod_test_session_context`. Ya contiene una política importante: fuera del proyecto PRE-PROD excluye filas `Es TEST=true`. Esta protección debe conservarse en PROD.

### `fenix-evidence-api-test`
Combina Notion + Supabase. Usa el bucket PRE-PROD y `preprod_test.document_upload_sessions`, además de RPC de scope/finalización. En el flujo Notion marca actualmente `Fixture sintético=true` y notas PRE-PROD: esos marcadores no pueden pasar a datos reales PROD.

### `fenix-memory-api-test`
Es principalmente Notion-first; depende de Supabase para `preprod_test_session_context`. Sus escrituras a Notion son operativas y deben conservar validación de scope/RBAC.

### `fenix-b2b-actions-test`
Es Notion-first; depende de Supabase para contexto de sesión. Permite Dirección/Visitador según scope, propietario y zona; ese fail-closed debe conservarse.

## Inventario DB PRE-PROD
Tablas `preprod_test` detectadas: `actors`, `ana_correcciones`, `auth_provisioning_audit`, `bancos`, `communication_history`, `comunicaciones`, `document_origin_links`, `document_upload_sessions`, `document_versions`, `documentos`, `envios_banco`, `expediente_stage_history`, `expedientes`, `firma_history`, `firmas`, `gestiones_b2b`, `inmobiliarias`, `lead_intake_events`, `notion_mutation_audit`, `ofertas`, `qa_evidence`, `report_snapshots`, `tareas`, `tasaciones`.

Hay 103 RPC públicas `preprod_test_*`. No todas pertenecen al runtime inicial: existen helpers, QA, reportes, comunicaciones, lead intake y funciones históricas. La promoción debe llevar solo el cierre transitivo requerido por las rutas PROD activas, más las restricciones/índices/policies necesarios.

## Regla de datos
- Migrar estructura/contratos validados, no filas PRE-PROD.
- No copiar `qa_evidence`, actores TEST, auditorías TEST, sesiones de upload TEST, fixtures de bancos/expedientes/tareas/tasaciones/firmas, ni eventos de pruebas.
- La fotografía operativa real continúa en Notion/CRM y se incorpora mediante el delta final controlado inmediatamente antes del lanzamiento.

## Próximo gate técnico
1. Extraer el cierre transitivo exacto de RPC/tablas/índices/constraints/policies requerido por las rutas activas.
2. Diseñar namespace/objetos PROD con nombres productivos y sin referencias `preprod_test`.
3. Resolver la discrepancia `fenix-app-gateway` ↔ `fenix-app-api-test` con cobertura automática.
4. Crear bucket documental PROD separado y políticas mínimas.
5. Crear bootstrap de identidad PROD sin actores QA/TEST y con fail-closed por defecto.
6. Desplegar las Edge Functions PROD solo cuando sus dependencias DB existan y sus fuentes hayan sido limpiadas de PRE-PROD/TEST.
7. Smoke controlado Dirección/Belén; después delta final CRM; smoke real; solo entonces promoción a `main`.

## Prohibiciones vigentes
- No copiar las ~120 migraciones PRE-PROD en bloque.
- No renombrar funciones mediante sustitución de texto y desplegarlas.
- No reutilizar bucket, sesiones, actores ni fixtures PRE-PROD.
- No promover PR #3 ni `main` mientras este gate permanezca rojo.
