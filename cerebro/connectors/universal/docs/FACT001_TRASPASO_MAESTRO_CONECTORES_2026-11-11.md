# CEREBRO OS · FACT-001 · TRASPASO MAESTRO DE CONECTORES CHATGPT + CEREBRO

**Corte de continuidad:** 2026-11-11 · **Empresa:** Fénix Capital · **Entorno de trabajo:** LAB aislado · **Estado:** PARCIAL, no declarar conectores autónomos en PROD.

## 0. Misión, fuente de verdad y reglas de continuidad

Objetivo: cerrar, en este orden, los conectores **Cloudflare, GitHub, Supabase, Vercel, Notion** tanto para (A) **ChatGPT normal / GPTs** como para (B) **CEREBRO Gateway/headless** (órdenes firmadas del propietario y automatizaciones registradas). **Opera/Navegador estrictamente el último**. Nunca tratar acceso MCP desde ChatGPT como prueba de credenciales de servicio de CEREBRO.

**Repositorio canónico:** `carlosjmunoz78/fenix-capital-inmo-map`.
**PR existente:** [#44 · FACT-001 Universal Cloudflare Connector Factory](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/pull/44), **OPEN / DRAFT** al revisar el 11/11/2026, rama `cerebro/fact001-cloudflare-universal-dual-lab-v0-20261109`, HEAD inspeccionado previamente `c8d411092cbd8d5d41a6615c53884f1b6523fd4f` (referencia temporal; reconsultar al iniciar). **NO crear PR o rama paralela ni rehacer estructura existente** sin razón comprobada.

**Fuentes técnicas prioritarias:**
1. `cerebro/connectors/universal/registry/headless-gates.v1.json` — **registro de los 11 gates** por proveedor. Releer del repositorio; los campos de observaciones narrativas pueden estar desfasados respecto al estado real: prevalece evidencia posterior y estado físico vigente.
2. `cerebro/connectors/universal/docs/FACT001_CONNECTOR_AUTONOMY_ACCEPTANCE_ORDER_2026-11-10.md` — orden de aceptación y riesgos.
3. `cerebro/connectors/universal/docs/FACT001_CEREBRO_HEADLESS_5_PROVIDERS_2026-11-10.md` — arquitectura, pilotos y credenciales; sus apartados sucesivos actualizan el estado histórico.
4. `cerebro/connectors/universal/docs/FACT001_CLOUDFLARE_FULL_CRUD_PHYSICAL_GATES_2026-11-09.md`.
5. `cerebro/connectors/universal/docs/FACT001_NOTION_DUAL_MCP_GITHUB_REPO_CREATE_ACCEPTANCE_2026-11-10.md`.
6. `cerebro/connectors/universal/docs/FACT001_VERCEL_DUAL_AUTONOMY_LAB_ACCEPTANCE_2026-11-10.md` y `FACT001_VERCEL_NOTION_CLOUDFLARE_ACCOUNT_BINDING_2026-11-10.md`.
7. `cerebro/connectors/universal/docs/FACT001_SUPABASE_ADMIN_DUAL_MCP_GAP_2026-11-10.md`.
8. `cerebro/connectors/universal/docs/FACT001_NOTION_BATCH_75_100_COMPOSITE_OFFSITE_CAS_VERIFIED_2026-11-11.md` y el archivo de checkpoint, para mantener respaldo Notion sin duplicar trabajo.
9. `cerebro/connectors/universal/docs/CHATGPT_NORMAL_GITHUB_CLOUDFLARE_BRIDGE_LAB_V1.md` — puente ChatGPT read-only LAB probado.
10. Tests, workflows y fuentes de código dentro de `cerebro/connectors/universal/` y `.github/workflows/`; consultar contratos concretos **solo cuando se vaya a intervenir en ellos**.

**Doctrina obligatoria:** CONSERVAR → ENTENDER → ENVOLVER → PROBAR → MEJORAR → MIGRAR. No modificar App Fénix, CRM, Supabase transaccional, WordPress, SEO, Notion histórico, DNS, motores productivos, `main`, Trading ni automatizaciones ajenas. No suscripciones nuevas; comprobar consumo del plan gratuito, no asumir uso ilimitado. Credenciales siempre Vault/backend, nunca chat, repositorios, logs ni navegador frontend. No cambios destructivos sin inventario, contrato, snapshot, test OLD vs NEW, LAB, rollback probado, promoción gradual. No permisos generales ni API billing indebida.

## 1. Estado verificado que NO hay que rehacer

| Área | HECHO/VERIFICADO | PENDIENTE REAL |
|---|---|---|
| Cloudflare ChatGPT | MCP Universal funcional, operaciones de consulta y CRUD **KV/D1 LAB aislados** probados. Puente ChatGPT→GitHub Actions→Cloudflare GET-only también probado. | Emisor de tokens de mínimo privilegio, broker común, lifecycle completo Workers/Pages/Access y gates de cada operación; doble E2E en el Gateway. |
| Cloudflare CEREBRO | Identidad OIDC/Vault y LAB sobre KV/D1/Pages en pruebas físicas; no equivale al Gateway general. | Unir Gateway con el broker, permisos mínimos, cola real, backup/rollback por operación, coste/auditoría. |
| GitHub ChatGPT | Leer/escribir código, ramas, PR; GitHub Actions del repo LAB ha ejecutado workflows. | **Crear repositorios mediante el conector universal dio HTTP 403**; el MCP estándar carecía de operación equivalente en la prueba. |
| GitHub CEREBRO | Token Actions **limitado al propio repo** y CRUD de fixtures en rama LAB. | GitHub App o credencial de servicio con `Repository creation: write` (preferida frente a Administration global), tokens efímeros, permisos cross-repo, crear/gestionar repo LAB, broker y rollback; no inventar derechos. |
| Supabase ChatGPT/CEREBRO | MCP de gestión y lectura, PAT scoped en Vault, E2E anteriores de Edge LAB con limpieza. El broker read-only está desplegado. | Sidecar de gestión **persistente y acotado**, Edge/DB/Storage/Auth con backup/rollback, enlace al Gateway, JWT owner canary. No modificar App/CRM PROD. |
| Vercel ChatGPT/CEREBRO | Pruebas previas de lectura y ciclo de vida de proyecto LAB; token protegido. | Discrepancia real de team: MCP branded devolvió `authorize_team_access` 403 y listados vacíos; autorización del propietario cuando proceda, runner persistente, deploy/rollback completos. |
| Notion ChatGPT | Dos conectores MCP verificaron create/read/update en página LAB; no altera producción. | Ampliar capacidades por acción y permisos, con restauración y sync controlados. |
| Notion CEREBRO | Bot/credencial independiente en Vault acreditado posteriormente, 58/58 raíces conocidas accesibles, búsqueda de **6.632 objetos** (6.446 páginas, 186 fuentes), CRUD/Trash/Restore de hijo aislado probado. | Broker CRUD permanente con identidad propia, órdenes+automatizaciones, sincronización incremental, observabilidad; backup integral, binarios/comentarios, custodia externa clave, restauración física aislada para promover alcance global. |
| FACT-001 runtime | `src/headless.mjs`, `UniversalConnectorCore`, contrato y tests; servicio `cerebro-fact001-headless-provider-lab` **ACTIVE v33** con hash conservado en última comprobación. | Entrada operacional común desde CEREBRO Gateway y ChatGPT, cola/idempotencia/autorización por recurso, control de costes, auditoría duradera, rollback y promoción. |
| Opera / Browser Bridge | Instalaciones inventariadas; antecedentes de Bridge de navegador. | **ÚLTIMO BLOQUE**: reparar `list_tabs` timeouts/binding, luego E2E navegación/clic/escritura/descarga y sesiones autorizadas. NO comenzar antes de cerrar los cinco anteriores. |

**Registro `headless-gates.v1.json` (lectura del 11/11/2026):** todos los cinco proveedores figuran `PARTIAL`: Cloudflare 5/11, Vercel 6/11, Supabase 4/11, Notion 6/11 y GitHub 6/11 según gates formales. No promediar esos valores como progreso global ni sumar tests pasados como cobertura actual.

### Notion: importante para NO repetir ni bloquear indebidamente
- Índice cifrado de 6.632 objetos hecho. **100 primeros objetos de contenido** ya respaldados y cotejados desde Drive: **96 páginas y 4 fuentes**, checkpoint D1 **100/v4** de `cerebro-fact001-notion-checkpoint-lab-eu` (UUID `bc085807-a6ca-4c56-a288-fe56716fec6f`). Cuarto lote 75→100 resuelto por 48 fragmentos de fuente, ZIP cifrado privado [Drive](https://drive.google.com/file/d/1jqCgm1qY2euqCy9uO_KGHrV4hMqSI0BC/view), SHA-256 `8501eb64a02b3bdaa9351fe2c460e81181781e399da7f839f86f0070b1a0c49b` verificado. **No ejecutar 0→100 otra vez**.
- Quedan **6.350 páginas y 182 fuentes de datos** en esa secuencia, más binarios, comentarios, restauración física Notion, escrow de clave. Esto es un proyecto de backup paralelo; **no monopolizar la misión de cerrar conectores**. Promoción de escritura global Notion exige backup suficiente para el alcance real y rollback, pero operaciones LAB aisladas seguras pueden progresar.
- La D1 Cloudflare Free figura **10/10 bases ocupadas**: NO crear otra. D1 recuperación original UUID `1305f791-7c44-47f9-946b-f330a09c88aa` protegida. La exportación SQL nativa antigua devolvió 403 al descargar; no llamar ese SQL externo «verificado». El checkpoint CAS de la D1 separada tiene rollback Time Travel real probado.

## 2. Pendientes priorizados: ejecutar, NO re-auditar

**P0 · Cloudflare + credenciales compartidas (sin compartir identidad):**
- Revisar solo metadatos del emisor Vault `cerebro_cf_account_token_issuer_v1`: se detectaron privilegios excesivos (`Billing Write/Read`, `Integration Write` además de token admin). Diseñar reemplazo/recorte **sin revocarlo antes de verificar sustituto**. HUMAN_REQUIRED únicamente si requiere autorización UI/MFA. No mostrar secretos.
- Broker backend de credenciales con dos identidades separadas: `chatgpt-human` autenticada y `cerebro-service`; tokens hijos mínimo privilegio, scope 4D, RBAC por acción, request_id, anti-replay, idempotencia, auditoría redactada, límites 0 € y controles de permisos. Verificar ciclo token hijo **crear→guardar directamente en Vault→GET acotado→revocar/rotar**; no publicar plaintext.
- Enlazar ChatGPT y CEREBRO Gateway sin sustituir Console/App ni exponer URL pública. Demostrar E2E de ambos clientes, no solo runner OIDC.

**P1 · GitHub:**
- Inventariar **instalaciones existentes** de GitHub App (no instalar nueva de forma automática), comprobar permisos reales y autorizar el menor scope necesario para creación/administración de repos privados autorizados. Preferir token efímero de GitHub App y no PAT permanente.
- Resolver 403 de `POST /user/repos`, demostrar creación/lectura/configuración/borrado o archivado seguro de **un repositorio LAB nuevo** con snapshot/evidencia; acceso multi-repo, ramas, PR, workflows, secretos write-only, protección de main y retorno. No utilizar repo público para evitar cuota de Actions de privado.

**P2 · Supabase:**
- Reutilizar broker/Vault conectados, exponer adaptador acotado a Edge Functions/Storage/DB/Auth con canary y rollback. Mantener Supabase principalmente transaccional, no cargar logs/Training. Verificar owner JWT canary antes de CEREBRO Console. SIN tocar PROD de App/CRM.

**P3 · Vercel:**
- Resolver el team/account real y `authorize_team_access`. Si requiere URL de consentimiento con expiración breve, **generarla solo cuando el usuario pueda abrirla**; explicar una sola acción humana. Verificar proyectos/roles primero y lifecycle de recurso LAB aislado, evitando dominios/configuración existente.

**P4 · Notion:**
- Convertir el CRUD de hijo LAB ya verificado a operador **persistente** con permisos por página, firma de órdenes, auditoría, idempotencia y rollback; probar solo capacidades NUEVAS (no repetir create/edit/trash/restore ya verificados salvo regresión necesaria de código). Configurar sincronización incremental y conflicto; backup largo por flujo separado, sin bloquear el cierre de los otros conectores.

**P5 · Runtime común + E2E dual y autonomía:**
- Una sola capa compartida Gateway/UniversalConnectorCore/FACT-001, no cinco servidores duplicados. Entrada `source=owner_order|automation`, identidades verificables, cola duradera, reintentos limitados, registro de jobs, supervisor, costes y tribunal. Distintos permisos LAB/PROD. Prueba de una orden por proveedor y una automatización de LAB, con evidencia externa, backup y rollback.
- ChatGPT normal y GPTs deben poder enviar la orden por conector autorizado; CEREBRO debe ejecutarla con credencial **propia**. Separar capacidades realmente disponibles de las `NOT_SUPPORTED` por API o plan.

**P6 · OPERA SÓLO CUANDO P0–P5 estén verificados:**
- Reparar dos instalaciones / `list_tabs` timeout / `browser_id` binding, Bridge, primero read/navigate, después click/type/forms/download, sesiones login manual/2FA. No afirmar automatización universal de navegadores por disponer del conector.

**Otros conectores solicitados** (WordPress/Cowboy MCP, Google Drive, Gmail, Calendar, RRSS, etc.): inventariar **sin distraerse de los cinco principales**, conservar conexiones existentes; ejecutar una segunda ola solo tras cerrar el núcleo. No utilizar WPVibe ni Make para sustituir el plugin propio cuando ya se prohibieron.

## 3. Definición física de «conector LISTO»

Para cada proveedor y cada cliente (ChatGPT vs CEREBRO): inventario de cuenta/roles/alcance, identidad mínima verificable, lectura, nueva creación LAB y CRUD por capability soportada, prueba negativa de permisos, backup/snapshot, rollback/rebuild, límite económico probado, auditoría y observabilidad, cola e idempotencia, ejecución por orden y automatización, política de promoción y pruebas de compatibilidad con entorno existente. Marcar por **capability**, no «proveedor entero FULL» porque exista un catálogo API. Las operaciones no soportadas por plan/API deben aparecer expresamente como `NOT_ENTITLED` / `UNSUPPORTED`, no inventarse. En PROD jamás promover un operador si falta cualquier gate para esa operación.

Estados obligatorios en respuestas: **HECHO / EXISTENTE / PARCIAL / DEFINIDO / PLANIFICADO / POR AUDITAR / BLOQUEADO**. HUMAN_REQUIRED solo `LEGAL_REQUIRED`, `SIGNATURE_REQUIRED`, `LOW_CONFIDENCE`, `HIGH_RISK`, `POLICY_CONFLICT`, `SECURITY_INCIDENT`, `MONEY_LIMIT`, `CUSTOMER_HUMAN_REQUEST`; consentimientos propietarios imprescindibles pueden encuadrarse en estos motivos sin pedir permisos repetidos. No fingir que una prueba de otro día sigue vigente; lectura ligera de metadatos de estado no es «repetir auditoría».

## 4. Antibucle y ejecución sin esperas

- **NO** empezar con inventarios globales, investigaciones generales, rediseñar Factory o repetir pruebas verificadas. Leer registro, PR y documento; **un preflight de estado mínimo** y luego trabajar sobre primer bloqueo real.
- **NO** reabrir/crear otra PR, otra base D1, servidores por motor ni artefactos redundantes.
- No repetir pruebas ya verdes de la misma capacidad salvo cambio relevante o necesidad de nueva evidencia por seguridad; nuevas pruebas **solo diferenciales**.
- Ejecutar por bloques hasta cerrar el objetivo dentro de permisos y herramientas disponibles; si hay HUMAN_REQUIRED, dejar preparada la operación concreta y seguir otros bloques independientes. No prometer trabajo asíncrono por ChatGPT; automatizaciones solo si se configuran efectivamente.
- Actualizar **en cada bloque** `registry/headless-gates.v1.json`, runbook, contratos, PR/CI, coste, backup, rollback, estado de autonomía y este traspaso. Regresar con resultado físico, bloqueo específico o siguiente operación concreta.

## 5. Primer movimiento EXACTO del siguiente chat

1. Abrir esta ruta en PR #44 y la versión actual de `headless-gates.v1.json` (no reconstruir documentos).
2. Confirmar PR sigue DRAFT, rama LAB vigente, broker antiguo preservado, permisos existentes, D1 checkpoint 100/v4. **Esto es una comprobación breve, no repetir pruebas.**
3. Ejecutar **`CF-TOKEN-ISSUER-001_P0_SCOPE_CORRECTION_AND_LAB_BROKER`**: acotar emisor/broker Cloudflare con mínima credencial y prueba real del token hijo, sin imprimir secretos, sin tocar producción.
4. Continuar inmediatamente con GitHub, Supabase, Vercel, Notion, runtime E2E; **Opera último**.
5. Guardar evidencia nueva en esta rama DRAFT y documento; hacer seguimiento de lo que se ha completado y lo que está bloqueado. Revisión adicional de seguridad antes de activar PROD autónomo.

**Referencia del traspaso:** `cerebro/connectors/universal/docs/FACT001_TRASPASO_MAESTRO_CONECTORES_2026-11-11.md`.

## Actualización 11/11/2026 · CF-TOKEN-ISSUER-001 · comprobación LIVE de mínimos permisos

HECHO: lectura directa oficial de Cloudflare: 3 tokens activos; el emisor v1 mantiene 7 permisos, incluidos Billing Write/Read e Integration Write. Se identificó el grupo exacto `Account API Tokens Write`, se conserva v1 íntegro y se añadió guardia determinista fail-closed en la misma PR DRAFT. **Ningún token emitido, revocado o mostrado.**

PARCIAL/BLOQUEADO: la emisión de v2 y el ciclo de token hijo requieren ruta servidor con custodia directa Vault, sin exponer respuesta plaintext; ver `docs/FACT001_CF_TOKEN_ISSUER_P0_LIVE_METADATA_2026-11-11.md`. El registro conserva todos los gates anteriores sin aumentar cobertura. Los demás proveedores deben continuar por su orden independiente; Opera sigue el último.


## 11/11/2026 · CF-TOKEN-ISSUER-001 · gate LIVE bloqueado por delegación del proveedor

Reutilizado el issuer LAB existente (no se crearon D1/Workers), 22/22 tests CI; candidaturas Edge v5 y v6. Prueba OIDC física con rechazo `ISSUER_GROUP_NOT_SELECTABLE` al intentar que el emisor v1 cree su sustituto v2 con `Account API Tokens Write`. El secreto v2 no existe en Vault y el padre NO está revocado. No insistir ni ampliar permisos. Se retira el disparador de workflow v2; el rollback del runtime LAB original fue **bloqueado por seguridad de la herramienta**, no se puede declarar ejecutado. Ver `docs/FACT001_CF_TOKEN_ISSUER_P0_LIVE_METADATA_2026-11-11.md`. P1–P4 deben continuar independientemente; Opera continúa en P6.


## 11/11/2026 · P1 GitHub · comprobación diferencial sin repetir POST 403

Usuario GitHub y 3 instalaciones de Apps detectados. El servicio de la Factory no tiene todavía `cerebro_github_factory_pat_v1` ni credencial GitHub App en Vault; los metadatos de instalaciones no exponen scope de creación. Se conserva la prueba anterior `POST /user/repos => 403` sin reiterarla ni crear repositorios. P1 admin global **BLOQUEADO POR PERMISO**, CRUD de rama LAB existente conservado. Runbook `docs/FACT001_GITHUB_FACTORY_PERMISSION_P1_2026-11-11.md`. P2 Supabase continúa independientemente.


## 11/11/2026 · P2 Supabase

Reverificado solo el nombre del PAT scoped en Vault y el servicio LAB `cerebro-fact001-headless-provider-lab` ACTIVE v33 con hash conocido, sin mutaciones. Se conserva E2E anterior de borrado acotado; falta operador CRUD permanente para Edge/Storage/DB/Auth, cola y Gateway/owner JWT. Estado **PARCIAL**, sin conceder servicio administrativo al frontend. Ver `docs/FACT001_SUPABASE_MGMT_P2_2026-11-11.md`.


## 11/11/2026 · P3 Vercel: descubrimiento diferencial de conexión

El MCP oficial genérico Vercel ve team correcto pero 0 proyectos; el MCP contextual YA conectado `Vercel · ChatGPT · Proyecto LAB` ve los 2 proyectos reales en el mismo team (IDs cotejados). **No duplicar proyecto ni repetir OAuth indefinidamente.** Service token `cerebro_vercel_service_token_v1` existe en Vault por metadata; no se leyó. Sin cambios de despliegue, dominio ni suscripción. Estado P3 PARCIAL. Ver `docs/FACT001_VERCEL_ACCOUNT_BINDING_P3_2026-11-11.md`.


## 11/11/2026 · P4 Notion · sincronización incremental en candidato LAB

Se conservó íntegramente el backup de primeros **100 objetos**, checkpoint D1 `100/v4`, sin repetir. Reutilizado el operador gobernado candidato y su cola OFF ya existentes. Añadido exclusivamente un planificador `notion-incremental-sync.mjs` de reconciliación por hashes/snapshots de hijos LAB aprobados: `UNCHANGED`, cambio local pendiente de orden firmada, cambio remoto pendiente de snapshot, conflicto por cambios simultáneos/papelera. No toca páginas de Notion ni incrementa cuota; no copia contenido ni credenciales. [CI físico #42991251014](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42991251014): **156/156 pruebas headless PASS**, además 22/22 emisor, 5/5 registry, 8/8 onboarding, 4/4 scaffold, 0 FAIL. Persistencia del operador, write Gateway, cola y recuperación global NOT VERIFIED. `docs/FACT001_NOTION_INCREMENTAL_P4_2026-11-11.md`.


## 11/11/2026 · P5 Entrada común de 5 conectores · CI GREEN, runtime OFF

Añadido `services/provider-headless-lab/fact001-dual-read-ingress.mjs` como **módulo candidato read-only** para aceptar órdenes de inventario de Cloudflare/GitHub/Supabase/Vercel/Notion usando el mismo contrato LAB, identidades `chatgpt-human` / `cerebro-service` comprobadas por verificador EXTERNO, `owner_order` / `automation` registrada, 4D, idempotency, hard-cost 0 y encolado + auditoría como transacción de un adaptador durable obligatorio. El módulo NO hace llamadas a proveedores ni a Vault; queda OFF y sin ruta en Gateway/Console hasta implementación física de autenticación + D1 queue + reconciliación. [CI #42991696940](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42991696940): **164/164 pruebas headless**, más 22 issuer, 5 registry, 8 onboarding, 4 scaffold, cero fallos. No confundir `writeAtomic` simulado en unit tests con una cola durable instalada. El soporte a mutaciones PROD y a ejecución autónoma sigue **BLOQUEADO** por gates de proveedores/recuperación. Documentado en `docs/FACT001_P5_DUAL_GATEWAY_ADMISSION_2026-11-11.md`.

## P6 OPERA · NO INICIADO

Orden conservado: **Opera después de los cinco conectores y P5**. No se ha consultado ni manipulado Opera/Browser, pestañas, sesiones, clics o archivos en este bloque; quedan para una ejecución posterior una vez cerrados los gates anteriores. No usar Opera para resolver silenciosamente el token-issuer P0 saltando el orden.


## FACT-001 · CIERRE FÍSICO P0 CLOUDFARE V2 · 11/11/2026 · PREVALECE SOBRE BLOQUEOS ANTERIORES

**HECHO:** El propietario creó el emisor `cerebro_cf_account_token_issuer_v2` y guardó su valor directamente en Supabase Vault. Desde ChatGPT Cloudflare Universal se confirmó el token de cuenta y se retiró su permiso superfluo `Account API Tokens Read`; el token v2 tiene exactamente `Account API Tokens Write`, y ningún privilegio de Billing, Integration, DNS o Workers. No se rotó ni imprimió el secreto.

**CEREBRO LAB INDEPENDIENTE:** Edge Function `cerebro-fact001-cf-issuer-lab` usó GitHub OIDC RS256 (repo, rama, workflow, issuer, audience, expiración y actor exacto `carlosjmunoz78`) para obtener v2 desde Vault. [Prueba 42993618913](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42993618913) confirmó su permiso efectivo. [E2E 42994346869](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42994346869) confirmó creación de un **solo** token D1 Read, custodia Vault directa, GET D1 HTTP 200, administración de tokens DENEGADA, revocación efectiva, GET D1 HTTP 401/403 y token eliminado del listado. 27/27 pruebas del emisor.

**CLEANUP Y ROLLBACK:** Borrados únicamente los dos secretos Vault efímeros del hijo ya revocado; v2 y otros secretos intactos. Worker/D1/DNS y proyectos previos no modificados; **10/10 D1 se conservan**. La versión v9 del servicio y el commit de E2E se guardan en historial; el servicio aislado LAB pasó a **v10 ACTIVE READ-ONLY** con exclusivamente `/health` y `/verify-scoped-issuer-v2`, accesibles solo con identidad OIDC firmada. [Run 42995197342](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42995197342) confirma verificación v2 HTTP 200, anónimo/falso 401, cuatro rutas antiguas de escritura HTTP 404 y cero secretos expuestos. CI 164 headless + 29 issuer + 5 registry + 8 onboarding + 4 scaffold PASS.

**RIESGOS RESIDUALES:** emisor v1 **todavía activo con privilegios excesivos**; no revocar sin inventario/contrato/consumidores, backup y confirmación de que no quedan dependencias. Un cliente ChatGPT OAuth y una identidad firmada GitHub LAB son clientes distintos, pero **NO** demuestra enlace desde la Console/Gateway PROD. La cola autónoma, remediación, Workers/Pages full CRUD y promoción a PROD permanecen pendientes. Por lo tanto **TOKEN-ISSUER-001 = HECHO en LAB** y **CLOUDFLARE UNIVERSAL = PARCIAL**, no VERIFIED_FULL.

**Runbook y contratos:** `docs/FACT001_CLOUDFLARE_V2_E2E_CIERRE_2026-11-11.md`, `registry/cloudflare-issuer-v2.v1.json`, `supabase/cf-token-issuer-lab/README.md`. **Opera no se ha tocado.**


## Actualización diferencial 11/11/2026 · Cloudflare v1 y Gateway real

**HECHO VERIFICADO EN VIVO:** El emisor v1 ya figuraba `disabled`, con permisos reducidos a Tokens Write/Read, al iniciar el bloque. NO se revocó ni modificó ahora; ID conservado, último uso 08:49:44 UTC. V2 activo, mínimo, Vault y E2E del token hijo correctos. En Cloudflare D1 Recovery se comprobó físicamente `FACT001-CF-GW-SIGNED-20261111-001` `COMPLETED`, attempts=1, config `enabled=1,max_jobs_per_tick=1` y Worker Cron cada cinco minutos con binding correcto. Canary owner independiente ACTIVE v6; Gateway principal ACTIVE v33 intacto. **No existe prueba E2E de JWT real del propietario desde Console**, ni cobertura FULL de Workers/Pages/rollback. Estado Cloudflare **PARCIAL**, Token Broker y heartbeat firmado LAB **HECHO**. Evidencia `docs/FACT001_CF_GATEWAY_LEGACY_CUTOVER_DIFFERENTIAL_2026-11-11.md`. Opera continúa P6.


## P0 Cloudflare comprobado · cierre de turno 11/11/2026

P0 gestor mínimo de tokens en LAB = **VERIFIED_LAB**. E2E servicio firmado y cola D1 ya existentes, prueba repetida tras v1 disabled, fila `COMPLETED` attempts=1. CI **230/230** PASS [#43005472015](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/43005472015), Gateway principal v33 intacto. **FULL universal sigue PARTIAL**: sesión real propietario no accesible desde la conversación (navegador sin contexto origen), Gateway Console a canary no enlazado, proveedor mutaciones/rollback/política PROD no verificados. Ver `docs/FACT001_CLOUDFLARE_P0_CIERRE_Y_GATE_OWNER_2026-11-11.md`. No pedir más token, no inventar identidad ni relajar gates. La prioridad de proyecto P5 Gateway permanece separada de P0 emisor; GitHub P1 puede comenzar si se toma P0 en su alcance aprobado, sin decir que Cloudflare FULL universal está terminado.


## DECISIÓN TRANSVERSAL APROBADA · HEADLESS PRIMERO / CONSOLE DESPUÉS · 11/11/2026

**Definido:** todos los conectores Cloudflare, GitHub, Supabase, Vercel y Notion deben completarse y probarse como servicios ejecutables **sin depender de CEREBRO Console inacabada**. Dos entradas ahora: motor CEREBRO con identidad propia, tareas aprobadas/políticas/cola y acciones desde ChatGPT con consentimiento y permisos efectivos; más adelante CEREBRO Console se conecta al mismo Gateway sin reconstrucción. El JWT de la Console solo es gate de su interfaz futura, **no gate de aceptación del backend**. Persisten los gates por proveedor para CRUD, backup/rollback, auditoría, límites y autonomía REAL; no falsear `VERIFIED_FULL`. Contrato, secuencia, estados y exclusiones en `docs/FACT001_CONECTOR_HEADLESS_PRIMERO_CONSOLA_DESPUES_2026-11-11.md`. Estado transversal `DEFINED`, no suponer que el runtime ya está implementado.


## FACT001 Cloudflare · LAB Workers/Pages lifecycle físico 11/11/2026

ChatGPT Cloudflare OAuth, bajo orden del propietario: Worker exclusivo de prueba **CREADO → VERSIONADO V2 → ROLLBACK V1 100% → ELIMINADO → RECONSTRUIDO → ELIMINADO**; GETs confirmaron 404 no público, cero binds/crons, 13 Workers finales. Proyecto Pages exclusivo **CREADO → SETTINGS MODIFICADOS → SETTINGS REVERTIDOS → ELIMINADO**, dejando el único proyecto previo intacto; nunca se desplegó página. CEREBRO headless aún no posee ejecutor independiente demostrado para estas operaciones, por lo que Cloudflare universal FULL **PARCIAL**. Se confirma doctrina del propietario: CEREBRO debe orquestar JARVIS, App, CRM, webs, SEO, GPT/agents y todas las empresas mediante contratos y adaptadores, no romper sistemas preexistentes. Evidencia: `docs/FACT001_CF_LIFECYCLE_WORKERS_PAGES_E2E_2026-11-11.md`.


## FACT001 Cloudflare headless 11/11/2026 · Bloqueo de plataforma e infraestructura preparada

E2E CEREBRO OIDC firmado funcional, pero emisor mínimo v2 NO delega Workers Scripts Write (Cloudflare POST HTTP400). Cloudflare OAuth administrativo emitió token temporal de Workers Scripts Write, lo verificó y revocó. El intento posterior de custodia automática de la credencial por la herramienta fue bloqueado por control de seguridad: **NO eludir**. Worker exclusivo privado `cerebro-fact001-headless-operator-lab-20261111` instalado **OFF sin cron, secreto ni exposición**. D1 Recovery existente creó solo tabla aditiva `fact001_cf_headless_worker_jobs_v1`, job QUEUED attempts=0, bookmark previo respaldado. CI operador PASS. Ningún token hijo residual, ni Worker objetivo. Cloudflare universal **PARCIAL / bloqueo de provisión segura**, no conectar Console ni avanzar por error a FULL. Detalle en `docs/FACT001_CF_HEADLESS_AUTH_POLICY_BLOCKER_2026-11-11.md`.


## RESULTADO FÍSICO · Cloudflare CEREBRO headless · 11/11/2026

**WORKERS ONE-SHOT VERIFIED_LAB**. Se ejecutó físicamente el cron aislado del Worker `cerebro-fact001-headless-operator-lab-20261111`, con secreto Cloudflare `CF_WORKERS_TOKEN` de tipo `secret_text` introducido por el propietario, unido a la D1 LAB preexistente. El primer fallo inicial quedó archivado; se corrigió `fetch` `redirect:'error'` → `redirect:'manual'` (runtime Workers) y se acreditó previamente un GET HTTP 200 desde el Worker con el secreto sin revelar su valor. Se reencoló una única vez tras reconciliación y comparación de estado.

**D1 result**: `fact001_cf_headless_worker_jobs_v1`, `FACT001-CF-HEADLESS-CRON-E2E-20261111-001`, `state=COMPLETED`, `attempts=1`, `phase=CREATE_UPDATE_ROLLBACK_DELETE_REBUILD_DELETE`, `error_code=NULL`. API Cloudflare GET final: Worker desechable `cerebro-fact001-owned-worker-lab-20261111` ausente; 14 Workers totales, incluyendo el nuevo ejecutor privado. Cron de prueba `/schedules` explícitamente desactivado y verificado vacío; `workers.dev` y previews OFF. Token de servicio `CEREBRO-FACT001-CF-WORKERS-LAB-V2` activo con único grupo `Workers Scripts Write`, cuenta fija y `expires_on=null` (sin vencimiento programado, **no** garantiza disponibilidad de por vida). No nuevas D1 ni suscripciones; no cambios en App/CRM/DNS/main ni otros Workers.

**Aún PENDIENTE**: dispatcher genérico de órdenes CEREBRO multiempresa, Pages deployment/rollback vía headless, política de PROD, recuperación/observabilidad longitudinal, gestión de rotación de tokens. **Cloudflare Universal FULL sigue PARTIAL.** No confundir verificación del *subgate Workers one-shot* con producto terminado.


## 11/11/2026 · FACT001 Cloudflare Workers autónomo reutilizable VERIFICADO LAB

Nuevo runtime privado `cerebro-fact001-headless-operator-lab-20261111` con cola durable D1, cuatro operaciones Workers propiedad del motor, 6 órdenes físicas culminadas `COMPLETED` a un intento, sin errores ni recursos de prueba sobrantes. Ingreso directo de ChatGPT autorizado + ingreso nuevo GitHub OIDC firmado mediante `cerebro-fact001-cf-command-intake-lab` con secret D1 Vault. Cron permanente LAB cada 5 min. No PROD, main ni App/CRM afectados. Universal Cloudflare **PARCIAL**: Pages headless y demás permisos/auditoría/procedimientos por cerrar. Evidencia completa `docs/FACT001_CLOUDFLARE_WORKERS_REUSABLE_COMMAND_E2E_2026-11-11.md`.
