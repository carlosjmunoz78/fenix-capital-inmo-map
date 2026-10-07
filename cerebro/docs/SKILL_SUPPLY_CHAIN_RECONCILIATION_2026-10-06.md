# CEREBRO OS · Skill Supply Chain · Reconciliación histórica

Fecha: 2026-10-06
Branch: `cerebro-skill-supply-chain-v0-20261006`
Estado: PREPROD CANDIDATE

## Objetivo

Aplicar CONSERVAR → ENTENDER → ENVOLVER → PROBAR → MEJORAR → MIGRAR antes de incorporar la Skill Supply Chain, evitando duplicar trabajo histórico no fusionado.

## Evidencia revisada

| PR / pieza | Estado observado | Aporte reutilizable | Decisión V0 |
|---|---|---|---|
| #175 Digital Build + Tech Scout overlap audit | histórico, no presente como runtime final en `main` | disciplina de overlap/gap antes de crear IDs | REUTILIZAR COMO REGLA |
| #176 Digital Build capability catalog | abierto; catálogo/templates/skills no presentes en `main` | contrato capability/template/skill, bindings a motores, fail-closed, coste 0 | EXTRAER CONCEPTOS, NO MERGE DIRECTO |
| #177 Digital Build Orchestrator | histórico, stacked | composición PLAN_ONLY y secuencia de preservación | REUTILIZAR CONTRATO |
| #201 Technology Scout V0 | abierto; `technology-scout.mjs` y catálogo no presentes en `main` | evidencia/version/licencia/coste/seguridad/interoperabilidad/reversibilidad | ABSORBER EN SUPPLY CHAIN + FUTURA RECONCILIACIÓN |
| #241 Capability Guard V0 | abierto; `cerebro/security/capability-guard.mjs` no está en `main` | allowlist, multiempresa, fail-closed, auditoría | NO DUPLICAR; usar hard gates V0 y reconciliar antes de PROD |
| #263 IAM Policy Runtime V0 | abierto; `cerebro/security/iam-policy.mjs` no está en `main` | principal/company/capability/action, least privilege | NO DUPLICAR; PREPROD pendiente de reconciliación |
| #416 RSI Continuous Improvement + Meta-Learning A–M | abierto; contratos RSI no están en `main`; checks históricos verdes | aprendizaje por outcomes, OLD vs NEW, tribunal, meta-learning, obsolescencia, rollback, multiempresa | CONECTAR POR HOOK; NO COPIAR STACK ENTERO |
| `main` runtime | existente | persistencia + observabilidad + auditoría + FinOps | CONSERVAR Y USAR COMO BASE |

## Conclusión arquitectónica

1. `cap:skill-supply-chain` NO crea nuevo `engine_id`.
2. FACT-001 sigue siendo owner de la fábrica/catálogo.
3. Technology Scout se trata como capability/función transversal, no como sistema paralelo.
4. Capability Guard/IAM/POL siguen siendo autoridad de permisos cuando sus contratos se promuevan; la Skill Supply Chain no debe inventar un segundo IAM.
5. RSI recibe eventos/resultados de skills y puede proponer mejoras, pero no puede autopromover una skill, elevar permisos ni presupuesto.
6. `main` actual se conserva: no se cherry-pickean stacks históricos completos.

## Estado actual de la nueva capa

- contrato canónico: HECHO
- hard gates deterministas: HECHO
- CI unitario Skill Supply Chain: GREEN
- descubrimiento web READ_ONLY: IMPLEMENTADO EN BRANCH
- scheduler cloud: DEFINIDO (solo efectivo desde default branch tras promoción)
- ejecución de skills externas: BLOQUEADA
- writes PROD: BLOQUEADOS
- Trading: BLOQUEADO
- coste adicional objetivo: 0 €

## Política de mejora continua

La Supply Chain emite evidencia para:

- `CAPABILITY_GAP_DETECTED`
- `ENGINE_FAILURE_REPEATED`
- `NEW_COMPANY`
- `NEW_ENGINE_OR_CAPABILITY`
- `UPSTREAM_RELEASE`
- `SECURITY_ADVISORY`

Ciclos:

- diario: discovery + upstream hints + cuarentena;
- semanal: benchmark y revisión de fallos/fallbacks;
- mensual: obsolescencia, licencia, dependencias y coste;
- event-driven: respuesta inmediata a gaps/fallos/releases/security.

## Gates antes de cualquier promoción

DISCOVER → UPSTREAM → LICENSE → SECURITY → DEDUP/OVERLAP → NORMALIZE → LAB → TEST → EVALUATE → TRIBUNAL → PREPROD → OLD vs NEW → ROLLBACK PROOF → CANARY cuando aplique → PROMOTE → MONITOR.

## No interferencia

No cambia owners ni pipelines existentes de SEO, nuevas empresas, App, CRM, WordPress o Trading. Las skills son capacidades consumibles por los motores; no reemplazan motores por defecto.

## Próximo gate

1. dejar discovery online GREEN en branch;
2. revisar calidad real de candidatos/upstream hints;
3. añadir resolver GitHub read-only de metadata/licencia/commit sin ejecutar código;
4. añadir dedupe/overlap contra catálogo interno;
5. emitir shortlist para LAB, todavía sin instalación automática;
6. solo después conectar outcomes al RSI/meta-learning reconciliado.
