# JARVIS V2 · CUT28 · D1 EUROPEA VERIFICADA Y REFERENCIA LAB REGISTRADA
**Fecha:** 2026-11-06 · **Estado:** HECHO infraestructura cloud, HECHO configuración LAB, **PROD NO-GO**.

## Evidencia real
Cloudflare autenticado en Opera muestra `cerebro-jarvis-lab-eu`, UUID `988b11e1-21aa-4cf9-8b9d-110319df7ccc`, jurisdicción **La Unión Europea**, replicación de lectura **Deshabilitado**. Work creó la base en **Workers Free (0 US$/mes)** y comunicó que estaba vacía. Se contrastaron nombre, UUID y configuración desde la cuenta Cloudflare. URL: https://dash.cloudflare.com/e39a57e1ac42650ca5a6d5307cf0ac8e/workers/d1/databases/988b11e1-21aa-4cf9-8b9d-110319df7ccc/settings

Se mantiene la D1 previa `cerebro-jarvis-lab-cut21` UUID `a859fde1-126b-4c40-bc0d-aec2f8839f7b`, jurisdicción NONE, **sin borrarla ni reutilizarla**.

## CUT28 ejecutado en GitHub
- PR #25 continúa **DRAFT**, sin fusionar. Código en SHA `0efa1e8e39cfc9f1e92def2d3b5c99deac9d91fa`.
- Nueva `zeus/jarvis/cloudflare-lab/wrangler-eu.lab.jsonc`: D1 real EU fijada, `JARVIS_LAB_DB`, Workers `workers_dev:false`, sin rutas, `worker-off.mjs`, variables JARVIS_GATEWAY_ENABLED y B2/B3 LIVE en false.
- `zeus/jarvis/cloudflare-lab/verify-cut28-eu-binding.mjs`: impide confundir D1 nueva con la antigua, impedir rutas públicas, cambio del worker OFF, uso de secretos o recursos PROD. Se conserva el `wrangler-eu.template.jsonc` de UUID ficticio para continuidad histórica.
- Workflow existente amplificado **solo para verificaciones offline**: Wrangler `deploy --dry-run --config wrangler-eu.lab.jsonc`; no se han usado credenciales de Cloudflare ni ejecutado ningún deploy real.
- CI: Core `42179124325` **695 PASS / 0 FAIL**; Wrangler D1 local y paquete CUT28 offline `42179124337` SUCCESS; B4 `42179124547`, B7 `42179124343`, Governed `42179124372` SUCCESS. Sin promoción.

## Protecciones, próximos gates y rollback
No se han ejecutado migraciones D1 reales, desplegado Worker, activado Gateway, almacenado JWT/usuarios ni modificado DNS, App/CRM, PROD, main, Supabase, ANA, Trading, SEO, motores o Workers anteriores.

**SIGUIENTE BLOQUE P0:** inventario inicial de la nueva D1 EU, snapshot/base vacía y alcance de credenciales; solicitar capacidades de escritura de Cloudflare **solo** en entorno seguro autorizado; aplicar migraciones aditivas 0001–0005 sobre `cerebro-jarvis-lab-eu` con datos sintéticos y backup/restore **remoto e independiente**; comprobar límites y costes. No hacer ninguna modificación remota desde el conector Opera de solo lectura.

Después siguen pendientes: Vault servidor, identidad OWNER_ROOT real, permisos B3 mínimos, Gateway read-only bajo kill switch, auditoría, dos dispositivos físicos, OLD vs NEW, rollback y tribunal B10 independiente. La prueba LOCAL no sustituye estas evidencias. Coste adicional de suscripciones: 0. Consumo de GitHub Actions no cuantificado.

**Rollback:** revertir únicamente cambios CUT28 en PR DRAFT. No existen mutaciones remotas de este corte que requieran restauración.
