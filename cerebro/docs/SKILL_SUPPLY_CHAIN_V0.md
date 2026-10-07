# CEREBRO OS · Skill Supply Chain V0

Estado: PARCIAL / READY_FOR_PREPROD_PROMOTION_REVIEW
Fecha de corte: 2026-10-07
Coste adicional observado en los LAB cerrados: 0 €
PROD writes: NO
Nuevo engine_id: NO
External skill code execution: NO
Trading access: NO
Merge autorizado: NO
PROD autorizado: NO
Autopromoción: NO
HUMAN_REQUIRED actual para el siguiente salto: HIGH_RISK

## 1. Encaje arquitectónico

`cap:skill-supply-chain` es una capability transversal coordinada por `FACT-001`. Reutiliza Registry, contratos, seguridad/policy, QA/evaluación/Tribunal, Model Router, FinOps/free-tier, observabilidad y aprendizaje existentes. No sustituye SEO-001, Company Onboarding, App, CRM, Supabase, Notion, WordPress, Training ni Trading y no crea un engine_id nuevo.

Regla de trabajo: CONSERVAR → ENTENDER → ENVOLVER → PROBAR → MEJORAR → MIGRAR.

## 2. Flujo canónico

DISCOVER → RESOLVE_UPSTREAM → MANIFEST_STATIC_SCAN → LICENSE_EVIDENCE → SECURITY/POLICY_GATE → DEDUP/OVERLAP → PRELAB → DISABLED_WRAPPER → VALUE/OPERATIONAL_FIT → STATIC_LAB → OLD_VS_NEW → ZERO_COST_ROUTE → HARD_QUOTA → BEHAVIORAL_LAB → INDEPENDENT_JUDGE → ROLLBACK/REBUILD_PROOF → TRIBUNAL → PREPROD_PROMOTION_REVIEW → CANARY cuando aplique → PROMOTE → MONITOR → LEARN → RECHECK.

Todo es fail-closed. Descubrir no implica confiar; auditar no implica instalar; LAB GREEN no implica PROD; Tribunal GREEN no implica PROD.

## 3. Discovery y no duplicación

La línea conserva y envuelve capacidades previas de FACT-001, Technology Scout, Capability Guard, IAM/Policy, RSI/Meta-Learning, Zero-Cost Runtime, Model Router, Runtime/EventBus, observabilidad y FinOps. Popularidad/stars no son una señal decisora.

Último snapshot de discovery previo a los LAB cerrados mantiene 36 candidatos / 3 fuentes, 12 upstream GitHub canónicos resueltos, 24 `SKILL.md` tratados como texto inerte, P0/P1/P2 y wrappers disabled. Candidatas bloqueadas/hold no se fuerzan.

## 4. Frozen behavioral evidence baseline

Head de evidencia behavioral y CI previo al cierre documental: `135fc29a9b41d7257381c08efea49015db1e71d9`.
Base main observada: `3c37a1bc21b5c5a8c44bc842c4535495834f77bc`.
PR: #486, DRAFT.

En ese head los checks observados terminaron SUCCESS y el discovery exact-head usado por agent-browser fue GREEN.

## 5. Supabase/Postgres · HECHO en LAB sintético

Candidata: `supabase-postgres-best-practices` / `mcpservers-agent-skills:4c2b2478f8fe3bed14df`.

Workflow run: `37642814017` sobre head `1bbfc2250a8f27e8e767fa03ab11a4ddb7a833a7` — SUCCESS.
Artifact: `cerebro-skill-supabase-behavioral-lab-37642814017`, ID `11492473830`, digest `sha256:2837ab122a2efbab92536f32519c971d7967c071ada5594dff2258f78796c3e0`.

Evidencia:
- Static LAB: `STATIC_LAB_GREEN_FOR_BEHAVIORAL_EVAL`, policy 100, sin hard blocks.
- Licencia detectada: MIT con evidencia exacta; `legal_final_opinion=false`.
- Zero-cost route: `READY_ZERO_COST_ROUTE`.
- 6/6 llamadas sintéticas, 3 baseline + 3 candidate, retries=0, paid fallback=false.
- Provider/model: `google-gemini-api-free` / `gemini-3.5-flash-lite`.
- Behavioral proxy: `PROXY_COMPLETE`.
- Independent Judge: `GREEN_FOR_TRIBUNAL_REVIEW`.
- Rollback/rebuild: `GREEN_ROLLBACK_REBUILD_PROOF`, scope `WRAPPER_BINDING_ONLY_SYNTHETIC`.
- Tribunal: `GREEN`, blockers=[]; PROD no autorizado.
- Promotion readiness: `READY_FOR_PREPROD_PROMOTION_REVIEW`, blockers=[].
- `HUMAN_REQUIRED=HIGH_RISK`.

