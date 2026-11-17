# FACT-001 · P3 Vercel identidad y alcance · Estado vivo 2026-11-11

**Estado:** PARCIAL. Se ha demostrado la causa diferencial de acceso a proyectos, sin duplicar proyectos ni modificar despliegues.

## HECHO FÍSICO — DOS CONEXIONES DISTINTAS
- Team exacto `team_qnh6u1Ofy2WPp0MGEKlyMA50`, usuario `carlosjmunozcabeza-2582`.
- Conector oficial genérico `mcp__Vercel__`: `list_teams` encuentra 1 team; `get_team` válido; `list_projects` con team explícito y por defecto retorna **0 proyectos**.
- Conector independiente ya conectado `Vercel · ChatGPT · Proyecto LAB`: `list_projects` con team explícito y por defecto retorna **2 proyectos** reales: `fenix-capital-preprod` (`prj_4ElVl8e2KzrHS7r5yvBGBban1DXV`), `fenix-capital-preprod-app` (`prj_tz5NfMwhscoVj2OCBOIvb0oXC6jc`).
- La identidad de este último cliente coincide con team y usuario correctos, cuenta `Hobby`. Diferencia causada por OAuth/instalación/permisos de conector, no ausencia de proyectos ni error del teamId.
- La conexión alternativa protege la operativa actual de lectura; la antigua no se elimina ni reinstala ciegamente. El `get_project` de la conexión contextual debe respetar el proyecto fijado en su URL, **no** usarse para actuar sobre otro proyecto.
- PAT del servicio independiente `cerebro_vercel_service_token_v1` **presente por nombre en Supabase Vault**. E2E histórico de servicio firmado de lectura/patch reversible/cleanup aislado previo documentado en runbook (no repetir ni crear proyecto LAB innecesario).
- Intento de lectura de deployments con array `projectIds` en conector contextual recibió error 400 de parámetros incompatibles `projectId` implícito vs `projectIds`; no se alteró recurso. Usar el proyecto vinculado al conector o servicio Universal para consultas contextualizadas.

## GAPS
- Corregir el grant OAuth del MCP genérico oficial (0 proyectos) con soporte del proveedor si reaparece tras reautorizar; no reabrir bucles de consentimiento. El MCP contextual ya ofrece lectura real.
- Unir el servicio Vercel de Vault a CEREBRO Gateway y órdenes firmadas, cola durable y rollback del mismo deployment. No inferir derecho a operar producción a partir de ChatGPT OAuth.
- No crear nuevos proyectos ni desplegar en los 2 proyectos existentes protegidos. El plan Hobby aparece en conexión: confirmar derecho de uso comercial antes de alojar cargas comerciales (no comprar plan automáticamente).

## Estado final
`CHATGPT_CONTEXTUAL_VERCEL_READ=VERIFIED_LIVE`, `GENERIC_VERCEL_OFFICIAL_GRANT=DEGRADED`, `CEREBRO_INDEPENDENT_SERVICE=PREVIOUS_EVIDENCE_ONLY`, `GATEWAY_AUTONOMOUS_QUEUE=NOT_VERIFIED`, `PROD=UNTOUCHED`, `ADD_COST=0`.

**Siguiente bloque:** `VERCEL_GENERIC_OAUTH_REPAIR_OR_PROVIDER_SUPPORT_WITH_CONTEXTUAL_MCP_FALLBACK`. No emitir enlaces de consentimiento de 10 minutos hasta interacción humana inmediata; autorizado por proyecto pero conceder acceso a la integración externa requiere flujo personal.
