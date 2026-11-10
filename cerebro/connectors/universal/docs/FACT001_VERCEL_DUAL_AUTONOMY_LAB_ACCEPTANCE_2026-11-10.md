# FACT-001 · VERCEL-UNIVERSAL-001 · aceptación ChatGPT + CEREBRO · 2026-11-10

## Estado certificable
- **ChatGPT MCP `Vercel · ChatGPT · Proyecto LAB`: HECHO lectura de equipo, lista de 3 proyectos, creación de proyecto LAB, consulta de despliegue LAB.**
- **MCP `CEREBRO · Vercel Universal` invocado desde ChatGPT: HECHO lista, GET proyecto LAB, PATCH LAB y reversión, creación de despliegue LAB, lectura historial.**
- **CEREBRO Gateway autónomo fuera de ChatGPT: NO VERIFICADO / NO ACTIVADO**. Un MCP con nombre CEREBRO invocado en ChatGPT **NO** es un cliente autónomo.
- **Vercel API adapter de FACT-001: CÓDIGO HECHO; 14/14 tests de adapter + 10/10 regressions Core SUCCESS**; código no conectado a CEREBRO Console ni desplegado con identidad independiente. No afirmar producción completa.
- No se han comprado planes ni modificado proyectos App/CRM, DNS, dominios Fénix o recursos existentes.
- PR #44 DRAFT, rama `cerebro/fact001-cloudflare-universal-dual-lab-v0-20261109`; main intacto.

## Inventario inmutable antes y después
Team `carlosjmunozcabeza-2582s-projects` (`team_qnh6u1Ofy2WPp0MGEKlyMA50`). Usuario `carlosjmunozcabeza-2582`.
1. Existente y protegido `fenix-capital-preprod`, `prj_4ElVl8e2KzrHS7r5yvBGBban1DXV`. **NO TOCAR**, aparece asociado a `app.fenixcapital.es` en navegador.
2. Existente y protegido `fenix-capital-preprod-app`, `prj_tz5NfMwhscoVj2OCBOIvb0oXC6jc`. **NO TOCAR**.
3. NUEVO y sólo LAB `cerebro-fact001-vercel-connector-lab-20261110`, `prj_vvil5epQ99mngK29vpLVOWmlVRP1`. Creado **mediante MCP ChatGPT específico** sin Git ni configuración de dominios de Fénix. Es el único proyecto autorizado para escrituras de FACT-001 Vercel V0. Conservar como fixture de aceptación mientras se desarrollen contratos; eliminación requiere aprobación expresa tras backup.

