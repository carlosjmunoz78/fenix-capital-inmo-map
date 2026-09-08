# FACT-001 Changelog

## 0.3.0 · 2026-09-08
- FACT-001 incorpora generación atómica por familias mediante `factory.py family`.
- Añadida prevalidación completa antes de escribir: IDs duplicados, conflictos con Registry/scaffolds existentes y dependencias conocidas opcionales.
- Añadida idempotencia de familia: segunda ejecución idéntica devuelve `NO_CHANGE`.
- Añadida política de conflicto all-or-nothing: si una definición existente no coincide, ningún motor nuevo del lote se escribe.
- El generador sigue siendo filesystem-only y no despliega, no llama a PROD, no cambia permisos ni crea infraestructura.
- Cada scaffold generado conserva estado `DEFINED_NOT_BUILT`, autonomía `NONE_UNTIL_GATES_PASS`, coste adicional objetivo 0 € y tribunal/promotion DENY por defecto.
- Definida `WAVE1-MULTICOMPANY-CONSOLE-V0` con 29 motores nuevos, ordenados por dependencias, sin duplicar APP/CRM/SEO/WEB/TRN/Policy/Human Exception/Event/Job/Audit/Observability ya registrados.
- La Wave 1 cubre Company Registry/Onboarding, discovery de negocio/procesos/huella digital, Web/Keyword/Social/Local audit, Competitor + Market Intelligence, Knowledge/SEO/Social/Marketing bootstrap, CRM/App/Automation/Training bootstrap, Engine Activation/Tenant Isolation, Company Supervisor/Backup/Deployment y Gateway/Console V0.
- Añadidos tests de plan sin escritura, generación/registro, dependencias, idempotencia, conflicto atómico, duplicados y preflight canónico de la Wave 1.
- No se concede autonomía PROD ni se muta App/CRM/Web/Social/Supabase/Trading.

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
