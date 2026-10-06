# CEREBRO OS · Skill Supply Chain V0

Estado: PARCIAL / PREPROD_CANDIDATE
Fecha: 2026-10-06
Coste adicional consumido: 0 €
PROD writes: NO
Nuevo engine_id: NO
External skill code execution: NO
Trading access: NO

## 1. Encaje arquitectónico y no duplicación

La capacidad no parte de cero. Conserva y envuelve piezas existentes, sin crear un motor nuevo:

- PR #175 · Digital Build + Tech Scout overlap audit.
- PR #176 · catálogo versionado de capabilities/templates/skills bajo FACT-001.
- PR #177 · Digital Build Orchestrator PLAN_ONLY.
- PR #201 · Technology Scout V0.
- PR #241 · Capability Guard V0.
- PR #263 · IAM-001 Policy Runtime V0.
- PR #416 · RSI Continuous Improvement + Meta-Learning.
- PR #173 · Zero-Cost Runtime Wave 1.
- PR #240 · Model Router V0.
- Runtime/EventBus, observabilidad, auditoría y FinOps existentes.

Conclusión: `cap:skill-supply-chain` es una capability transversal coordinada por FACT-001. No sustituye SEO-001, Company Onboarding, App, CRM, WordPress, Supabase ni otros owners funcionales.

## 2. Objetivo

Mantener un catálogo vivo de skills/capabilities internas y externas y convertirlo en una cadena segura de suministro de capacidades para CEREBRO y todas las empresas.

Regla: descubrir no implica confiar; auditar no implica instalar; LAB GREEN no implica promover; Tribunal GREEN no implica PROD.

## 3. Flujo canónico

DISCOVER
→ RESOLVE_UPSTREAM
→ MANIFEST_STATIC_SCAN
→ LICENSE_EVIDENCE
→ SECURITY/POLICY_GATE
→ DEDUP/OVERLAP
→ PRELAB
→ DISABLED_WRAPPER
→ VALUE/OPERATIONAL_FIT
→ STATIC_LAB
→ OLD_VS_NEW
→ ZERO_COST_ROUTE
→ HARD_QUOTA
→ BEHAVIORAL_LAB
→ INDEPENDENT_JUDGE
→ ROLLBACK/REBUILD_PROOF
→ TRIBUNAL
→ PREPROD_PROMOTION_REVIEW
→ CANARY cuando aplique
→ PROMOTE
→ MONITOR
→ LEARN
→ RECHECK

Todo fail-closed. Ningún marketplace es autoridad de confianza por sí mismo.

## 4. Fuentes V0

- LobeHub: discovery; resolver upstream original.
- MCPServers Agent Skills: discovery; resolver upstream/licencia exactos.
- FragRoger: REFERENCE_ONLY hasta licencia empresarial compatible demostrada.
- GitHub: upstream, commit, procedencia, licencia y mantenimiento.

Technology Scout puede añadir fuentes sin convertirlas automáticamente en confiables.

## 5. Bindings con CEREBRO

- FACT-001: wrappers/adapters/skills nativas ante gap real.
- INT-001: inventario y dependencias.
- RSH-001 / INN-001 / OPP-001 / OBS-001: descubrimiento, investigación y obsolescencia.
- SEC-001 / SEC-002 / IAM-001 / POL-001: seguridad, identidad, permisos y policy.
- QA-001 / REG-001 / EVA-001 / JDG-001: tests, regresión, evaluación y juicio.
- FINOPS-001 / FREE-001: coste y hard quota.
- ORCH-001 / ROUTE-001: selección y composición.
- LRN-001 / UPD-001 / SUP-001: aprendizaje, actualización y supervisión.
- RSI: recibe propuestas/evidencia; no puede autopromover ni elevar permisos/presupuesto.

## 6. Descubrimiento continuo

Objetivo contractual:

- event-driven: gap, fallo repetido, nueva empresa, nueva capability, release upstream o advisory;
- diario: descubrir cambios y versiones;
- semanal: rescoring, fallos/fallbacks y benchmark de alto valor;
- mensual: obsolescencia, licencia, dependencias y coste.

V0 no añade daemon ni servidor propio. La activación persistente se hará solo tras gates correspondientes.

## 7. Reglas de aprendizaje

- Popularidad/stars no son señal suficiente ni se usan como score decisor.
- Aprender de evidencia verificada: calidad, éxito, latencia, coste, fallos, seguridad y reversibilidad.
- Conservar versión, upstream y evidencia de cada decisión.
- Degradar/retirar sin borrar historial si una skill empeora.
- Nunca relajar políticas, permisos o contratos para hacer pasar una skill.
- Sustitución de capability existente exige OLD vs NEW y rollback.
- Cargar metadata ligera; materializar contenido completo solo para un job autorizado.

