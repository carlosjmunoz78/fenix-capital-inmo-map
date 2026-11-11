# FACT-001 · Aceptación dual de conectores sin interfaces · 11/11/2026

**Estado del sistema:** `PARCIAL_CON_GATES_IDENTIFICADOS`. Separa `ChatGPT_normal_conectores` de `CEREBRO_headless_service`; no presentar OAuth/identidad ChatGPT como credencial de CEREBRO. No fusionar PR #44 ni habilitar PROD por esta acta.

## Alcance y baseline

- Repo: `carlosjmunoz78/fenix-capital-inmo-map`, PR #44 DRAFT, HEAD `47fdd9a8df6ca21bfe3e7a6402eabead1a687f90` antes de este documento. Último CI observado: **30 success, 2 skipped, 0 failed, 0 pending**; workflows específicos de broker pasaron **270 tests Node, 0 fallos**, más SQLite SQL/CAS en memoria. No equivalen a despliegue E2E del nuevo módulo.
- App, CRM, SEO, WordPress, Trading, DNS, GitHub main, Supabase existentes y Vercel preprod son **recursos protegidos**. Ningún cambio de producción autorizado por este registro.
- Coste de nuevas suscripciones permitido: **0 €**. Cloudflare Free D1 10/10: **no crear otra D1**. Supabase: solo dos proyectos protegidos ya existentes, **no crear un tercero**.

## Matriz de aceptación (no falsear FULL)

| Proveedor | ChatGPT normal | CEREBRO sin interfaz | Evidencia y bloqueo residual |
|---|---|---|---|
| Notion | MCP CEREBRO Universal autenticado; CRUD sintético histórico | Servicio Vault Notion y restauración+re-Trash sintética reales; cola firmada LAB sintética, copia cifrada 100/6632 objetos accesibles | **PARCIAL**: exportación integral de contenidos/adjuntos/comentarios, custodia independiente de clave, restore completo, cola autónoma de operaciones de páginas y promoción no verificados. `docs/FACT001_NOTION_BATCH_75_100_COMPOSITE_OFFSITE_CAS_VERIFIED_2026-11-11.md`. |
| Cloudflare | OAuth Universal autenticado, GET/gestión LAB limitados | OIDC firmada, Vault, D1 privado, Workers lifecycle 6/6, Pages ajustes 4/4, D1 lógico 4/4; Gateway real propietario pendiente | **PARCIAL**: Pages contenido deploy/rollback, rotación de credencial long-lived, escalado multiempresa y owner session. `registry/headless-gates.v1.json`. |
| Vercel | **CEREBRO · Vercel Universal** puede listar los tres proyectos; **Vercel genérico** enumera cero para el mismo equipo | OIDC+Vault; 4/4 LAB órdenes de lectura, configuración, rollback, deployment-list, 5 eventos | **PARCIAL**: LAB `prj_LxPzJA5AkHJvhYzTAbVJbRrAvvLu` verificado `framework=null`, `SSO enabled deploymentType=all`, cero despliegues, no publicación pública. Genérico precisa aprobación OAuth de equipo; enlace de un solo uso generado en chat, NO almacenar URL temporal aquí. Deployment real protegido/rollback no verificados. |
| Supabase | Universal conectado: dos proyectos `ACTIVE_HEALTHY`; acceso administrativo sujeto al permiso de cada acción | Vault Management PAT; broker `cerebro-fact001-headless-provider-lab` ACTIVE v33 **read-only**; nuevo plan + D1 ledger + metadata readback en PR, NO desplegado | **PARCIAL**: 110 Edge Functions PROD intactas; función sintética `cerebro-fact001-sb-mgmt-canary-lab` ausente. D1 schema NO aplicado. La función actual `cerebro-console-gateway-v0` v33 intacta. Crear/actualizar/borrar+rollback físico pendientes. Hallazgo separado RLS 8 tablas SEO de otro proyecto, HIGH_RISK, no corregido. |
| GitHub | Usuario y 3 instalaciones visibles; operaciones sobre repositorio/PR/archivos soportadas, PR #44 DRAFT | `GITHUB_TOKEN` OIDC scoped al repo y Vault candidato; gestión account-wide / crear nuevos repos NO validada | **PARCIAL**: POST anterior `/user/repos` 403, no repetir. Requiere GitHub App / PAT con `Repository creation: write` (o `Administration: write` donde proceda) y credencial de servicio con alcance mínimo. Instalaciones: 105406507, 176939652, 177545321; listado no expone sus permisos. `docs/FACT001_GITHUB_FACTORY_PERMISSION_P1_2026-11-11.md`. |
| Opera Browser | 2 instalaciones elegibles; una devolvió pestañas mediante `list_tabs`, la otra hizo timeout de 30s; ninguna pestaña modificada | Browser Bridge histórico, pero sin E2E en esta comprobación del adaptador persistente headless independiente | **PARCIAL**; no automatizar clicks de login, credenciales ni sesión por el mero hecho de que el MCP de ChatGPT lea pestañas. Trabajar tras cierre de cinco APIs. |

