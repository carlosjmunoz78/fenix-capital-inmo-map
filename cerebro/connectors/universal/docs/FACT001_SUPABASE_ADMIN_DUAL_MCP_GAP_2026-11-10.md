# FACT-001 · Supabase administración completa · corte de aceptación (10/11/2026)

**Estado: PARCIAL — API de Supabase Management verificada, adaptador y contrato probados; gestión física DELETE todavía pendiente de PAT de servicio. NO SUPONER PROD AUTÓNOMO.**

## Contrato y objeto de limpieza
- Proyecto real protegido: `fenix-capital-prod`, ref `cluhljgonannaafpmblx`. **App y CRM no se tocan**; Supabase core transaccional.
- Proyecto secundario visible: `hnqlnvakzaywtafeiybt`; no se modifica.
- ÚNICA función autorizada para probar el borrado: `cerebro-fact001-vercel-service-lab`, ID `f004e7f1-4911-440d-8809-c656f5f89b38`, ACTIVE versión 4 con `verify_jwt:true`, código retirado responde 410, ESZIP SHA256 `eac20084ecf4ce5af0023d966956abc95f480dee26736f2046d92c209fc03154`. Este recurso es solo un experimento eliminado lógicamente, ahora pendiente de eliminación física. Se prohíbe tocar otros Edge Functions.
- MCP oficial ChatGPT `mcp__Supabase__` y `CEREBRO · Supabase Universal` tienen exactamente 36 operaciones, **no exponen `delete_edge_function`**. Ambas se han probado en solo lectura y reconocen la función. Las dos tienen permiso ChatGPT `Allow all actions`. Esto NO crea una operación que la API no expone.
- Supabase Management API oficial: `DELETE https://api.supabase.com/v1/projects/{ref}/functions/{function_slug}`. Autoriza con `edge_functions:write` o PAT con permiso `Edge Functions Read-write` restringido al proyecto. Fuentes:
  - https://supabase.com/docs/reference/api/v1-delete-a-function
  - https://supabase.com/docs/guides/platform/personal-access-tokens
  - https://supabase.com/changelog/scoped-personal-access-tokens-ga
- Token Supabase Management **no puede obtenerse/exportarse desde OAuth ChatGPT**. No usar `service_role` para Management API, y no ejecutar SQL para borrar entidades de la plataforma.

## Evidencia y código implementado
- `src/supabase-admin-catalog.mjs`: lista/get/delete exacto de prueba, deny-by-default para cualquier function/project arbitrario y PROD.
- `src/supabase-admin.mjs`: adaptador inyectable con transport secreto fuera del chat, allowlist proyecto/ID/slug/versión/ESZIP, verificación de ausencia mediante GET 404, idempotencia/auditoría mediante núcleo único.
- `src/catalog.mjs` y `src/core.mjs`: integrado provider `supabase-admin.` en FACT-001 con los mismos contratos duales que Cloudflare y Vercel. **Código de integración preparado, no desplegado como MCP remoto**.
- `tests/supabase-admin.test.mjs`: 10/10 pruebas sintéticas del adapter, 10/10 regresión core, 14/14 regresión Vercel. Workflow [#42814464599](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42814464599) SUCCESS 34/34. **No se ejecutó DELETE físico**.
- `supabase/supabase-admin-once/policy.mjs`, `index.ts`, `tests/policy.test.mjs`: preparación de un solo uso para reutilizar la **misma** Edge Function desactivada, actualizarla a ejecutor que valida GitHub OIDC RS256 firmado + repo/branch/workflow + orden 4D exacta + función ID, leer PAT desde Vault y borrar exclusivamente su propia función mediante Management API. No se ha desplegado esta versión ni activado.
- Pipeline de seguridad [#42815005743](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42815005743) SUCCESS; la ejecución real `.github/workflows/fact001-supabase-admin-delete-once.yml` NO se dispara sin el JSON de orden `requests/delete.v1.json`, aún inexistente.
- Preflight de secretos GitHub Actions [#42813855239](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42813855239) detectó 0 credenciales con nombres típicos; ficheros de prueba temporal retirados.
- Vault `vault.secrets` de dos proyectos conectado no tenía secreto PAT por nombre en inventario al iniciar. **No se leyó valor alguno.**
- Código, pruebas y workflows permanecen exclusivamente en PR #44 DRAFT de GitHub; no merge ni modificación de main.

## HUMAN_REQUIRED único pendiente
1. El propietario crea **PAT scoped** en https://supabase.com/dashboard/account/tokens con nombre `CEREBRO-SUPABASE-MGMT-V1`, **único proyecto `cluhljgonannaafpmblx`**, permiso **Edge Functions: Read-write**; sin Auth/DB/Billing/Project Settings write, sin LEGACY/full access. Caducidad 30 días mientras se prueba y diseña rotación.
2. Se pega directamente en Supabase Vault del proyecto `cluhljgonannaafpmblx`, nombre exacto `cerebro_supabase_management_pat_v1`, https://supabase.com/dashboard/project/cluhljgonannaafpmblx/integrations/vault/overview. **NO en chat/GitHub/código/log**.
3. Verificar solo metadata name/created_at en Vault. Tras ello: desplegar el servidor de un solo uso en la función retirada para que requiera firma GitHub OIDC, comprobar 401 anon/forged y firmado 200, crear orden JSON exacta en PR draft, comprobar eliminación efectiva 404 con MCP oficial y propio. No reintentar a ciegas si la función se autoelimina y cierra la conexión antes de responder.
4. Retirar workflow y ficheros temporales, conservar runbook y tests del provider; PAT se conserva/rota solo tras dependencias documentadas y como mínimo privilegio.

## NO LO LLAMAR «PERFECTO» AÚN
ChatGPT conectado y con permisos amplios ≠ una herramienta de borrado expuesta; code adapter ≠ un servidor MCP instalado. El resultado solicitado de **create/read/update/delete para cualquier recurso y ejecución ordinaria autónoma** necesita un MCP administrativo específico y broker con tokens protegidos, catálogo tipado, IAM, entornos, idempotencia, backup y rollback, costes y observabilidad. Hasta entonces el poder administrativo se mantiene restringido a las operaciones probadas y autorizadas. No alterar Gateway v33 ni App/CRM.

**Coste adicional asumido: 0 €.** No contratar planes, no crear proyectos nuevos de Supabase, no escribir datos de App/CRM.