## 8. Seguridad y rechazo

Rechazo/cuarentena V0 incluye CAPTCHA bypass, anti-detect/fingerprint spoofing, credential exfiltration, código ofuscado sin auditoría, ejecución silenciosa en PROD, acceso a Trading desde CEREBRO general, upstream no resoluble y permisos/gastos no justificados.

Licencia incompatible => REFERENCE_ONLY. Gasto nuevo => MONEY_LIMIT antes de consumirlo.

## 9. Evidencia viva · rama candidata

Rama: `cerebro-skill-supply-chain-v0-20261006`.
Última pasada completa verificada previa a esta actualización documental: `eeea148d5e802dc132ebcc3a4eca2b072e42fae3`.
Workflow discovery run: `37500034426` — SUCCESS.
Artifact: `cerebro-skill-discovery-37500034426`, ID `11429431477`, SHA256 `e61ba9387e83a088bf3323cf7d007b4fcc53dc4e59209994ea09bb9f5983d571`.

### CI y discovery

- 153/153 tests PASS; 0 FAIL; 0 skipped; 0 cancelled.
- 36 candidatos / 3 fuentes OK.
- 12 upstream GitHub canónicos resueltos; 0 rate-limit; 0 hard failures.
- 24 `SKILL.md` resueltos como texto inerte; 12 no resueltos quedan fuera.
- 24 evidencias exactas de licencia; compatibilidad jurídica global sigue `UNASSESSED`.
- 26 candidatos con solapamiento de dominio; 10 capability-gap candidates.
- P0: 9; P1: 4; P2: 23.
- 4 `STATIC_PRELAB_READY_INSTRUCTION_ONLY`.
- 4 wrappers planificados; 0 habilitados; execute/install/PROD = false.

### Ranking de utilidad operativa

Stars/popularity no participan en el score:

- `github`: 90 / operational fit 90.
- `supabase-postgres-best-practices`: 89.7 / operational fit 100.
- `agent-browser`: 88.53 / operational fit 100.
- `caveman-help`: 75.64 / operational fit 15 → HOLD_LOW_OPERATIONAL_FIT.

### Static LAB

- `github`: `STATIC_LAB_BLOCKED_SECURITY` — coverage 100 / policy 0.
- `supabase-postgres-best-practices`: `STATIC_LAB_GREEN_FOR_BEHAVIORAL_EVAL` — coverage 100 / policy 100.
- `agent-browser`: `STATIC_LAB_HOLD` — coverage 88.89 / policy 75.

No se fuerza ningún gate rojo/hold.

### OLD vs NEW

Solo la candidata Supabase/Postgres recibe paquete:

- 1 paquete;
- 3 fixtures sintéticos;
- estado `PLANNED_NOT_EXECUTED`.

No ejecuta la skill ni el motor real; compara proxies sintéticos únicamente cuando el Behavioral LAB esté explícitamente habilitado.

## 10. Ruta IA 0 €

`CEREBRO_GEMINI_API_KEY` está configurada. El pipeline normal comprueba únicamente su presencia como booleano; no lee ni emite el valor.

Estado verificado:

- `google-gemini-api-free`: `READY_ZERO_COST_ROUTE`;
- additional_cost_eur = 0;
- synthetic-only;
- `STOP_AT_FREE_TIER_LIMIT`;
- paid fallback = false;
- hard quota actual: 3 baseline + 3 candidate = 6 llamadas máximas;
- llamadas de modelo ejecutadas por discovery = 0.

Cualquier señal de billing/coste >0 debe parar y mapearse a MONEY_LIMIT.

## 11. Independent Judge

Existe `skill-independent-judge.mjs`, determinista e independiente de la skill candidata.

Exige behavioral proxy completo, arms baseline/candidate emparejados, JSON válido, 100% de constraints/correctness por defecto, cero policy violations, cero side effects y no empeorar baseline.

En discovery actual: `NOT_READY`, correctamente por falta de ejecución behavioral. Bloqueadores exactos:

- `BEHAVIORAL_PROXY_NOT_COMPLETE`;
- `BEHAVIORAL_RESULTS_MISSING`;
- `NO_BEHAVIORAL_CALL_EVIDENCE`.

No confunde ausencia de evidencia con evidencia explícitamente no sintética.

## 12. Rollback / rebuild proof

Existe `skill-rollback-proof.mjs`.

Estado: `GREEN_ROLLBACK_REBUILD_PROOF` / `ready=true`.
Scope: `WRAPPER_BINDING_ONLY_SYNTHETIC`.

Prueba que los wrappers están disabled, zero-permission, DENY_BY_DEFAULT, con provenance y rollback requerido; el baseline se restaura y el rebuild vuelve disabled.