## D1 Recovery: prueba de recuperación — BARRERA REAL

- Cuenta Cloudflare: `e39a57e1ac42650ca5a6d5307cf0ac8e`.
- D1 existente EU `cerebro-fact001-recovery-lab-eu` UUID `1305f791-7c44-47f9-946b-f330a09c88aa`. **24 tablas de usuario** al inventario de exportación; Cloudflare metadata también puede contar tablas SQLite internas.
- Bookmark previo a la exportación: `00000192-00000000-00005120-d94117d608c971748f2a9344b2d84c48`. **No restaurar globalmente** este bookmark: revertiría también datos de Notion/Vercel que no pertenecen al módulo Supabase.
- API oficial `POST /accounts/.../d1/database/{id}/export` completó con `status=complete`; devolvió `signed_url` temporal. Descarga desde entorno del conector devolvió **HTTP 403**. **NO se obtuvo un archivo SQL** ni se verificó SHA/restauración física; no almacenar ni publicar URL firmada.
- Resultado: `EXPORT_COMPLETE`, `BACKUP_SQL_DOWNLOADED=false`, `RESTORE_TESTED=false`, `SUPABASE_D1_MIGRATION=BLOCKED`. No interpretar marcador Time Travel como rollback físico de tablas en D1 compartida.
- CI de `supabase-mgmt-edge-d1-ledger.mjs`: éxito en SQLite in-memory **NO** desbloquea DDL real ni operaciones externas. El módulo solo genera planes y tiene `executed=false`.
- Reanudación sin romper: descargar vía medio privado con acceso autorizado, cifrar y conservar fuera de D1, SHA exacto y prueba de restauración en recurso aislado o equivalente, después aprobación del tribunal; *nunca* revertir la D1 Recovery completa para deshacer una sola migración.

## Permisos y acciones humanas de alcance limitado

1. **Vercel genérico:** el enlace oficial de consentimiento para equipo `team_qnh6u1Ofy2WPp0MGEKlyMA50` fue generado mediante `authorize_team_access`, validación por propietario pendiente. Es temporal (10 min) y no va a archivos, logs, GitHub ni Notion.
2. **GitHub Repo Factory:** conceder a la instalación autorizada el permiso de creación de repositorios para la cuenta titular; verificar credencial backend antes de crear un único repositorio temporal y probar su limpieza. No habilitar administración indiscriminada.
3. **CEREBRO Console:** una orden real de propietario debe tener sesión/atestado válido al cruzar Gateway; token de servicio nunca debe suplantar la sesión del propietario. Interfaz visible no es requisito para la cola interna, pero la vía OWNER E2E está PENDING.
4. **Supabase SEO HIGH_RISK:** 8 tablas con RLS off y anon/auth CRUD, más funciones/vistas privilegiadas; consumidores, backup y rollback todavía no acreditados, así que no modificar derechos por esta tarea.

## Próxima ejecución corta y verificable

- **P0:** resolver export privado y backup recuperable de D1 Recovery; *si sigue 403*, NO aplicar DDL en la D1 compartida.
- **P1:** Cloudflare+Vercel+Notion: usar los runners LAB ya existentes para probar operaciones aún pendientes sin recrear recursos ni alterar los aceptados.
- **P2:** GitHub repo-creation scoped credential por aprobación del titular una vez, con ciclo de recurso nuevo y borrado verificado.
- **P3:** Supabase Edge únicamente `cerebro-fact001-sb-mgmt-canary-lab` y estricta verificación física de create/update/rollback/delete tras preflight/restorable backup; NO App/CRM/SQL/Storage/Auth.
- **P4:** Opera: elegir instalación realmente activa y probar control independiente con seguridad y auditoría, distinto de MCP ChatGPT.
- **FINAL GATE:** 11 exigencias por proveedor según `registry/headless-gates.v1.json`, COST=0 y QA OLD vs NEW, tribunal, rollback, observabilidad y aceptación física. Cualquier falta -> `PARCIAL`, no `VERIFIED_FULL`.

**Intervención realizada por este documento:** documentación únicamente, en rama DRAFT. Sin ruta pública, credenciales, cambios de recursos ni promociones.

## Continuación posterior · recuperación D1, Vercel y Opera · 2026-11-11

Esta ampliación es evidencia física adicional **sin modificar ni invalidar** el acta original. Estado global: **PARCIAL**, no FULL; las interfaces de consola quedan explícitamente fuera de este ciclo, pero los gates de seguridad y recuperación NO se dispensan.

