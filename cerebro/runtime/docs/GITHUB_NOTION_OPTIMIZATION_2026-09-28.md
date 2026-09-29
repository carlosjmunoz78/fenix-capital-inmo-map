# GITHUB_NOTION_OPTIMIZATION · Auditoría viva · 2026-09-28

## Alcance
Rama canónica auditada: `preprod-app-phase1`.
Rama de trabajo: `work/finops-supabase-offload-wave1-2026-09-28`.
PR: #419 (DRAFT).

Regla: preservar PROD/security/release/rollback. GitHub se mantiene como código/CI/CD/release/rollback; Notion como control plane humano/conocimiento; runtime CEREBRO para ejecución/eventos/jobs.

## Evidencia viva mínima
- 14 workflows YAML en `.github/workflows` de la rama canónica.
- PR #419 sigue abierto, DRAFT y mergeable.
- Head verificado al inicio del bloque: `a2d3e9363ddcdf9dfe37d046720fa661cd1478c6`.
- En ese head: FACT-001 App Compatibility = SUCCESS; FACT-001 Factory V0 = FAILURE conocido/preexistente por clasificación de dependencias Edge. No debilitar gate.
- Muestra de 100 runs sobre `preprod-app-phase1`: APP PROD Promote 77 runs (52 success / 13 failure / 12 cancelled; ~81.8 min wall-clock proxy) y PRE-PROD App Build 23 runs (8 success / 7 failure / 8 cancelled; ~63.9 min wall-clock proxy). Wall-clock no equivale a minutos billables.

## Clasificación de los 14 workflows
| Workflow | Clasificación | Decisión |
|---|---|---|
| app-prod-promote.yml | PROD_CRITICAL | No tocar sin gate explícito; preserva validación+publicación PROD. |
| closeout-safe-validation.yml | LEGACY_INERT / CAN_MANUALIZE | Push limitado a ramas de cierre históricas + manual; conservar hasta confirmar consumidores. |
| debug-contextual-expediente-build.yml | CAN_MANUALIZE | Diagnóstico especializado; no retirar sin historial por workflow. |
| fact-001-app-compat.yml | MUST_KEEP_AUTO | Compatibilidad Factory/App; ya optimizado en rama de trabajo para evitar Playwright completo por cada cambio runtime/docs. |
| fact-001-factory-v0.yml | MUST_KEEP_AUTO | Gate Factory; rama de trabajo añade concurrency y paths más precisos. |
| fact-001-rls-preprod.yml | MUST_KEEP_AUTO | Gate de seguridad RLS PREPROD; mantener automático. Se añade cancelación de runs superseded en rama de trabajo. |
| legacy-document-migration.yml | CAN_MANUALIZE | Ya manual con confirmación explícita; conservar por rollback/reconciliación histórica. |
| patch-comprador-evidence-20260909.yml | LEGACY_INERT | Trigger solo por cambio del propio workflow; no borrar sin verificar dependencia histórica. |
| patch-expediente-master-view-20260909.yml | LEGACY_INERT | Trigger solo por cambio del propio workflow; no borrar sin verificar dependencia histórica. |
| preprod-build.yml | MUST_KEEP_AUTO/MANUAL_GATE | Manual PREPROD completo; conservar Browser QA/release validation. |
| prod-preparation-build.yml | PROD_CRITICAL | No tocar. |
| prod-runtime-smoke.yml | PROD_CRITICAL | No tocar. |
| promote-prod.yml | PROD_CRITICAL | No tocar. |
| rollback-prod.yml | PROD_CRITICAL | No tocar. |

## Cambios aplicados en esta rama
- FACT-001 App Compatibility: Browser QA completo retirado del fan-out rutinario, preservado en PREPROD/release gates.
- FACT-001 Factory V0: concurrency/cancel-in-progress y paths runtime precisados.
- AUT-001, JOB-001 Shadow Validation y FINOPS Read Cache Contract: manual-only donde la cobertura automática era redundante.
- FACT-001 RLS PREPROD: `concurrency + cancel-in-progress` añadido para cancelar validaciones superseded sin debilitar el gate.
- No se tocaron workflows PROD críticos.