Importante: este GREEN demuestra reversibilidad de la capa de binding del wrapper. NO demuestra rollback futuro de efectos DB/filesystem/network/PROD.

## 13. Tribunal

Existe `skill-tribunal.mjs`, evidence-only y fail-closed.

Solo evalúa candidatas Static-LAB GREEN. Para cada una exige:

- static policy 100 y sin hard security blocks;
- evidencia exacta de licencia y coincidencia metadata/family;
- behavioral package completo;
- independent judge package GREEN;
- rollback binding proof GREEN;
- zero-cost route READY;
- RSI shadow GREEN.

La comprobación de licencia es evidencia técnica; `legal_final_opinion=false` y no sustituye una opinión legal cuando fuese necesaria.

Estado actual del Tribunal: `NOT_READY`. La única candidata examinada, `supabase-postgres-best-practices`, está HOLD exclusivamente por:

- `BEHAVIORAL_PACKAGE_NOT_COMPLETE`;
- `INDEPENDENT_JUDGE_PACKAGE_NOT_GREEN`.

## 14. RSI / mejora continua

Última pasada:

- 15 improvement events;
- RSI shadow `SHADOW_BRIDGE_GREEN`;
- 15 runtime events aceptados;
- 15 learning candidates válidos;
- persistent publish = false;
- RSI real publish = false;
- PROD = false;
- elevación automática de permisos/presupuesto = false.

## 15. Promotion Readiness actual

Estado: `NOT_READY`.

Ya están verdes: Static LAB de la candidata Supabase, zero-cost route, hard quota, RSI shadow y rollback binding proof.

Bloqueadores restantes exactos:

1. `BEHAVIORAL_EXECUTION_GATE_CLOSED`;
2. `BEHAVIORAL_OLD_VS_NEW_NOT_EXECUTED`;
3. `INDEPENDENT_JUDGE_NOT_GREEN`;
4. `TRIBUNAL_NOT_GREEN`.

`merge_authorized=false`, `prod_authorized=false`, `autonomous_promotion_authorized=false`.

Incluso si todos los gates quedaran GREEN, el siguiente estado sería `READY_FOR_PREPROD_PROMOTION_REVIEW`; no PROD automático. La promoción de alto riesgo mantiene HUMAN_REQUIRED=`HIGH_RISK`.

## 16. Behavioral LAB preparado

`.github/workflows/cerebro-skill-behavioral-lab.yml` está preparado para:

1. exigir confirmación exacta `RUN_SYNTHETIC_LAB`;
2. verificar la credencial gratuita sin imprimirla;
3. exigir artifact GREEN del mismo branch head;
4. abrir el gate solo para LAB sintético;
5. ejecutar baseline proxy vs candidate proxy;
6. ejecutar Independent Judge;
7. ejecutar rollback proof;
8. ejecutar Tribunal;
9. calcular PREPROD promotion readiness;
10. subir evidencia sin autorizar merge/PROD/autopromotion.

## 17. Bloqueo físico actual

El Behavioral LAB es `workflow_dispatch` y está en la rama candidata. El conector GitHub disponible en este chat no expone una operación para iniciar `workflow_dispatch`.

No se copiará/mergeará el workflow a `main` solamente para poder lanzarlo: eso rompería la política de conservación y promoción. Tampoco se inventará evidencia behavioral.

Por tanto, el único gate físico pendiente antes de continuar automáticamente con Judge → Tribunal → PREPROD readiness es una vía autorizada de dispatch del workflow manual.

## 18. Estado de no interferencia

HECHO y verificado en esta línea de trabajo:

- PROD no tocado.
- App/CRM/SEO/WordPress/Supabase PROD no modificados.
- Trading aislado.
- datos cliente/PROD no usados.
- código externo de skills no ejecutado.
- coste adicional 0 €.
- no nuevo servidor.
- PR permanece DRAFT.

## 19. Mantenimiento detectado

GitHub Actions avisa de deprecación de Node.js 20 en actions/checkout/setup-node/upload-artifact, que el runner fuerza internamente a Node.js 24. No ha roto CI y no es un blocker funcional actual, pero queda como tech-debt de compatibilidad a revisar de forma separada.

## 20. Next block

1. Mantener discovery/scoring automático fail-closed.
2. No tocar candidates bloqueadas/hold.
3. Ejecutar Behavioral LAB únicamente mediante dispatch autorizado, sintético y 0 €.
4. Si behavioral GREEN: Independent Judge → Tribunal → PREPROD promotion review automáticamente.
5. Si cualquier gate falla: HOLD/corregir en rama, sin relajar políticas.
6. No merge directo, no PROD, no datos reales y no Trading.
