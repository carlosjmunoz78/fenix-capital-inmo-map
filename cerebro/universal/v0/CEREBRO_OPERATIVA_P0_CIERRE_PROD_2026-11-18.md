# CEREBRO OS · OPERATIVA P0 · CIERRE DE PUBLICACIÓN PROD · 2026-11-18

**ESTADO COMPROBADO: HECHO · OPERATIVA P0 CONECTADA EN PRODUCCIÓN (alcance de directorio y actividad real).**  
**NO DECLARAR: 2506 motores activos, ejecución autónoma de todos los perfiles ni cobertura completa de servicios.**

## Publicación y fuente

- App: `https://app.fenixcapital.es/cerebro?section=operativa&op3_panel=agentes`
- Vercel alias `app.fenixcapital.es` → `dpl_HfPBticPdGX2fjhyqvvQrbYT8E4e`, estado `READY`, project `prj_4ElVl8e2KzrHS7r5yvBGBban1DXV`.
- **SHA exacto de código construido, probado y publicado:** `ad010a3fb7e27da61f061d944f83b8af3835de70`, rama `cerebro/operativa-runtime-p0-fix-20261118`, PR #78 DRAFT (sin fusionar).
- Despliegue anterior conservado: `dpl_CQuh9UYH68JYHkTcaGcvXEq7fz5h` (`7163dccd962a19fbd5301b14fcacacf08b7245ea`), `READY`.
- Gateway actividad compartida entre OPERATIVA, NEURONAL y JARVIS: Edge Function Supabase existente `cerebro-console-activity-v0`, versión **10 ACTIVE**, `verify_jwt=true`, código SHA256 `08c33889f71df9374400fb07d27a0f9d05fd7518a078dddc99a196226129a012` (misma fuente funcional que versión 8 reparada). Conserva autorizaciones de propietario.
- No modificar Auth, DNS, CRM, WordPress, Trading, Workers, PR #76 ni PR #77.

## Pruebas físicas positivas

1. GitHub PR #78, SHA publicado: **29 checks SUCCESS, 1 SKIPPED, 0 FAILURES, 0 PENDING**. Incluye OLD vs NEW, regresión completa, contrato runtime, backend de owner y seguridad, QA de fallback.
2. GitHub Actions `44288787233`: [test del artefacto exacto](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/44288787233) **SUCCESS**. Construyó `ad010a3...` en Vercel con `--prod --skip-domain`; probó con usuario autorizado REAL: lectura 200 del directorio, empresa distinta `aion` denegada 400, método POST 405, acceso anónimo Supabase 401, fuente GitHub validada 200.
3. GitHub Actions `44289712801`: [smoke post-promoción PROD](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/44289712801) **SUCCESS**, realizado contra `https://app.fenixcapital.es` con el secreto E2E actualizado y sin imprimirlo. Verificó `page.total=2506` para filtros globales; `runtime_source.status=ACTIVO`, `observed_at` con antigüedad menor a 20 minutos; `read_only=true`, `executed=false`, sin afirmaciones de perfiles activos no vinculados.
4. Mismo smoke PROD: `company_id=aion` → 400, POST → 405, acceso sin bearer → 401. Las rutas `/inicio`, `/expedientes`, `/contactos` → HTTP 200. Son **smokes de disponibilidad de rutas**, no certificación funcional exhaustiva del CRM.
5. Opera autenticado en stage anterior: OPERATIVA y NEURONAL obtuvieron metadatos reales desde `CEREBRO_CONSOLE_ACTIVITY_V0` (observación 11:19 Madrid). En el dominio PROD la API ha superado el smoke autenticado; no se realizó una nueva interacción visual completa con sesión propietaria en producción.
6. Antes de promoción se ensayó alias PRIVADO `fenix-capital-prep-git-b38c9b-carlosjmunozcabeza-2582s-projects.vercel.app`: mover al candidato y restaurar el origen → comprobación de ambos estados correcta. **No** se ensayó rollback moviendo el dominio PROD.

## Contratos y conteos

- 2506 = perfiles lógicos; **0** perfiles con identidad exacta de ejecución acreditada en la prueba anterior. Un motor relacionado en actividad no convierte sus roles en activos.
- Inventario puntual anterior: 45 Cloudflare Workers y 118 Supabase Edge Functions `ACTIVE`; despliegue de un Worker o una Edge Function no prueba un trabajo en ejecución.
- Cloudflare exact ENGINE_ID detectados en LAB (Facebook e Instagram) continúan `INACTIVO` y sin cron: no se han promovido.
- `company_id`, `engine_id`, `environment`, `version`, `status`, `observed_at`, `last_run`, `last_run_result`, `runtime_id`, `provider`, `source`, `evidence`, `error_code`: contrato disponible cuando existe evidencia de fuente.
- Las observaciones del feed llevan tiempo y procedencia; sus valores varían y no constituyen un inventario universal. Si una fuente cae, se debe mostrar `DEGRADADO` y nunca falsificar actividad.

## Rollback

- Si falla el nuevo despliegue: volver a asignar `app.fenixcapital.es` mediante Vercel `assign_alias` a `dpl_CQuh9UYH68JYHkTcaGcvXEq7fz5h` tras comprobar identidad de proyecto. Verificar la asignación por `get_alias` y ejecutar smokes de owner + CRM. No tocar DNS.
- Función Supabase `cerebro-console-activity-v0`: código actual v10 respaldado byte a byte en `cerebro/universal/v0/supabase-activity/backup/cerebro-console-activity-v8-index.ts` de la rama candidata; la v7 anterior se conserva en `backup/cerebro-console-activity-v7-index.ts`.
- PR #78 permanece DRAFT; promoción controlada por alias no es fusión a `main`.

## Pendientes no bloqueantes / límites

- **POR AUDITAR:** vínculo individual exacto entre 2506 perfiles y sus ejecutores; no confundir roles, jobs, Workers ni functions.
- **POR AUDITAR:** CRM E2E funcional autenticado con lectura de negocio; únicamente rutas HTTP fueron comprobadas en esta operación.
- **PLANIFICADO:** renovación segura del JWT E2E de GitHub Actions. Es un token de acceso con caducidad; haber pasado hoy no garantiza validez futura. No imprimir tokens ni almacenar contraseñas en repositorio.
- **EXISTENTE:** costes de proveedores contratados. **No se contrataron nuevas suscripciones** para este cierre.
- Seguir monitorizando feed 503, rutas y regeneración del snapshot; no declarar un SLA longitudinal por una sola ventana de pruebas.

**RESULTADO:** objetivo principal de conexión real del directorio y estado compartido en OPERATIVA PROD = HECHO. Cobertura total de motores/autonomía = POR AUDITAR.
