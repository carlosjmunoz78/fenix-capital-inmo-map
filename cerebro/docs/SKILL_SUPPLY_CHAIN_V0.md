# CEREBRO OS · Skill Supply Chain V0

Estado: DEFINED / PREPROD_CANDIDATE
Fecha: 2026-10-06
Coste adicional objetivo: 0 €
PROD writes: NO
Nuevo engine_id: NO

## 1. Hallazgo de solapamiento

La capacidad no parte de cero. Ya existen candidatos y piezas previas que deben conservarse y reconciliarse, no rehacerse:

- PR #175 · Digital Build + Tech Scout overlap audit.
- PR #176 · catálogo versionado de capabilities/templates/skills bajo FACT-001.
- PR #177 · Digital Build Orchestrator PLAN_ONLY.
- PR #201 · Technology Scout V0 con scoring determinista, evidencia, licencia, coste, seguridad y reversibilidad.
- PR #241 · Capability Guard V0.
- PR #263 · IAM-001 Policy Runtime V0.
- PR #416 · RSI Continuous Improvement + Meta-Learning loop A–M, todavía sin merge a PROD.
- Runtime principal ya contiene persistencia, observabilidad, auditoría y FinOps en `main`.

Conclusión: no se crea un motor nuevo. `cap:skill-supply-chain` es una capability transversal coordinada por FACT-001 y consumida por los motores existentes.

## 2. Objetivo

Mantener un catálogo vivo de skills/capabilities externas e internas y convertirlo en una cadena segura de suministro de capacidades para todo CEREBRO, todas las empresas y todos los motores.

Debe funcionar de forma continua sin alterar automáticamente capacidades que ya funcionan.

## 3. Flujo canónico

DISCOVER
→ RESOLVE_UPSTREAM
→ LICENSE_GATE
→ SECURITY_GATE
→ DEDUP/OVERLAP
→ NORMALIZE
→ QUARANTINE
→ LAB
→ TEST
→ EVALUATE
→ TRIBUNAL
→ PREPROD
→ OLD_VS_NEW
→ ROLLBACK_PROOF
→ CANARY cuando aplique
→ PROMOTE
→ MONITOR
→ LEARN
→ RECHECK

Ningún marketplace se considera upstream confiable por defecto.

## 4. Fuentes iniciales

- LobeHub: descubrimiento solamente; resolver repositorio original.
- MCPServers Agent Skills: directorio de descubrimiento; resolver upstream y licencia.
- FragRoger: referencia funcional hasta confirmar licencia compatible con uso/adaptación empresarial.
- GitHub: resolución del upstream, commit, licencia, mantenimiento y procedencia.

Technology Scout podrá añadir fuentes nuevas sin convertirlas en autoridad automática.

## 5. Transversalidad

Bindings funcionales:

- FACT-001: normaliza/fabrica wrappers, adapters y skills propias cuando exista gap real.
- INT-001: inventario vivo de capacidades, dependencias, owners y health.
- RSH-001/INN-001/OPP-001/OBS-001: descubrimiento, investigación, novedad y obsolescencia.
- SEC-001/SEC-002/IAM-001/POL-001: seguridad, secretos, identidad, permisos y policy.
- QA-001/REG-001/EVA-001/JDG-001: tests, regresión, evaluación y tribunal.
- FINOPS-001/FREE-001: coste, cuotas y ruta 0 €.
- ORCH-001/ROUTE-001: selección/composición en tiempo de ejecución.
- LRN-001/UPD-001/SUP-001: resultados, actualización, supervisión y mejora continua.
- RSI loop: propone mejoras del propio proceso, pero nunca se autopromueve ni eleva permisos/presupuesto.

## 6. Funcionamiento continuo

### Event-driven
Revisar cuando aparezca un gap de capacidad, fallo repetido, nueva empresa, nueva capability, release upstream o aviso de seguridad.

### Diario
Descubrir cambios, resolver upstream, poner candidatos nuevos en cuarentena y detectar versiones nuevas.

### Semanal
Recalcular score de skills disponibles, analizar fallos/fallbacks y benchmarkear candidatos de alto valor.

### Mensual
Revisar obsolescencia, licencia, dependencias, coste y necesidad de sustitución.

La frecuencia es contrato objetivo. V0 no introduce un daemon ni servidor nuevo.

## 7. Reglas de aprendizaje

