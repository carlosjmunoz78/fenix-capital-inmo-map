# FACT-001 Changelog

## 0.4.1 · 2026-09-08
- Cerrado el loop de los cuatro objetivos estructurales/PREPROD con evidencia post-merge completa.
- `PRE-PROD App Build` #3338 terminó SUCCESS tras PR #137: Build PREPROD, Browser QA, CORS smokes, candidato PROD inmutable, QA exacto, leak assertion, sellado y artifacts verdes.
- Los cuatro objetivos quedan clasificados verdes en alcance estructural/PREPROD; esto no cambia el estado de autonomía PROD.
- #124 Branch Protection, #126 LAB-TRD runtime y #133 Cloudflare Pages secret rotation continúan como HUMAN_REQUIRED/SECURITY_INCIDENT externos y mantienen PROD autonomy en `DENY`.
- Añadida evidencia `governance/four-objectives-closeout-2026-09-08.json`.
- No deploy PROD, no DDL PROD, no rotación de secretos, no purge y coste adicional 0 €.

## 0.4.0 · 2026-09-08
- PR #135 integrado tras `FACT-001 Factory V0` + `FACT-001 App Compatibility` verdes; `PRE-PROD App Build` post-merge #3336 terminó SUCCESS.
- Materializada `WAVE1-MULTICOMPANY-CONSOLE-V0` mediante la propia FACT-001 en rama aislada.
- Engine Registry actualizado `0.4.0 → 0.5.0`: `17 → 46` motores, 29 nuevos, 0 IDs duplicados.
- Cada motor Wave 1 contiene 18 archivos estándar y permanece `DEFINED_NOT_BUILT`, `PREPROD`, `NONE_UNTIL_GATES_PASS`, coste objetivo 0 € y PROD `DENY`.
- Test canónico post-materialización actualizado para exigir idempotencia `NO_CHANGE`, inventario exacto de 46 motores y estado inerte.
- PR #136 pasó Factory + App Compatibility y se integró; `PRE-PROD App Build` post-merge #3337 terminó SUCCESS con build, Browser QA, CORS, candidato PROD inmutable, QA exacto, leak guard, sellado y artifacts verdes. Sin deploy PROD.
- `CHAT-001`, `CTX-001`, `CMD-001`, `ACTGW-001` y `CONSOLE-001` quedan materializados sólo como scaffolds; no se declaran operativos y Console no se conecta directamente a un modelo.
- Auditoría WordPress/Core Guard en solo lectura confirmó que la vía canónica de caché Cloudflare es Fénix Core Guard → API directa Cloudflare, sin Make como dependencia operativa y con coste adicional 0 €.
- Core Guard PROD permanece `observer`, health 100, writes operativos cerrados y Cloudflare actualmente `available=false`; no se ejecutó purge ni mutación.
- #133 actualizado: el secreto `plain_text` de Cloudflare Pages no está demostrado como credencial/consumer de Core Guard; caller/ownership de Pages sigue por resolver antes de cualquier rotación.
- Añadida evidencia `governance/cloudflare-wordpress-plugin-audit-2026-09-08.json`.

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
- No fusionar hasta que CI esté verde y se cierre el caller inventory crítico aplicable al cambio.
- No modificar contratos, RLS, Edge Functions o comportamiento PROD desde esta rama.
- Toda ampliación debe actualizar Registry, dependency map y este changelog.