### D1 Recovery · Descarga alternativa y restauración de estructura (PASS)
- Se aisló el HTTP 403 del entorno de descarga del conector Cloudflare Universal; la misma exportación **solo esquema, sin datos** se descargó desde GitHub Actions por HTTPS con HTTP **200**.
- Runner privado respecto a secretos de Actions, repo PR DRAFT. El workflow solo usa `CEREBRO_CLOUDFLARE_API_TOKEN` secreto existente. No registra token, URL firmada ni SQL, no retiene archivo, no modifica tablas y limita el tamaño de descarga.
- SHA256 del esquema SQL de **13.371 bytes**: `4dfe7b88962813e6874ce920035cf89f5726d66e0a235a75d187e7fbf4bac11b`.
- Reproducción efímera en SQLite `:memory:`: **23 tablas usuario restauradas**; comparación de nombres con el D1 LIVE **23/23 PASS**. La tabla `_cf_KV` es interna de Cloudflare y queda fuera de la exportación.
- CI: [esquema, restore y parity #43109577679](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/43109577679) **SUCCESS**; seguridad de broker en [#43109577707](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/43109577707) **SUCCESS**. Código: `.github/workflows/fact001-d1-export-network-diagnostic.yml` y `services/provider-headless-lab/tests/d1-export-network-diagnostic.mjs`.
- **NO CERRADO:** exportación **de datos completos**, custodia cifrada privada/offsite, clave de restauración independiente, restauración de datos real en recurso aislado y comparación de filas. No ejecutar migración DDL ni rollback global de la D1 compartida sobre esta evidencia de esquema.

### Vercel · despliegue protegido y rollback LAB (PASS en cliente ChatGPT)
- Equipo único `team_qnh6u1Ofy2WPp0MGEKlyMA50`; proyecto LAB exclusivo `prj_LxPzJA5AkHJvhYzTAbVJbRrAvvLu`, **sin enlace Git ni dominios Fénix**.
- Preflight antes del despliegue: `framework=null`, `ssoProtection={enabled:true,deploymentType:'all'}`, cero despliegues, `live=false`.
- V1 `dpl_DCk7j7wNbeaHmFc28CQ8b8DwHU9z` creada `READY`, V2 `dpl_AdnFjkCYenNU3e7fiAp6PgcoamcZ` creada `READY`. Contenido HTML sintético sin clientes, `noindex`, `robots.txt` disallow, sin contratos externos.
- **Advertencia comprobada:** Vercel clasificó el primer deployment como `target=production` **dentro del proyecto aislado LAB** pese a solicitar `preview`. Policy necesaria: bloquear despliegues automáticos de primer recurso que puedan exponer activos; exigir SSO all + comprobación de target devuelto.
- `request_rollback` a V1 ejecutado. Readback `list_deployment_aliases`: **V1 tiene los dos alias del proyecto; V2 ninguno**. SSO permaneció all. Dos deployments sintéticos conservados como historial LAB bajo protección; no desplegar ni alterar App/CRM ni producción de Fénix.
- **NO CERRADO:** ejecutar el mismo deployment/rollback desde el **servicio CEREBRO OIDC + Vault** en lugar del conector ChatGPT, control de consumo/respaldo, limpieza de versiones con API limitada y aprobación OAuth del Vercel genérico (sigue 0 proyectos frente a 3 de Universal). NO declarar FULL.

### Opera · lectura/navegación real, cierre restringido
- Instalación `5171b7ce-0de0-4792-93a9-ea5bf64ab645`: listado, apertura de una pestaña sintética `https://example.com/`, recuperación real del árbol accesible, navegación final a `about:blank`.
- `close_tab` está **deshabilitado por el propietario en la extensión**; intento denegado por el propio MCP. Pestaña sintética creada `1381967525` permanece abierta en blanco, sin credenciales ni acciones comerciales. No tocar las otras pestañas.
- Instalación `14a97edc-b6f9-44aa-b42b-6bec6e3aa4f8`: timeout persistente. Browser Bridge de CEREBRO headless sigue SIN E2E autónomo.
- Para cierre de prueba hace falta que el propietario active permiso `close_tab` en la extensión Opera o cierre manualmente la pestaña de prueba; no forzar control.

### Gates no cubiertos por la excepción «consola»
- Notion: copia integral de 6.632 objetos, adjuntos/comentarios, clave escrow y restore real todavía sin prueba.
- GitHub: permiso mínimo de creación de repositorios para identidad de servicio sigue no acreditado; no se ha creado repositorio ni elevado permisos.
- Supabase: gestión Edge function sintética + rollback/delete sin backup completo recuperable de D1 y gate de riesgo no permitida; App/CRM permanecen intactos.
- Cloudflare: recuperación **de datos**, no solo esquema; costos y políticas por operación; Service IAM más independiente.
- Vercel: OAuth genérico y ciclo de despliegue **desde CEREBRO** pendiente, aunque el ciclo desde ChatGPT ya está probado en LAB.
- Opera: `close_tab` disabled, otra instalación timeout, headless Bridge sin demostrar.
- `CEREBRO Console` y su interfaz son excepción **solo de UI**; no sirve para saltarse permisos, identidad, backups, evidencias, tribunal o recuperación.

**Estado aceptado:** `FACT001_CONNECTORES_DUAL_PARCIAl_CON_CLOUD_D1_SCHEMA_PARITY_GREEN_Y_VERCEL_PROTECTED_ROLLBACK_GREEN`. PR #44 sigue DRAFT y sin merge. Ninguna nueva suscripción, ni alteración de App, CRM, DNS, WordPress, Notion comercial, Trading, otras D1 o proyectos Vercel Fénix.