## E2E físico
1. Ambos conectores `list_projects` devolvieron 3 proyectos después de crear LAB (antes 2).
2. `mcp__Vercel___ChatGPT___Proyecto_LAB__create_project`: creó LAB `prj_vvil5epQ99mngK29vpLVOWmlVRP1`. **PASS**.
3. `mcp__CEREBRO___Vercel_Universal__get_project`: leyó exacto ID LAB. **PASS**.
4. `mcp__CEREBRO___Vercel_Universal__update_project`: `enablePreviewFeedback=true` y, en segunda operación, se restableció a `false` en el mismo ID LAB. No se editaron los otros proyectos. **PASS reversible**.
5. `mcp__CEREBRO___Vercel_Universal__create_deployment`: subió una página estática de prueba `index.html` con `noindex,nofollow,noarchive` y `robots.txt` disallow en el LAB. Deployment `dpl_Ff2mSexUe9KdQ8vLphtYp4zDXbGD`, URL `cerebro-fact001-vercel-connector-lab-20261110-acjglomdh.vercel.app`, **READY** (consultado con los dos MCP). Ninguna credencial ni datos comerciales en el contenido.
6. **EXCEPCIÓN DEL PROVEEDOR**: aunque se solicitó `target='preview'`, el primer despliegue del proyecto sin Git apareció con `target='production'`, y se asignó alias *.vercel.app **exclusivamente al proyecto LAB**. No fue un despliegue de la App real. Una discusión externa reporta que el primer deployment de un proyecto vacío se clasifica siempre Production: https://community.vercel.com/t/first-non-git-post-v13deployments-becomes-production-despite-omitted-target/1000000118 ; **no es confirmación oficial universal**. Antes de permitir despliegues automáticos sobre cualquier proyecto, imponer policy que compare target solicitado + devuelto y prohíba primer deployment salvo fixture LAB aislado, y requerir confirmación post-deploy antes de operaciones posteriores.
7. **DATO CRÍTICO DE ROUTING MCP**: el conector ChatGPT con URL `https://mcp.vercel.com/carlosjmunozcabeza-2582s-projects/fenix-capital-preprod-app` fija el contexto `get_project` al proyecto `fenix-capital-preprod-app`, **ignorando** `idOrName` de otro proyecto en pruebas. NO usar `get_project`/`update_project` contextualizado para operar sobre un proyecto distinto. Para gestión multi-proyecto usar MCP Universal con teamId e IDs explícitos o conectar un MCP distinto con la URL propia de cada proyecto; para escrituras LAB usar solamente el ID exacto y comprobar su eco.
8. Configuración de ChatGPT: `Vercel · ChatGPT · Proyecto LAB` y `CEREBRO · Vercel Universal` constan ambos con modo de permisos **Allow all actions**. Esto evita confirmaciones rutinarias de ChatGPT, pero no otorga permisos OAuth adicionales ni evita gates legales/económicos.
9. La integración oficial `mcp__Vercel__` (distinta de las anteriores) siguió devolviendo `0 proyectos`/404/403 en pruebas previas; **no usar para operar proyectos** hasta resolver scopes o retirarla conscientemente. Mantener ahora sin destruir.

