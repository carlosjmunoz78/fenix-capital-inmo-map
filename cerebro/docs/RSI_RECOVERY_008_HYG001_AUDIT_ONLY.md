# RSI-RECOVERY-008 · HYG-001 AUDIT-ONLY

Fecha: 2026-10-08
Estado: IMPLEMENTADO EN RECOVERY · NO DESTRUCTIVO
Engine: HYG-001
Environment: AUDIT_ONLY
Coste adicional: 0 EUR
PROD authority: false
Delete authority: false
Mutation authority: false

## Objetivo

Detectar deuda operativa del repositorio sin borrar ni modificar ramas, historial o artefactos. HYG-001 es observador y clasificador; no es un limpiador autónomo.

## Evidencia viva detectada antes de construir HYG-001

La búsqueda de ramas `cerebro-rsi*` mostró, además de la rama activa de recovery, múltiples snapshots/checkpoints de la recuperación, entre ellos:

- `cerebro-rsi-recovery-001-prechange-snapshot-20261008`
- `cerebro-rsi-recovery-001-safety-backup-20261008`
- `cerebro-rsi-recovery-001a-ci-snapshot-20261008`
- `cerebro-rsi-recovery-001a-contract-checkpoint-20261008`
- `cerebro-rsi-recovery-001a-contract-green-candidate-20261008`
- `cerebro-rsi-recovery-001a-final-snapshot-20261008`
- `cerebro-rsi-recovery-001a-ready-for-pr-20261008`
- `cerebro-rsi-recovery-001a-snapshot-9-20261008`
- `cerebro-rsi-recovery-001a-stop-snapshot-20261008`

Esto confirma la necesidad de higiene, pero NO constituye autorización para borrar ninguna rama.

## Implementación

### `cerebro/runtime/hygiene-audit.mjs`

Clasifica cada rama en categorías conservadoras:

- `PROTECTED`
- `ACTIVE_PR_HEAD`
- `DURABLE_STATE`
- `SNAPSHOT_CANDIDATE`
- `ACTIVE_OTHER`

También detecta ramas que apuntan al mismo SHA (`DUPLICATE_HEAD`) y genera recomendaciones de revisión. Todas las filas conservan:

- `delete_authorized=false`
- `mutation_authorized=false`

El informe global mantiene:

- `destructive_changes_performed=0`
- `prod_authorized=false`
- `trading_access=false`
- `additional_cost_eur=0`

### `.github/workflows/cerebro-hygiene-audit-v0.yml`

- ejecución semanal y manual;
- permisos read-only para contents y pull requests;
- recopila ramas y PRs abiertos mediante GitHub API;
- genera `hyg-001-report.json`;
- publica resumen en GitHub Step Summary;
- sube evidencia como artifact de 30 días;
- no contiene delete, force-push, update-ref ni escrituras de contenido.

## Política de decisión

HYG-001 puede recomendar:

- KEEP;
- KEEP_UNTIL_PR_CLOSED;
- KEEP_REVIEW_LATER;
- REVIEW_DUPLICATE_HEAD;
- REVIEW_FOR_ARCHIVE_OR_EVENTUAL_DELETE.

No puede ejecutar eliminación. Una futura fase de cleanup requerirá política explícita, confirmación de que no existe dependencia activa, backup/historial suficiente y un gate separado. Hasta entonces los candidatos permanecen intactos.

## Preservación

No toca App, CRM, Supabase, Notion, WordPress, SEO, Social, Training, Browser Bridge, Trading ni ramas de estado de learning.

## Próximo bloque

`RSI-RECOVERY-009 · SUPERVISOR BOUNDED RECOVERY`: conectar fallos observados a clasificación → diagnóstico → intento acotado → test → rollback/hold → learning, sin auto-promoción y sin PROD.
