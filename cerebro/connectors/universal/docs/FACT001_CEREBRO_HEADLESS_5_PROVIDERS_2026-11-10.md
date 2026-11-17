# FACT-001 · CEREBRO sin consola · cinco conectores · 2026-11-10

## Objetivo de negocio
CEREBRO puede ejecutar por (A) órdenes expresas del propietario y (B) automatización registrada, sin depender de la interfaz de la consola ni de OAuth de ChatGPT. Estos dos modos usan las **mismas políticas** con identidades distintas. ChatGPT opera por su propio conector; no se le transfieren las credenciales a CEREBRO.

## Hecho hoy, no equivalente a PROD
1. CREADO `src/headless.mjs`: entrada unificada sin interfaz, recibe `source=owner_order|automation`, `company_id`, `engine_id`, `environment`, `version`, `capability`, `input` e `idempotency_key`. Identidad verificada **externamente**, no aceptada del input; orden de propietario precisa prueba firmada y automatizaciones identidad registrada.
2. Reutiliza `UniversalConnectorCore` existente, su autorización de permisos por recurso, evaluación de riesgo, control de coste, idempotencia durable, auditoría sin secretos y denegación de mutaciones PROD por defecto. **No se ha alterado el núcleo existente** ni desplegado un nuevo servidor.
3. `tests/headless.test.mjs`: 11 pruebas de firmas/políticas/scopes, incluidas suplantación, entrada manipulada, autonomía registrada, PROD, costo a través del núcleo.
4. `registry/headless-gates.v1.json`: 11 gates por proveedor. El estado **VERIFIED_FULL** está prohibido sin todas las pruebas reales; no mezclar prueba OAuth de ChatGPT con credenciales del servicio CEREBRO.
5. `tests/headless-registry.test.mjs`: 5 pruebas del registro y protección contra falsos VERDE.
6. `.github/workflows/fact001-headless-five-connectors-lab.yml`: CI, prueba cruzada del núcleo Vercel/Cloudflare y **GET real GitHub API con GITHUB_TOKEN del runner**; no usa OAuth ChatGPT ni despliega/crea/baja recursos.
7. EVIDENCIA: [GitHub Actions #42819828134](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42819828134), 11+5+10+14=**40 tests PASS**, y `FACT001_GITHUB_SCOPED_REPO_READ=PASS`.
8. Branch aislada DRAFT en repo `carlosjmunoz78/fenix-capital-inmo-map`; `main`, App, CRM, DNS y recursos productivos **sin modificaciones**.

## Estado por proveedor (hechos históricos frente a ejecución actual)
- **Cloudflare**: OAuth ChatGPT en MCP, token de LAB independiente en Vault y pruebas OIDC de D1 Read pasadas previamente. FALTA broker general autorizado, workers/DNS/Access full permission, backup/rollback y producción.
- **Vercel**: E2E real anterior de creación/modificación/despliegue/rollback de configuración y borrado en LAB. Tras petición de limpieza, se eliminó el proyecto LAB y el servicio temporal; por tanto **no hay un runner Vercel permanente conectado a CEREBRO**. Token de servicio protegido en Vault.
- **Supabase**: E2E de DELETE de función de prueba por API Management vía OIDC independiente, verificado 404; artefactos de un solo uso retirados. PAT Scoped protegido en Vault. FALTA broker permanente, contrato general para Edge Functions, Storage, DB, Auth, backups y rollback.
- **Notion**: doble MCP probó CRUD de página aislada **dentro de ChatGPT**, después retirada a la papelera. FALTA identidad/token independiente del servicio CEREBRO y CRUD autónomo, backup/restore y permisos por página.
- **GitHub**: lectura real automática por `GITHUB_TOKEN` del propio repo en Actions sin OAuth ChatGPT. La creación de repositorio privado desde `CEREBRO · GitHub Universal` falló anteriormente con 403; acciones de administración multi-repo para CEREBRO requieren credenciales/instalación con permisos explícitos, test de crear/borrar repositorio aislado, protección de ramas, backup y rollback.

Inventario de nombres de secretos (sin leer valores) de Vault del proyecto `cluhljgonannaafpmblx` en fecha de comprobación: `notion_names=0`, `github_names=0`, `cloudflare_names=3`, `vercel_names=1`, `supabase_names=1`. **No se concluye inexistencia de tokens en otros sistemas**.

## Qué hará verde de verdad
Una capa **headless** de comandos y trabajos, con un solo runtime compartido; fuentes: órdenes del propietario firmadas, reglas y schedules; identidad de servicio distinta por proveedor; token en Vault (o GitHub App token efímero), políticas deterministas, scopes por empresa/motor/entorno/versión, catálogo create/get/update/delete + restore; instrumentación y reconciliación física. Para proveedores sin API se requiere navegación humana-asistida gobernada y con controles, no suponer equivalencia con permisos API.

Prioridad: no contratar ni desplegar servidores duplicados, conservar `main`/App/CRM, no introducir PROD writes sin snapshots/contratos/tests/rollback, usar HEADLESS en paralelo antes de diseñar nueva UI. Si una capacidad requiere autenticar servicio Notion/GitHub, la operación inicial del propietario puede ser HUMAN_REQUIRED, **no pedir autorización repetidamente** una vez delegada.

## Qué no significa
- 40 tests y GET GitHub independiente **no** habilitan cinco proveedores en modo full.
- OAuth concedido a ChatGPT no autoriza por sí solo acceso a la API por el proceso autónomo.
- La consola incompleta **no** es bloqueo estructural: backend y trabajos pueden continuar sin ella.
- El módulo `src/headless.mjs` es un **contrato probado y todavía no conectado a un broker** de producción. No publicarlo como operativa autónoma general.


## ACTUALIZACIÓN FÍSICA · 10/11/2026 · 15:00 Europe/Madrid — PREVALECE SOBRE ESTADO ANTERIOR

### HECHO — servicio único headless LAB v6
- Supabase Edge Function nueva y aislada `cerebro-fact001-headless-provider-lab`, ID `25201bb2-4e03-49c8-ae33-0d92fa27f04c`, versión **6 ACTIVE**, autentica firmante GitHub OIDC RS256/JWKS con repo/rama/workflow/audience/actor/exp; `verify_jwt=false` de Supabase pero **custom OIDC obligatorio en todas las rutas**.
- Trabaja sin consola ni OAuth de ChatGPT: lee credenciales únicamente desde Vault para Cloudflare, Vercel y Supabase; no expone valores al runner. Origen `owner_order`, company/engine/environment/version fijos para LAB.
- [E2E de lectura independiente y planificación física #42837159597](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42837159597) SUCCESS: firma válida, anon/falsa 401, Cloudflare 9 D1, Vercel 2 proyectos, Supabase 101 Edge Functions; genera **18 archivos reales** por orden para `social-instagram` (departamento INTERNO, NO API social) y `nueva-web`, sin ejecutar cambios en proveedores.
- [E2E Cloudflare Pages #42838699207](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42838699207) SUCCESS: la identidad independiente de CEREBRO creó, leyó y eliminó un proyecto Pages LAB con dominio automático `pages.dev`. Inventario confirmado tras prueba: exactamente **un proyecto original** `fenix-capital-inmo-map`, cero proyectos temporales. **No se desplegó un sitio web completo ni se modificó DNS**.
- La primera prueba Pages falló al confundir el dominio `pages.dev` propio con un dominio personalizado. El proyecto temporal se retiró después de comprobar nombre, fecha, origen sin Git ni deployment. Se corrigió el contrato, se pasó el test y la nueva prueba terminó verde.
- Tras el éxito, el endpoint de escritura temporal `/pages-lifecycle` fue **RETIRADO** del servicio en v6, junto con su disparador en GitHub. Los tests de módulo se conservan en DRAFT. El servicio v6 ejecuta únicamente inventario de 3 proveedores y `/plan`. No queda Pages test residual.
- [CI del broker #42839182943](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42839182943) SUCCESS; [CI núcleo 5 conectores #42839411018](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42839411018) SUCCESS. `main`, App, CRM, DNS y proyectos operativos sin cambios.
- Estado por capacidad actualizado: `registry/headless-gates.v1.json`. Ningún proveedor está marcado `VERIFIED_FULL`; la evidencia es precisa y limitada.

### CEREBRO / CHATGPT: estado honesto de 5 proveedores
- **Cloudflare**: API ChatGPT Universal GET/write disponible según permiso; CEREBRO headless read/plan y LAB Pages create/read/delete físico; historial LAB D1 y KV; **falta** Workers/Pages deployment completo, mods arbitrarias, backup y rollback, cola automática, quota guard duradero y PROD.
- **Vercel**: ChatGPT MCP reads/writes conocidas; CEREBRO signed service read, historial de reversión y eliminación LAB; proyecto temporal y antiguo servicio write eliminados; **falta** operador de escritura genérico persistente y despliegue seguro.
- **Supabase**: ChatGPT MCP 36 operaciones, sin delete Edge Function nativo; CEREBRO ha ejecutado DELETE real vía PAT scoped y OIDC en test (y retiró su ejecutor temporal); actual headless GET; **falta** management API universal permanente + seguridad para DB/Auth/Storage y su rollback.
- **GitHub**: CEREBRO repo-scoped GitHub Actions `GITHUB_TOKEN` [#42821755132](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42821755132) creó/leyó/actualizó/eliminó fixture en rama LAB y comprobó 404; **NO** demuestra crear/borrar repositorios ni permisos cross-repo. GitHub universal ChatGPT tiene `create_repository`, pero no `delete_repository` expuesto; una comprobación anterior de creación devolvió 403.
- **Notion**: CRUD de página aislada vía OAuth ChatGPT historicamente verificado, papelera limpia; **no hay credencial de servicio CEREBRO propia verificada**. Nunca utilizar OAuth exportado del cliente ChatGPT.

### HUMAN_REQUIRED real para autorización inicial sin insistencia posterior
- Notion: instalar/autorizar una **integración de servicio** con permisos limitados al espacio de trabajo requerido, registrar el token en Vault sin compartirlo en chats ni logs. La identidad OAuth ChatGPT NO equivale a identidad de CEREBRO.
- GitHub: definir **GitHub App de servicio** o mecanismo equivalente con permisos administrativos de repositorios autorizados, credencial rotatoria y eliminación segura; el `GITHUB_TOKEN` de Actions solo opera sobre su propio repo, por diseño.
- No permitir permisos universales destructivos sobre `main`/PROD de forma indiscriminada; promover por operaciones después de snapshots y pruebas. El hecho de que ChatGPT tenga "Allow all actions" no amplía los endpoints de los MCP ni los scopes reales.

### Gates restantes
No hay cola duradera única de trabajos automatizados por empresa, no hay E2E de `source=automation` en servicios reales, faltan gestión integral CRUD de varios productos, replay/idempotencia entre proveedores, backup/rollback/rebuild, medición de costes y promoción PROD. Los módulos de planificación y lógica NO significan que el sistema ya ejecute cualquier tarea. No contratar planes de pago ni duplicar motores.


## CIERRE ACTUAL · 10/11/2026 · prueba física de credenciales de servicio GitHub y Notion
- **Servicio FACT-001 headless v7 ACTIVE**, `cerebro-fact001-headless-provider-lab`; la ruta `/service-identity` requiere el mismo GitHub OIDC RS256 (repo/branch/workflow/actor exactos), 4D, orden de propietario y proveedor fijo. Solo `GET` de identidad, sin mutaciones ni exposición de credenciales.
- `service-identity.mjs` implementa futuras credenciales independientes: `cerebro_notion_service_token_v1` para un bot de integración de Notion, y `cerebro_github_factory_pat_v1` para una identidad GitHub con permisos acotados. No usar OAuth de ChatGPT como credencial de CEREBRO. La identidad por GET **no verifica derechos de administración**.
- Prueba real: [GitHub Actions #42843856351](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42843856351), workflow **SUCCESS**: lectura independiente Cloudflare/Vercel/Supabase `PASS`, generación de 18 archivos `PASS`, identidad Github **HUMAN_REQUIRED** y Notion **HUMAN_REQUIRED** con motivo `SERVICE_INTEGRATION_CREDENTIAL_NOT_CONFIGURED`, secretos nunca impresos. Este resultado **no es FULL GREEN**.
- Verificación Vault (solo nombres, sin descifrar) en proyecto `cluhljgonannaafpmblx`: ninguno de los dos nombres de servicio nuevos existe. Proyecto secundario `hnqlnvakzaywtafeiybt` tampoco declara secretos coincidentes. El hecho de que Notion tenga bots ya registrados no da acceso a sus secretos a CEREBRO.
- Requisito inicial humano único Notion: crear/autorizar una integración interna o dotar al servicio de una integración ya existente, otorgar permisos mínimos de lectura, inserción y actualización sobre un **espacio FACT-001 aislado**, y poner su token en Vault como `cerebro_notion_service_token_v1`. Confirmar bot y permisos por API física antes de publicar CRUD.
- Requisito inicial humano único GitHub: crear una credencial de servicio aprobada (GitHub App con permisos de repositorio suficientes, o PAT fine-grained temporal de administración + creación de repositorios para `carlosjmunoz78`), y guardar la credencial temporal en Vault como `cerebro_github_factory_pat_v1` (sin valor en el chat). GitHub App es la evolución deseada por rotación; no confundir `GITHUB_TOKEN` repo-scoped de Actions con permiso para administrar todos los repositorios.
- Para Notion y GitHub, `GET identity = VERIFIED` no es `CRUD GREEN`: debe probarse creación/lectura/modificación/eliminación/restauración y rol limitado en LAB, con idempotencia duradera, auditoría y recuperación.
- No se tocaron `main`, App, CRM ni DNS. No se generaron ni dejaron bases, webs, páginas o repositorios de test. No se contrató servicio de pago.


## NOTION: TOKEN Y PÁGINAS · CIERRE 10/11/2026
- Supabase Vault confirma secreto `cerebro_notion_service_token_v1` por metadata, sin revelar valor.
- [#42849043493](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42849043493): servicio CEREBRO independiente validó el bot Notion por su API, sin OAuth de ChatGPT.
- Servicio headless v8 ACTIVE incorpora `notion-workspace`: búsqueda acotada de objetos accesibles con token de Notion Vault, sin exponer páginas, nombres ni secretos.
- [#42849882515](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42849882515): firma válida, búsqueda Notion HTTP 200, `NOTION_WORKSPACE_READ=VERIFIED`, pero **0 páginas visibles** para la integración.
- HUMAN_REQUIRED: compartir una única página separada `CEREBRO OS · FACT-001 · LAB` en Notion mediante `••• > More > Connections > Add connections` y elegir el bot recién creado. No hace falta otro token.
- PENDIENTE: verificar nueva página en lectura y permisos de crear/editar/archivar/recuperar subpágina de LAB, después dejar limpieza y rollback físicos. No marcar FULL GREEN por solo conectar.


## NOTION · E2E ESCRITURA INDEPENDIENTE Y LIMPIEZA · 10/11/2026
- [E2E lectura Notion tras vincular Wiki #42852197701](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42852197701): el token de servicio propio de CEREBRO encontró 2 páginas accesibles (antes 0).
- [E2E Notion child CRUD #42853530709](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42853530709): la propia credencial Notion Vault de CEREBRO creó una única subpágina temporal bajo Wiki Fénix Capital, la leyó, modificó su título, la envió a la papelera y verificó `in_trash`/archivo por GET de la misma página. **No modificó contenido de la Wiki** ni páginas previas. Notion conserva elementos temporalmente en su Trash por diseño; no se ha probado eliminación permanente.
- Se probó el módulo aislado `notion-lifecycle.mjs` y las comprobaciones de error/identidad. La versión activa de `cerebro-fact001-headless-provider-lab` pasa de v8 a **v10**, sin la ruta de escritura temporal; el workflow de un solo uso deja de llamar `/notion-lifecycle`. Queda lectura/planificación e identidad protegidas con GitHub OIDC.
- Estado de Notion en `registry/headless-gates.v1.json`: 6/11 gates verificados para el alcance aislado; **no** equivale a workspace completo, CRUD sin límites, autoschedules, restore validado ni políticas PROD. Toda nueva página raíz requiere permiso explícito de integración Notion o mecanismo admin permitido por el plan.
- PR #44 DRAFT. Ningún merge a `main`, App/CRM/DNS conservados. No suscripciones ni costes adicionales.


## NOTION · RESTORE EN AISLAMIENTO (10/11/2026 · 17:48 CET)
- **HECHO EN CÓDIGO/CI, NO EN NOTION LIVE:** añadido `services/provider-headless-lab/notion-restore-lab.mjs` y 6 pruebas en `tests/notion-restore.test.mjs`. El helper acepta solo una página de prueba existente con UUID explícito, parent Wiki Fénix Capital, título exacto `FACT001 CEREBRO Notion LAB CRUD temporal 20261110 verificado`, y estado previo de papelera; rechaza otras páginas y exige autenticación de servicio independiente.
- La operación prevista es `GET wiki → GET subpágina trashed → PATCH in_trash=false → GET lectura confirmada → GET propiedad revalidada → PATCH in_trash=true → GET limpieza confirmada`. En fallo incierto tras el PATCH, vuelve a consultar el objeto y trata de devolverlo a papelera, **sin declarar éxito si falla limpieza**.
- **EVIDENCIA CI:** [run #42858193784](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42858193784) SUCCESS sobre commit `aa4fc39840f290e283bc1b7dc3e11612db098754`: 36/36 broker tests (6 nuevos), 5/5 registry, 8/8 Cloudflare onboarding y 4/4 scaffold. Total 53/53 PASS, 0 FAIL.
- **SIN DESPLIEGUE:** módulo NO importado en `index.ts`; servicio headless ACTIVO v10 mantiene su allowlist sin rutas temporales de escritura. No se alteró ninguna página de Notion en este bloque. No elevar a 7/11 ni afirmar RESTORE LIVE.
- **BLOQUEO ESPECÍFICO:** el UUID de la subpágina que el E2E #42853530709 dejó en Trash no se incluyó en su salida ni en el contrato, y la búsqueda del cliente ChatGPT en páginas archivadas no la devolvió. Evitar repetir create/read/update/trash y, sobre todo, evitar restaurar una página ajena por coincidencia de título.
- **NEXT_BLOCK ÚNICO:** recuperar el ID exacto del objeto de prueba mediante una vía oficial/autorizada, verificar su parent y título, y efectuar una sola restauración+re-Trash física con credencial de servicio en un endpoint de LAB one-shot controlado; retirar la ruta después. Si ese ID no es recuperable, considerar un nuevo fixture sintético únicamente dentro de un procedimiento E2E explícitamente aislado, con reconciliación y limpieza, sin tocar contenido existente.
- Estado global Notion: **6/11 GATES FÍSICOS**, recuperación LIVE PENDING, broker persistente y PROD pendientes. PR #44 DRAFT, sin cambios en main/App/CRM/DNS, sin coste adicional contratado.


## NOTION · RESTORE REAL CEREBRO INDEPENDIENTE — CIERRE 10/11/2026

### HECHO Y FÍSICAMENTE VERIFICADO
- Como el UUID de la prueba anterior #42853530709 no estaba conservado en la evidencia, se creó **exactamente una nueva subpágina de prueba vacía**, propiedad del flujo, bajo Wiki Fénix Capital. UUID: `41481b1a-756d-8119-b1fa-c38a9d013a35`. ChatGPT Notion Universal la creó y la envió a Trash; el contenido existente de la Wiki no se editó.
- El **servicio independiente de CEREBRO**, `cerebro-fact001-headless-provider-lab` v11 temporal, usó su propia credencial Notion desde Supabase Vault y GitHub OIDC RS256 del workflow exacto, sin OAuth ni token de ChatGPT, para restaurar **esa página exacta** (PATCH `in_trash=false`) y enviarla otra vez a Trash (PATCH `in_trash=true`), con GET de verificación entre ambos estados y al final.
- **E2E físico:** [GitHub Actions #42859689267](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42859689267), SUCCESS. Registros semánticos: `FACT001_NOTION_RESTORE_ANON_401=PASS`, `FACT001_NOTION_RESTORE_FORGED_401=PASS`, `FACT001_NOTION_RESTORE_FOREIGN_PAGE_403=PASS`, `FACT001_NOTION_INDEPENDENT_RESTORE=PASS`, `FACT001_NOTION_RESTORE_HTTP=200`, `FACT001_NOTION_RESTORE_FINAL_TRASH=true`.
- Comprobación independiente mediante Notion Universal `fetch` por UUID: página marcada `deleted` y situada bajo Wiki Fénix Capital. Los demás contenidos permanecen fuera del test.
- **RETIRO REAL Y ROLLBACK:** tras E2E, la Edge Function quedó `v12 ACTIVE` con exactamente **el hash de bundle original v10** `911cde5f28cf816096f82815cb5754330ebfb041290d477d2de6f43031694c49`, 8 ficheros originales y ninguna ruta `notion-restore-once`. Se retiraron también el disparador y la orden JSON de un solo uso de la rama DRAFT. El helper de restauración y sus 6 tests se conservan para futuras certificaciones, pero **no se sirven en LAB activo ni PROD**.
- El primer intento de empaquetado v11 rechazó la ausencia de `notion-lifecycle.mjs` antes de desplegar; después se añadió la dependencia, se desplegó v11 una sola vez y se obtuvo E2E verde. No hubo escritura Notion en el intento fallido.
- No se ha tocado `main`, App, CRM, DNS ni recursos productivos ajenos. No se han contratado planes ni habilitado servicios de pago.

### ESTADO PRECISO
- **RESTORE FROM TRASH en un hijo aislado: CONFIRMED_OPERATIONAL en LAB.** Se ha probado también su limpieza final real.
- **NO es Full Notion:** backup completo, restauración de versiones históricas, eliminación permanente, cobertura de todo el workspace, cola autónoma, ejecución de escrituras permanente y promoción PROD **siguen pendientes**.
- **Registro mantiene 6/11 gates plenamente VERIFICADOS.** `backup_and_rollback=PARTIAL_LAB_TRASH_RESTORE_ONLY`; no convertir una restauración individual en backup/rollback global.
- `next_block`: cerrar broker CRUD permanente con permisos por página, idempotencia auditable, backup/restore real, observabilidad y activación autónoma solo tras política de producción, sin repetir los tests ya superados.
