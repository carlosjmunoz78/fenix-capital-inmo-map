# PROD runtime aplicado · 2026-08-31

## Alcance
Registro reproducible del runtime y del baseline real que ya existen en el proyecto Supabase PROD separado `fenix-capital-prod` (`cluhljgonannaafpmblx`). Este documento no contiene secretos, credenciales ni URLs firmadas.

## Estado del backend
- Namespace operativo: `fenix_prod`.
- 17 tablas operativas: `actors`, `ana_correcciones`, `bancos`, `comunicaciones`, `document_origin_links`, `document_upload_sessions`, `document_versions`, `documentos`, `envios_banco`, `expedientes`, `firma_history`, `firmas`, `gestiones_b2b`, `inmobiliarias`, `ofertas`, `tareas`, `tasaciones`.
- RLS activado en todas las tablas operativas.
- Acceso directo `anon`/`authenticated` revocado; el runtime usa facade RPC/Edge y `service_role` en backend.
- Identidad fail-closed: PROD no hereda actores ni sesiones PRE-PROD.
- `document_versions` es inmutable mediante trigger.
- Índices de claves foráneas y scopes operativos aplicados.
- Bucket documental `fenix-prod-documents`: privado, 50 MiB, tipos permitidos PDF/JPEG/PNG/WEBP/Word/Excel/texto.
- No se han importado fixtures, actores TEST ni filas sintéticas.

## Migraciones aplicadas
1. `bootstrap_prod_identity_fail_closed`
2. `create_prod_private_document_bucket`
3. `harden_prod_document_bucket`
4. `create_prod_operational_runtime_tables`
5. `create_prod_core_read_rpcs`
6. `create_prod_document_rpcs`
7. `create_prod_bank_offer_rpcs`
8. `create_prod_appraisal_sign_rpcs`
9. `create_prod_operational_scope_rpcs`
10. `create_prod_evidence_ana_rpcs`
11. `create_prod_expediente_workspace_rpcs`
12. `create_prod_external_evidence_session_rpcs`
13. `harden_prod_security_helpers`
14. `add_prod_runtime_indexes`
15. `seed_prod_direction_actor_unlinked`
16. `load_prod_validated_legacy_expedientes_baseline`
17. `allow_prod_unassigned_inmobiliarias`
18. `load_prod_validated_inmobiliarias_baseline`

## Baseline real precargado
La precarga se ejecutó con Auth PROD todavía cerrado para poder preparar datos sin habilitar acceso real.

- `BELEN-DIR` existe como actor `Direccion`, activo y **sin** `auth_user_id`. Sirve únicamente como propietario operativo provisional de la precarga; no habilita login.
- Expedientes PROD: **34** expedientes legado inequívocos, de los cuales **21 activos** y **13 históricos**; `synthetic=0`.
- Se excluyeron deliberadamente los **10 `REVISAR`** y las **2 anomalías/plantillas** del manifiesto de 46; no se han resuelto por parecido nominal.
- Inmobiliarias PROD: **9** entidades canónicas ya materializadas en el CRM actual, `synthetic=0`.
- Relaciones inmobiliaria-expediente aplicadas únicamente cuando la relación canónica era inequívoca: **21/34** expedientes precargados.
- Las 9 inmobiliarias carecen actualmente de `ID visitador operativo`/zona canónica; por ello quedan **sin propietario asignado** en PROD. La columna `owner_actor_code` admite `NULL` para no inventar un visitador.
- Banco canónico actual en Notion: solo contiene 3 fixtures `TEST · Banco *`. No se copiaron a PROD.
- No se crearon `Envíos a banco` ni `Ofertas` a partir de listas o asociaciones históricas.
- Old CRM: 46 filas; CRM actual: 46 claves `exp-legado-*`. La comparación de recuento no muestra delta estructural de filas respecto al baseline.

## Edge Functions PROD
Exactamente las siete funciones oficiales del contrato de frontend están desplegadas y ACTIVE:

