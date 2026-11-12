# CEREBRO OS · Owner Universe Bridge LAB V7
Fecha: 2026-11-12. Estado: LAB ACTIVE V7 / NO PROMOVIDO A PROD.

## Misión y alcance
Una única capa Owner Gateway para datos de empresas, proyectos y motores presentes y futuros. Esta entrega NO promete que todas las empresas o acciones estén ya integradas. Reutiliza FACT-001 GitOps existente en `carlosjmunoz78/capital-mapa-pro`, tablas Supabase existentes y autenticación del propietario. No crea motor adicional, tabla, recurso, suscripción, Worker, cola, credencial ni publicación.

## Evidencia física
1. `cerebro-console-gateway-v36-followups-lab` Supabase **v7 ACTIVE**, con OCHO archivos exactos respecto de PR #56. `cerebro-console-gateway-v0` PROD **v36 ACTIVE**, intacto; App/CRM, DNS, main, WP, Trading sin cambios.
2. GitHub CI [43286219674](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/43286219674): ocho pasos de QA y regresión, todos SUCCESS en HEAD previo.
3. GitHub CI [43286753585](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/43286753585) **SUCCESS** incluyendo prueba HTTP pública real `FACT-001 real public GitOps read smoke` (19:06 UTC): catálogo de diseño **13**; directorios scaffold **6**; no afirmación de runtime.
4. Supabase SQL read-only: `cerebro_company_registry_preprod` **0 registros**, `jarvis_project_overlay_v1` **1 proyecto** (`company_id=fenix`, `project_id=PRJ-SUPERAGENT-001`, estado `PARCIAL`), `cerebro_company_engine_state_preprod` **0 registros**. Estos recuentos se refieren SOLO a estas tablas: no son el censo completo de empresas/proyectos/motores.
5. Fact source: repositorio **público**, rama `cerebro-engine-factory-v0`; JSON `cerebro-os/registry/engine_registry.seed.json` y listado `cerebro-os/engines`. Los 13 del seed y 6 directorios no son necesariamente distintos; ambos representan metadatos, NO ejecución.

## Código y rutas nuevas
En `cerebro/ops/gateway-v36-followups`:
- `owner_access.ts`: capabilities, no autoriza ni lee datos empresariales.
- `owner_scope_registry.ts`: parser determinista de empresas/proyectos, IDs dinámicos, filtrado por identidad validada en servidor.
- `owner_registry_live.ts`: conexiones Supabase SOLO LECTURA con `select`, `eq company_id` y `limit` a las tres tablas; `SOURCE_UNAVAILABLE` si alguna fuente falla, jamás simula. La identidad actual del actor confirma solo `fenix`; para AION/CAPTACASA se debe verificar explícitamente pertenencia antes de consultar sus registros.
- `owner_factory_gitops.ts`: dos URLs HTTPS fijas públicas, GET, esquema estricto, timeout, tamaño y cardinalidad limitados, caché efímera 3 minutos; no token GitHub, no escritura. Separa `FACT_ENGINE_SEED_NOT_RUNTIME_EVIDENCE` de `FACT_SCAFFOLD_DIRECTORY`; evita falsa marca ACTIVE.

Las rutas LAB nuevas son:
`GET /owner-capabilities` — metadatos de adaptadores y bloqueos.
`GET /owner-registry?company_id=fenix&project_id=...` — tabla de empresas, proyectos y estados de motores verificada en servidor, **solo alcance Fénix**.
`GET /owner-factory` — catálogo y directorios reales FACT-001 de GitHub, sin derechos operativos.
`GET /owner-universe?company_id=fenix` — combina ambos en un solo Gateway, devuelve fuentes/errores independientes (estado PARTIAL si falta alguna).
`POST /chat` — consultas naturalizadas de empresas, proyectos y motores se resuelven por estos lectores y distinguen fuentes existentes de pendientes.

## Identidad y seguridad
- Todas las rutas están **después** del `withSupabase({auth:"user"})` y `authorizedOwner(req)` heredados y comprobados byte-exact contra V35.
- Actor `CARLOS-ADMIN` obtenido vía `fenix_prod_actor_context_by_auth_server`; el selector `company_id` es un filtro, nunca un grant.
- `SUPABASE_SERVICE_ROLE_KEY` únicamente en código servidor existente; jamás aparece en respuesta, navegador ni GitHub Actions.
- Las consultas están limitadas a compañía validada `fenix`, `limit 101` con indicador de truncado, saneadas antes de responder y fallan cerradas.
- No se introducen funciones de escritura, coste adicional contratado, permiso Trading ni publicación.
- FACT-001 público no confiere autoridad de ejecución; GitHub OIDC de FACT/UMS sigue totalmente aislado.

## Gate NO SUPERADO (impide promoción)
- La prueba autenticada E2E del propietario en LAB sigue sin completarse: secreto GitHub Actions `CEREBRO_E2E_USER_JWT` devuelve `INVALID_JWT`. La sesión de Opera/App es independiente: no revela ese token al Gateway de GitHub Actions.
- No se ha demostrado E2E positivo de las rutas nuevas dentro de la sesión real del propietario ni su uso desde Operativa/JARVIS/voz.
- No se ha probado todavía el rollback físico V7→V6→V7.
- No están conectados ni verificados el Owner Company Membership multiempresa real ni el Company Registry completo, ni todos los proyectos ajenos a esa tabla.
- No se ha probado disponibilidad HTTP de FACT desde el runtime Supabase; la prueba HTTP real se ejecutó **desde GitHub Actions**. El deploy ACTIVE prueba carga de artefacto, no lectura autenticada de respuesta.

## Recuperación / rollback LAB
Rollback versionado verificable: rama PR #56 commit `0054eb75bb461ae5a06df57c42f58392f7f53740` contiene los **siete** archivos V6 anteriores a FACT. Re-desplegar en el MISMO slug LAB con `verify_jwt=false`, comprobar 7/7 SHA contenido y owner-only; si es seguro, volver a V7 desde HEAD validado. **No se ha ejecutado esta reversión**, y no debe mencionarse como prueba completada. PROD v36 no necesita rollback: permanece intacto.

## Próxima fase de cierre
1. E2E autenticado owner tras renovar de forma segura referencia cifrada o mediante un canal de sesión soportado; no copiar JWT al chat ni desactivar validaciones.
2. Comprobar HTTP desde la Edge Function Supabase y respuestas `owner-registry/owner-factory/owner-universe` con titular real; probar denegación no owner y otra empresa.
3. Registrar pertenencias multiempresa desde una fuente de identidad **autorizada**, conectar nuevas empresas a FACT/Company Registry, y asegurar sincronización sin duplicar objetos. PREPROD no puede autorizar PROD.
4. Unificar interfaz Operativa/JARVIS/otros canales contra el mismo Gateway, con vistas para empresas, proyectos, motores, trabajos, costes, estado y órdenes gobernadas.
5. Backup, rollback probado, OLD vs NEW, E2E, logs, tribunal, presupuesto y gate de promoción; no fusionar ni publicar hasta terminar.

Estado global: **PARCIAL**, progreso real en GitHub/servidor LAB, producción preservada. Coste: cero suscripciones o servicios adicionales creados (consumo normal de CI/free-tier no auditado como facturación).