## FACT-001 · código, contrato y pruebas
- `src/vercel-catalog.mjs`: capabilities de inventario y creación/edición LAB, READ de deployment. Los despliegues PREVIEW y operaciones PROD, borrar proyectos, promoción, dominios, Billing permanecen **PLANNED/PARTIAL_NOT_ENABLED** deliberadamente, pese a que los MCP oficiales pueden exponer esos comandos de forma independiente.
- `src/vercel.mjs`: `createVercelAdapter({request})`, sólo transport autenticado inyectado por backend y sin acceso directo a tokens desde modelos. Team ID cerrado, 4D LAB requerido, nombres de proyecto LAB obligatoriamente prefijados, POST sin Git/DNS, idempotencia transaccional por `UniversalConnectorCore`, actualizaciones únicamente al proyecto LAB certificado. Resultado incierto → conciliación antes de repetir.
- `src/catalog.mjs` y `src/core.mjs`: añadidos Vercel sin reemplazar Cloudflare/Opera.
- `tests/vercel.test.mjs`: 14/14 test positivos/negativos, ambos clientes, costes, 4D, no PROD, token injection, idempotencia, reversión. Regresión `tests/core.test.mjs`: 10/10 verde.
- Pipeline [#42805923990](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42805923990) SUCCESS; no APIs reales ni secretos en tests. El E2E del proyecto y despliegue anteriores sí se hizo por API real desde ChatGPT.

## CEREBRO autónomo: bloqueos exactos y secuencia mínima (SIN REPETIR AUDITORÍAS)
1. **Credencial de servicio Vercel**: metadatos `vault.secrets` en ambos proyectos Supabase accesibles no muestran entradas `%vercel%`. Acceso a metadata de secretos de GitHub Actions mediante el conector GitHub devolvió `URL not allowed`; **no se concluye que no exista ningún token en otro Vault**. Operaciones MCP OAuth de ChatGPT NO exportan tokens al backend. El endpoint Vercel REST exige Access Token válido.
2. Verificar existencia de secreto dedicado en el sistema de Vault principal; si falta, el propietario debe emitir una única credencial en `https://vercel.com/account/tokens`, nombre `CEREBRO-VERCEL-SERVICE-V1`, ámbito del team exacto y caducidad adecuada con rotación programada. Guardar **directamente** en Supabase Vault como `cerebro_vercel_service_token_v1` SIN chat/archivo/log ni código; nunca sacar valor. El usuario no tiene que crear 5 conectores extra.
3. Backend LAB privado debe usar identidad `client_id=cerebro`, Vercel Token vía Vault, políticas de team/proyecto exactos, auditoría sin tokens, costes y rollback. Añadir Gateway CEREBRO autenticado y queue/runner; no reutilizar OAuth de usuario de ChatGPT. El actual Cloudflare cron `cerebro-fact001-recovery-runner-lab` demuestra ejecución autónoma **heartbeat interno** únicamente, NO ejecutar Vercel todavía.
4. E2E independiente: encolar READ desde Gateway sin conversación ChatGPT, verificar 3 proyectos; PATCH reversible de atributo sólo en `prj_vvil5epQ99mngK29vpLVOWmlVRP1` usando service token; comparar ambos clientes, probar 401, 403, rate limit, token expirado, desconexión, reintentos GET y writes ambiguas, rollback. Sin plan de pago.
5. Para liberar autonomía de operaciones comerciales/PROD: snapshot, contrato, tests, política y revisión humana sólo excepciones reales, PR, PREPROD aislada, rollback, tribunal, observabilidad y cumplimiento del plan de Vercel.

## Costes y restricción legal del plan
Cuenta identifica **Hobby**, sin cambio de suscripción. Documentación oficial de Vercel (https://vercel.com/docs/plans/hobby) indica hasta **200 proyectos**, límites de cuota y que Hobby está restringido a uso personal y no comercial. El nuevo proyecto vacío/de prueba no aloja operaciones comerciales. **NO asumir que este plan permite alojar de manera comercial App Fénix ni CEREBRO PROD**; antes de uso comercial se requiere aclaración contractual con Vercel o utilizar un proveedor que lo permita, con coste adicional justificado. No comprar/elevar plan automáticamente.


## ACTUALIZACIÓN E2E autónomo firmado · 2026-11-10 11:32 UTC
Sustituye SOLO el estado `NO VERIFICADO` para **CEREBRO service LAB API read+write** en las secciones anteriores. No sustituye las salvaguardas restantes de Gateway/PROD.
- **CEREBRO service independiente**: creado y desplegado `cerebro-fact001-vercel-service-lab` v2, Edge Function nueva y aislada, autentica GitHub OIDC firmado por JWT RSA/JWKS + repo/ref/workflow/aud/event + expiración antes de llamadas. No recibe OAuth de ChatGPT.
- **Vault**: nombre `cerebro_vercel_service_token_v1` confirmado; sólo servicio lee el secreto cifrado y usa token en memoria para REST `api.vercel.com`. El runner de GitHub sólo recibe resultado redactado.
- **E2E READ**: [run #42807524830](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42807524830) SUCCESS; anon 401, falso 401, firmado 200, Vercel GET 200, 3/3 proyectos.
- **E2E WRITE+ROLLBACK**: [run #42808203559](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42808203559) SUCCESS; 8/8 test, framework LAB temporal `null→vite→null`, comprobación posterior mediante GET y proyecto exacto `prj_vvil5epQ99mngK29vpLVOWmlVRP1`, sin despliegues ni dominios ni otras escrituras.
- **Estado actualizado**: `CEREBRO independent service read/write LAB: VERIFIED`; `CEREBRO Console Gateway v33/automatic job queue: NOT CONNECTED`; `Generalized Vercel production writes/autonomy: PENDING`.
- **Runbook y rollback**: [cerebro/connectors/universal/supabase/vercel-service-lab/README.md](../supabase/vercel-service-lab/README.md).