| Función | verify_jwt | SHA256 bundle |
|---|---:|---|
| `fenix-app-gateway` | false* | `1a8505e8b98eb5a317d4dc1a57404f0eafe22fe13728b28287b379efa8fe2596` |
| `fenix-ana-api` | true | `72daa125c2c04c97d0fa8c33b3ebeee7de6261e1b7266b40b9727d6cb15ed585` |
| `fenix-ana-knowledge` | true | `ef198ca424796661cb999308e5de421071896d2112e5d18d9f46318bc7a88199` |
| `fenix-ana-canonical` | true | `17c953d8a3641ca0a22a77884e889d82ec938e775d259d07df5708803c041e59` |
| `fenix-evidence-api` | true | `06f18401f1b0ea842cd7115449ce910d832a8dade262b62d2b047dd9f45da2ba` |
| `fenix-memory-api` | true | `1769a05a99bc4fd1b6da9b4d852d3117e8de090d1322757290c60064571eeda8` |
| `fenix-b2b-actions` | true | `51b7a83f9c6c1f16bc2b25240d836e0804b3480ccb995d52cec7c9cb48405116` |

\* `fenix-app-gateway` valida el Bearer token dentro del cuerpo mediante Supabase Auth y después resuelve la identidad con `fenix_prod_actor_context_by_auth_server`; por eso mantiene `verify_jwt=false` de forma deliberada. Las rutas protegidas siguen fail-closed.

No existe una octava función PROD `fenix-app-api`: las rutas del antiguo helper PRE-PROD fueron consolidadas dentro del gateway oficial.

## Contratos preservados
- Roles: `Direccion`, `Financiero`, `Visitador`.
- Contexto de sesión PROD y `auth.uid()` independientes de PRE-PROD.
- Navegación por rol.
- Expedientes, workspace y consistencia de lifecycle.
- Documentación con original preservado, versionado inmutable, upload preparado/finalizado y URLs de lectura firmadas.
- Banco/oferta con idempotencia, hash de payload, autorización previa y control de versión.
- Tasaciones con gate de validación Dirección/Belén.
- Firmas con checklist, fecha mínima, confirmación y gate final Dirección/Belén.
- Inmobiliarias/contactos/visitadores con scopes de rol/zona.
- Evidencia y Ana con gobernanza de correcciones y conocimiento canónico.
- Audio→texto y chat interno siguen fuera del gate inicial conforme a `PROD_RELEASE_GATE.md`.

## Fail-closed deliberado pendiente de integración externa
El transporte bancario real no se simula. `fenix_prod_bank_send_server` devuelve `transport_not_configured` hasta disponer de un transporte PROD autorizado. Nunca marca un envío como realizado sin evidencia externa real.

## Validaciones ejecutadas
- Candidato de aplicación `7b5782ebb90199c8b877e8f88760bdf68176e9b2`: PRE-PROD App Build #2751, Build + Browser QA SUCCESS.
- HEAD documental anterior `df4184d42177a8d520c3a6c8ce775c07a7ef214f`: PROD Preparation Build #83 SUCCESS.
- Escaneo de definiciones `fenix_prod_*`: cero referencias `preprod`, `TEST identity`, `synthetic=true`, `Enviado TEST` o `Respondida TEST`.
- Security Advisor: RLS sin policy aparece como INFO intencional por facade fail-closed; `fenix_prod_session_context()` es ejecutable por `authenticated` de forma deliberada para resolver el propio `auth.uid()` en las Edge JWT.
- Performance Advisor: claves foráneas operativas indexadas; los índices aparecen inicialmente como `unused` porque PROD todavía no tiene tráfico real.

## Divergencia Git conocida
`main` y `prod-preparation` están divergidos desde el commit inicial. `main` está 5 commits por delante de la base común y el candidato 1459 commits por delante; la corrección manual del workflow de migración está en `main`. El PR #3 se mantiene draft y no debe forzarse hasta resolver la integración final de forma controlada.

## Gates que todavía impiden activar usuarios reales
1. PROD Auth tiene 0 usuarios. Deben existir usuarios Auth reales y vincularse a `fenix_prod.actors`; no se escribirán filas manualmente en `auth.users`.
2. Debe verificarse/configurarse `NOTION_TOKEN` en los secretos de Edge Functions del proyecto Supabase PROD. El conector disponible despliega funciones pero no gestiona secrets.
3. Debe ejecutarse el corte delta final del CRM inmediatamente antes del lanzamiento según `PROD_FINAL_LEGACY_DELTA_RUNBOOK_2026-08-30.md`.
4. Debe ejecutarse smoke PROD autenticado con la fotografía real migrada.
5. Debe resolverse la divergencia final del PR, promover el candidato completo a `main` y validar Vercel/`app.fenixcapital.es`.
6. El CRM antiguo permanece intacto como fallback durante estabilización.
