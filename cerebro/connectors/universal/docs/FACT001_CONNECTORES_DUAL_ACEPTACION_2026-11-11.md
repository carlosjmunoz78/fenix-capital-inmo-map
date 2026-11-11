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