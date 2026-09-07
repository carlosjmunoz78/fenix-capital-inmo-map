# FACT-001 Changelog

## 0.2.0 · 2026-09-08
- Verificado y fusionado PR #131 únicamente tras `FACT-001 Factory V0` + `FACT-001 App Compatibility` verdes; el `PRE-PROD App Build` post-merge #3333 terminó SUCCESS.
- Reconciliado Cloudflare Workers NON-PROD preservando exclusivamente los triggers `main` y documentando rollback.
- Reconciliado Cloudflare Pages con cambio mínimo `preview_deployment_setting: all → none`, preservando `production_branch=main` y `production_deployments_enabled=true`; configuración build legacy no modificada para evitar riesgo sobre main/PROD.
- Creada evidencia Pages `governance/cloudflare-pages-reconciliation-2026-09-08.json`; PR #132 pasó Factory + App Compatibility antes de merge y `PRE-PROD App Build` post-merge #3334 terminó SUCCESS.
- Cerrado issue #127 con evidencia reproducible, OLD vs NEW y rollback. No se realizó deploy PROD.
- Issue #124 revalidado: branch/ruleset admin sigue bloqueado por autorización externa. HUMAN_REQUIRED exacto documentado; no se inventó verde.
- Issue #126 revalidado por GitHub, Drive, Notion, Make y disponibilidad de conectores: no existe ruta actual de health Compute/VM. HUMAN_REQUIRED exacto documentado y `REAL_AUTHORIZED=false` / `BLOCK_REAL` preservado.
- Creado issue #133 `SECURITY_INCIDENT` por configuración sensible de Cloudflare Pages visible como `plain_text`; ningún valor secreto se almacena en repo, issues ni evidencia. Rotación bloqueada hasta inventariar consumidores/ownership.
- Sincronizada la cola HUMAN_REQUIRED a v1.7.0 y añadida evidencia `governance/pre-factory-gate-closeout-2026-09-08.json`.
- Gate estructural PREPROD para fabricación por familias: `READY`. Esto autoriza únicamente scaffolds inertes/registrados en PREPROD; autonomía PROD continúa `DENY`.
- Coste adicional: 0 €.

## 0.1.0 · 2026-09-07
- Rama aislada creada desde `preprod-app-phase1`.
- Añadido schema canónico de motor.
- Añadida plantilla de manifest.
- Creado Engine Registry inicial con FACT-001 y APP-001.
- Registrado APP-001 como specimen auditado, sin modificar la App real.
- Añadido mapa inicial de dependencias basado en auditoría viva.
- Añadido validador determinista sin dependencias externas.
- Añadidos tests y workflow CI exclusivo de FACT-001.
- Abierto PR draft contra PREPROD; no autorizado para merge/promoción a PROD.

## Reglas de continuidad
- No fusionar hasta que CI esté verde y se cierre el caller inventory crítico.
- No modificar contratos, RLS, Edge Functions o comportamiento PROD desde esta rama.
- Toda ampliación debe actualizar Registry, dependency map y este changelog.
