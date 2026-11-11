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