- No aprender de estrellas/popularidad como señal suficiente.
- Aprender de resultados verificados: calidad, tasa de éxito, latencia, coste, fallos, seguridad y reversibilidad.
- Cada decisión de selección debe conservar evidencia y versión.
- Una skill que empeora puede degradarse o retirarse sin borrar su historial.
- Un fallo de una skill no autoriza a cambiar políticas, permisos ni contratos para hacerla pasar.
- Una nueva skill nunca sustituye automáticamente a una capability existente: requiere OLD vs NEW y rollback.

## 8. Carga bajo demanda

No cargar miles de skills en contexto. Mantener metadata ligera y materializar el contenido completo únicamente para un job autorizado.

## 9. Seguridad y rechazo

Rechazo directo V0: CAPTCHA bypass, credential extraction furtiva, fingerprint spoofing/anti-detect, código ofuscado sin auditoría, upstream no resoluble, ejecución silenciosa en PROD y acceso a Trading desde CEREBRO general.

Licencia incompatible => REFERENCE_ONLY. Nuevo gasto => MONEY_LIMIT antes de consumirlo.

## 10. No interferencia con SEO y nuevas empresas

La Skill Supply Chain es una capa de capabilities, no sustituye SEO-001, Company Onboarding ni el pipeline de alta de empresa. V0 no ejecuta writes en PROD.

## 11. Evidencia viva · 2026-10-06 post-secret

Pasada completa GREEN y refrescada para la rama actual:

- 141/141 tests PASS.
- 36 candidatos / 3 fuentes.
- 12 upstream GitHub resueltos / 0 hard failures.
- 24 `SKILL.md` resueltos como texto inerte.
- 24 evidencias exactas de licencia; compatibilidad jurídica general sigue UNASSESSED.
- 9 candidatos P0; 4 static-pre-LAB instruction-only.
- `supabase-postgres-best-practices`: GREEN_FOR_BEHAVIORAL_EVAL (coverage 100 / policy 100).
- `github`: BLOCKED_SECURITY (coverage 100 / policy 0). No forzar gate.
- `agent-browser`: HOLD (coverage 88.89 / policy 75). No forzar gate.
- OLD vs NEW: 1 paquete Supabase/Postgres, 3 fixtures sintéticos.
- `CEREBRO_GEMINI_API_KEY`: presencia confirmada únicamente como booleano; valor no leído ni emitido.
- Gemini: `READY_ZERO_COST_ROUTE`, additional_cost_eur=0, synthetic-only, STOP_AT_FREE_TIER_LIMIT.
- Hard quota: 3 baseline + 3 candidate = 6 llamadas máximas; paid fallback=false; executable=true.
- Discovery gate sigue cerrado intencionadamente: `EXPLICIT_EXECUTION_ENABLE_MISSING`; 0 model calls.
- RSI shadow GREEN; sin publicación persistente ni PROD.
- Evidencia auxiliar manual pre-Tribunal creada en `cerebro/evidence/skill-supabase-postgres-manual-review-20261006.json`; no sustituye behavioral runtime ni Tribunal.

## 12. Restricción de ejecución actual

El workflow de Behavioral LAB está en la rama candidata y está diseñado para `workflow_dispatch`. No se promoverá un workflow a `main` únicamente para poder ejecutarlo: eso violaría CONSERVAR→ENTENDER→ENVOLVER→PROBAR→MEJORAR→MIGRAR. El conector disponible en este chat no expone una acción de workflow dispatch. Por tanto, el Behavioral OLD vs NEW permanece no ejecutado hasta disponer de una vía de dispatch autorizada o promover de forma justificada y separada un dispatcher mínimo tras sus gates.

Esta limitación no afecta al discovery continuo, al scoring, a la seguridad ni a la ruta zero-cost ya verificada.

## 13. Criterio de promoción

No declarar operativo hasta tener contrato, tests, licencia/upstream, security gate, aislamiento multiempresa, coste, observabilidad/auditoría, rollback/rebuild, PREPROD, OLD vs NEW cuando sustituya capacidad e integración RSI/Technology Scout sin duplicación.

## 14. Next block

1. Mantener discovery/scoring continuo y fail-closed.
2. Preparar juez independiente y rollback/rebuild de la única candidata GREEN.
3. Ejecutar Behavioral OLD vs NEW solo mediante una vía autorizada, sintética y 0 €.
4. Tribunal después del Behavioral LAB, nunca antes.
5. No merge directo, no PROD, no datos cliente/PROD y no Trading.
