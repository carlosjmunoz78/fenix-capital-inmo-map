# CEREBRO Operativa · Private Social Provider · Inventory Contract V0

**Fecha auditoría:** 15 noviembre 2026. **Estado:** LECTURA DE METADATOS DESDE CONECTOR PRIVADO, AUDITORÍA FECHADA EN PREVIEW; SIN EJECUCIÓN NI CONTROL REMOTO.

## Fichas inspeccionadas
- Repositorio privado Social `carlosjmunoz78/fenix-capital-cerebro-social` verificado mediante acceso GitHub del propietario. PR #8 Instagram y #9 Facebook, ambos `OPEN DRAFT`, sin promoción ni merge.
- Archivos fuente de configuración `cloudflare/instagram-autoqual-lab/wrangler.lab.jsonc` y `cloudflare/facebook-autoqual-lab/wrangler.lab.jsonc` inspeccionados dentro de sus ramas; sólo se extrajeron nombres públicos de recursos, booleanos de seguridad, y ausencia de crons. **No se copió el contenido del repositorio privado, secretos, tokens ni código propietario.**
- Cloudflare Account `e39a57e1ac42650ca5a6d5307cf0ac8e`: inspección GET real de script deployments, settings, schedules y subdomains para los dos Workers; 1 deployment por worker, cron vacío, URL workers.dev false, previews false, flags plain_text `AUTOQUAL_ENABLED=false` y `GROQ_ENABLED=false`.
- D1 observadas en la misma cuenta: Instagram `cerebro-instagram-autoqual-lab`, Facebook `cerebro-facebook-autoqual-lab`, ambas con jurisdicción EU. Las UUID de recursos están registradas en el artefacto de auditoría, no son credenciales.
- Metadatos sanitizados: `social-private-meta-audit-2026-11-15.json`.

## Semántica de estado
**PR DRAFT ≠ despliegue desactivado**. El Worker y su D1 existen físicamente; por otra parte, ninguna orden programada por cron figura en esos Workers y AUTOQUAL/GROQ están desactivados. Ello **no demuestra** que todos sus métodos internos sean inertes, ni que el motor tenga cero agentes, cero subagentes o cero trabajos procesados por otros canales. Estado operativo: `RUNTIME_NOT_VERIFIED`; acciones `PAUSE/RESUME/PRIORITIZE/PUBLISH`: `NOT_CONNECTED`.

Los números de agentes/subagentes anunciados en un título de PR, declarados en un catálogo o en roles de fábrica **no se contabilizan como procesos vivos**. Requieren `agent_id`, `subagent_id`, `job_id`, `run_id`, señales físicas, source y TTL.

## Seguridad y aislamiento
- **PROHIBIDO** enviar cookies de GitHub, tokens, secretos o código del repositorio privado a la UI pública. El registro contiene exclusivamente metadatos auditados. El repositorio de Operativa puede ser público: tratar todo lo que se suba como observable por terceros.
- No se modificó el repo Social, PR #8/#9, Cloudflare Worker, D1, accesos, cron, publicación, App/CRM, main o staging.
- Operativa muestra claramente `NO EN VIVO`, con fecha. Permite consultar fichas por conversación, pero nunca envía comandos a los Workers.
- Para convertir la fuente a lectura dinámica: un backend autenticado por propietario con lectura `read-only` del proveedor y permisos específicos del repositorio, caché de corto TTL, auditoría, no exportar material privado. Los conectores de ChatGPT no pueden asumirse accesibles desde Vercel sin un canal de credencial aprobado.
- Cualquier cambio de worker debe tener snapshot de versión **desplegada** y bindings efectivos, contrato OLD, test de integración, coste medido, idempotencia, readback, rollback y tribunal antes de permitir la acción.

## Contrato de evolución
`company_id=fenix, engine_id, environment=LAB, version, provider_worker, github_pr, observed_at, active_version, desired_state, observed_state, active_agent_count:null, active_subagent_count:null, runtime_last_seen:null, control_capabilities:[]`.

**Siguiente gate:** verificar runtime e inventariar los engines fuera de Social, con fuente efectiva y sin convertir la fotografía de configuración en ejecución autónoma. Prohibido habilitar RRSS automáticamente.
