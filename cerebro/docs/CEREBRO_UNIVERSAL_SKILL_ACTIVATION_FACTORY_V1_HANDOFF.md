# CEREBRO UNIVERSAL SKILL ACTIVATION FACTORY V1 · HANDOFF

> Continuidad viva. No reconstruir por memoria.

## Identidad
- Proyecto: CEREBRO OS · ENGINE FACTORY & MULTIEMPRESA
- Issue: #780
- PR: #784 draft
- Branch: `cerebro/universal-skill-activation-factory-v1-20261017`
- HEAD certificado: `876ae431e67b278b447fc21006c48c4bb94bb592`
- LAB/PREPROD. PROD NO TOCAR. Trading aislado. Coste adicional 0 EUR.

## Objetivo final
`skill/repo/URL → provenance/licencia → discovery → dedupe → dominios → motores → Safe Engineering → adapter → pruebas reales → OLD vs NEW → QA/EVA/Tribunal → LRN/OBS/Audit/FinOps → rollback/rebuild → PREPROD físico si aplica → estado terminal verdadero`, sin integración artesanal por skill.

FULL no significa catálogo, wrapper, scaffold o test aislado. FULL exige consumo semántico real y todos los gates.

## Estado certificado
B0–B7 GREEN. B8 ya convierte automáticamente una candidata real que antes acababa `ENGINEERING_TASK_REQUIRED` en `FULL_SAFE_PREPROD` usando un provider de familia, sin código por candidate ID. B9 GREEN tanto con un repositorio no preparado generado dinámicamente como con una URL pública real de GitHub. B10 tiene cola durable JOB-001, concurrencia, idempotencia/restart y entradas por `repository_dispatch/workflow_dispatch`; el control plane está probado en PREPROD. El workflow de evento está en la rama y no se declara activo en default branch hasta promoción gobernada.

## Prueba externa real
URL: `https://github.com/ericrisco/rsc-harness/tree/main/skills/finance-ops`.
Resultado: `FULL_SAFE_PREPROD` por lectura GitHub pública, read-only, commit fijado, inferencia de `SKILL.md`, planner genérico, auto-engineering, 6 bindings finance, OLD vs NEW, Tribunal, LRN, rollback/rebuild y registro nativo. Sin token, clone, instalación ni ejecución de código externo.

Runs HEAD `876ae431...`: Factory `39032881903`, Scale184 V1 `39032881926`, Scale184 V2 `39032881910`, GitHub Live E2E `39032881905`, Repository E2E `39032881906`, Governed Main `39032881956`, RSI `39032881917`. Todos SUCCESS.

## Scale184 V2
Artifact previo certificado: ID `12101021987`, digest `sha256:adfbfb754c29928a9e034fb7f72b77ea49d03cd25b185386d205bc17857855a7`.
Resultado: 35 ABSORBED, 59 REJECTED, 79 BLOCKED_EXTERNAL, 10 ENGINEERING_TASK_REQUIRED, 1 FULL_SAFE_PREPROD (item 128). `full_claim=false`.
Pendientes de ingeniería: 47, 48, 57, 62, 101, 130, 157, 176, 181, 183.

## Hallazgo estructural actual
El normalizador legacy infiere dominios principalmente por empate de solape entre `owner_engine_ids` y bindings de dominio. Esto puede sobrerutear una capacidad a dominios colaterales y multiplicar bindings innecesarios. Antes de fabricar muchos providers, corregir la inferencia usando texto/evidencia de dominio + compatibilidad con owners, manteniendo fail-closed.

## Estado de bloques
B0–B7 GREEN; B8 GREEN primer provider real; B9 GREEN; B10 GREEN_PREPROD_CONTROL_PLANE; B11 CROSS_DOMAIN_GENERALIZATION IN_PROGRESS; B12 final certification PLANNED.

## next_block
`B11_FIX_LEGACY_DOMAIN_INFERENCE_AND_GENERALIZE_AUTO_ENGINEERING_BY_FAMILY`

B11 debe: reducir sobre-binding sin hardcodear IDs; añadir providers reutilizables para familias que sobrevivan; reejecutar las 10 candidatas; promover solo evidencia real; preservar physical BLOCKED_EXTERNAL; mantener regresión completa GREEN.

## Math/Engineering
Safe Engineering existente es el brazo técnico de FACT. No abrir proyecto paralelo. Tras cerrar Factory cross-domain, usar la propia Factory para Math/Solver, Systems, Data y Security Engineering.

## Comunicación
Solo hitos importantes, una frase corta: `haciendo X · conseguido Y · sigue Z`.

## Prompt exacto para nuevo chat
```text
CONTINÚA CEREBRO OS · UNIVERSAL SKILL ACTIVATION FACTORY V1.
NO reconstruyas por memoria ni repitas investigación cerrada.

Lee primero, desde la rama viva:
1) cerebro/docs/CEREBRO_UNIVERSAL_SKILL_ACTIVATION_FACTORY_V1_HANDOFF.md
2) cerebro/registry/universal-skill-activation-factory-v1.state.json
3) cerebro/docs/CEREBRO_UNIVERSAL_SKILL_ACTIVATION_FACTORY_V1_MASTER_2026-10-17.md
4) cerebro/docs/CEREBRO_UNIVERSAL_SKILL_ACTIVATION_FACTORY_V1_RUNBOOK_2026-10-17.md
5) issue #780 y PR #784.

Verifica solo branch/HEAD/runs posteriores al HANDOFF y entra directamente en `next_block`.
CONSERVAR → ENTENDER → ENVOLVER → PROBAR → MEJORAR → MIGRAR.
LAB/PREPROD; no PROD; Trading aislado; coste adicional 0 EUR.
FULL solo con consumo semántico real + OLD/NEW + QA/EVA/Tribunal + LRN/OBS/Audit/FinOps + rollback/rebuild + idempotencia/restart + evidencia física cuando aplique.
No hardcodear candidate IDs. Corregir por familia/generador. Tres fallos equivalentes => reevaluación estructural.
Continúa automáticamente; parar solo por HUMAN_REQUIRED canónico real.
Comunicación con Carlos solo en hitos importantes, una frase muy corta.
Antes de saturación o cierre de bloque mayor actualizar MASTER + STATE + RUNBOOK + HANDOFF con SHA/runs/evidencia/next_block.

PARTIDA CERTIFICADA: HEAD 876ae431e67b278b447fc21006c48c4bb94bb592. B0–B9 GREEN; B10 control plane durable GREEN en PREPROD. GitHub URL real externa llegó a FULL_SAFE_PREPROD. Scale184 V2: 35 ABSORBED, 59 REJECTED, 79 BLOCKED_EXTERNAL, 10 ENGINEERING_TASK_REQUIRED, 1 FULL_SAFE_PREPROD; full_claim=false.
NEXT_BLOCK: B11_FIX_LEGACY_DOMAIN_INFERENCE_AND_GENERALIZE_AUTO_ENGINEERING_BY_FAMILY.
OBJETIVO: efecto Cloud real para familias generales: pego skill/repo/URL y CEREBRO la activa en motores relevantes o devuelve bloqueo terminal preciso, sin chat conductor ni trabajo manual por skill.
```