## 6. agent-browser · HECHO en LAB sintético normalizado

Candidata: `agent-browser` / `mcpservers-agent-skills:157e52d4ac5038d53c1a`.

Workflow run: `37644374137` sobre head `135fc29a9b41d7257381c08efea49015db1e71d9` — SUCCESS.
Artifact: `cerebro-skill-agent-browser-behavioral-lab-37644374137`, ID `11494440533`, digest `sha256:0a1f97bf1e7271454627eb7553147dfa5930c28a26fac20232fd1acd58e06d5c`.

Evidencia:
- Raw static: `STATIC_LAB_HOLD`, preservado.
- Normalized wrapper: `NORMALIZED_WRAPPER_GREEN_FOR_BEHAVIORAL_EVAL`.
- Raw thresholds relajados: NO.
- 6/6 llamadas sintéticas, retries=0, paid fallback=false.
- Provider/model: `google-gemini-api-free` / `gemini-3.5-flash-lite`.
- Behavioral proxy: `PROXY_COMPLETE`.
- Independent Judge: `GREEN_FOR_TRIBUNAL_REVIEW`.
- Rollback/rebuild: `GREEN_ROLLBACK_REBUILD_PROOF`.
- Tribunal normalizado: `GREEN`, blockers=[].
- Promotion readiness: `READY_FOR_PREPROD_PROMOTION_REVIEW`.
- `HUMAN_REQUIRED=HIGH_RISK`.

El wrapper no convierte el HOLD raw en GREEN ni muta la evidencia original: aplica una política interna más restrictiva y deja trazabilidad de ambos estados.

## 7. Ruta Gemini 0 € · alcance exacto

La ruta `google-gemini-api-free` quedó verificada para estos LAB sintéticos con hard quota, stop al free-tier limit y `paid_fallback=false`. Esto no se interpreta como garantía universal/permanente de gratuidad ni como autorización para uso PROD. Cualquier señal de billing o coste >0 obliga STOP y `MONEY_LIMIT`.

Las credenciales no se registran en artifacts ni documentación.

## 8. No interferencia

- PROD no tocado.
- Datos PROD/cliente no usados.
- App/CRM/SEO/WordPress/Supabase PROD no modificados por estos LAB.
- Código externo de skills no ejecutado.
- Writes PROD: NO.
- Trading: aislado/no accesible.
- No nuevo servidor ni suscripción de pago.

## 9. Documentación canónica Step 3

- Registry sidecar: `cerebro/registry/skill-supply-chain-v0.json`.
- Contract: `cerebro/contracts/skill-supply-chain-v0.json`.
- Dependency map: `cerebro/docs/SKILL_SUPPLY_CHAIN_DEPENDENCY_MAP_V0.md`.
- Runbook: `cerebro/docs/SKILL_SUPPLY_CHAIN_RUNBOOK_V0.md`.
- Changelog: `cerebro/docs/SKILL_SUPPLY_CHAIN_CHANGELOG_V0.md`.
- Backup/rebuild: `cerebro/docs/SKILL_SUPPLY_CHAIN_BACKUP_REBUILD_V0.md`.
- Autonomy: `cerebro/docs/SKILL_SUPPLY_CHAIN_AUTONOMY_V0.md`.

## 10. Qué está GREEN y qué NO

HECHO: discovery/gates, Behavioral LAB sintético de Supabase, Behavioral LAB sintético normalizado de agent-browser, Judge, rollback binding proof y Tribunal de ambos.

PARCIAL: la capability total sigue sin integración PREPROD real y sin evidencia de efectos reales controlados.

DEFINIDO: contratos, dependencias, rollback/rebuild y política de promoción.

PLANIFICADO: PREPROD real.

NO AUTORIZADO: merge, PROD, writes PROD, autopromoción.

## 11. Next block

Step 4 = PREPROD real y reversible:

1. scope PREPROD aislado;
2. revalidar exact HEAD/provenance/contract;
3. OLD vs NEW sobre integración controlada;
4. observabilidad y coste medido;
5. rollback físico + rebuild disabled;
6. Judge + Tribunal con evidencia PREPROD;
7. si todo GREEN, dejar listo para revisión de promoción;
8. detenerse en `HIGH_RISK` antes de cualquier merge/promoción que pueda afectar PROD.

No usar el LAB sintético como sustituto de PREPROD.