## Notion Business · auditoría viva
Workspace conectado con todas las herramientas Notion disponibles y AI Search accesible.
Capacidades/estructuras confirmadas:
- Base `🧭 Gobierno de módulos · CEREBRO` existente con propiedades de estado, autonomía, autoridad, coste y validación.
- Página `REGISTRY-AUDIT` confirma Factory/Registry V0 y semilla 177/177 como referencia estructural, no autonomía PROD.
- Runbook nativo de Fénix existente y catálogo de automatizaciones relacionado.
- FINOPS LIVE y AUDITORÍA VIVA existentes.
- No se encontró mediante búsqueda una Human Exception Queue ni Company Registry claramente materializadas como bases canónicas dedicadas; mantener estado POR AUDITAR antes de crear duplicados.
- GitHub synced databases / connected PR properties aparecen como capacidad objetivo documentada; no declarar conectadas físicamente sin evidencia de una synced database real.
- Priorizar formulas/relations/rollups/views, automations, webhook actions, forms, buttons y connected properties antes de añadir SaaS/IA.

## Próximo bloque dentro de GITHUB_NOTION_OPTIMIZATION
1. Verificar CI del nuevo head tras el cambio de RLS concurrency.
2. Inventariar schemas reales de las bases de gobierno existentes antes de crear Engine Registry / Human Exception Queue / Company Registry dedicadas.
3. Diseñar mapa de control plane Notion reutilizando `Gobierno de módulos` cuando cubra el contrato y creando solo gaps reales.
4. Mantener PR #419 DRAFT hasta cerrar comparación OLD vs NEW y observación FinOps.


## Cierre de rojos del bloque GitHub

Head actual verificado tras correcciones: `5437efc028a622d55d2d2ee327e9813478b3fcd2`.

Checks en ese head:
- `FACT-001 App Compatibility`: SUCCESS.
- `FACT-001 Factory V0`: SUCCESS.
- `FACT-001 RLS PREPROD`: SUCCESS.

Correcciones realizadas sin debilitar gates:
1. `frontend-edge-contract.json` pasó a contrato 0.3.0 y clasifica cuatro dependencias frontend que el gate detectó vivas:
   - `fenix-document-existing-backfill`: PROD ACTIVE v8 y frontend production-gated.
   - `fenix-expediente-people`: PROD ACTIVE v2; PREPROD `-test` ACTIVE v1; usado como fallback de workspace canónico.
   - `fenix-staff-admin`: helper declarado pero sin función viva PREPROD/PROD ni caller literal adicional; queda clasificado como no desplegado, sin autorizar despliegue.
   - `fenix-user-admin`: PROD ACTIVE v3; no existe variante PREPROD viva.
2. El siguiente rojo apareció en runtime static tests porque `job001_enabled_jobs.json` habilitaba el job 25 `social-t72-watchdog` aunque su estado heredado era staged/no físico. Se eliminó únicamente el 25 de la lista enabled; permanece definido en el scheduler, no borrado. El gate pasó.
3. Se creó snapshot previo de schemas Notion en `cerebro/runtime/docs/notion-control-plane-schema-snapshot-2026-09-28.json`.

## Notion control plane · reutilización en vez de duplicación

Se verificó que la base existente `🆘 Soporte y escalados · Fénix Capital` ya cubre ticket, estado, prioridad, responsable, evidencia, idempotencia y escalado. Por tanto se reutiliza como Human Exception Queue visible.

Cambio aditivo aplicado, sin modificar/borrar propiedades ni registros existentes:
- `Human Exception Code`: solo los 8 códigos canónicos.
- `Company ID`.
- `Engine ID`.
- `Environment`: GLOBAL/LAB/PREPROD/PROD.
- `Version`.

Rollback: eliminar solo estas cinco propiedades nuevas si falla aceptación; ningún registro existente fue reescrito.

Estado:
- Human Exception Queue visible: HECHO como extensión estructural de Soporte y escalados.
- Ingesta automática desde runtime/Supervisor: PLANIFICADA, no declarada operativa todavía.
- Company Registry dedicado: POR AUDITAR/pendiente de materialización tras confirmar que no existe equivalente.
- Engine Registry visible: PARCIAL; Git/Factory es source of truth y REGISTRY-AUDIT existe, pero falta mirror/sync nativo sin duplicación manual.
