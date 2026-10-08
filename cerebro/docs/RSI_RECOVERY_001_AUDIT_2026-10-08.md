# RSI-RECOVERY-001 · Audit de recuperación controlada

Fecha: 2026-10-08
Estado: AUDIT_COMPLETE_FIRST_SLICE
Entorno objetivo de integración: LAB/PREPROD, sin autorización PROD
Coste adicional autorizado: 0 EUR

## Fuentes congeladas

- CURRENT main verificado: `63e4a02341d8884b4df21c7c2a94562b06844059`.
- OLD RSI source: PR #416, branch `cerebro-rsi-continuous-improvement-loop-v0-20260919`, head `a79d51dccb794ab0718d6959554185bfab3ca0b4`.
- PR #416 no se mergeará de forma bruta. Se usa únicamente como fuente histórica versionada.
- Recovery branch: `cerebro-rsi-recovery-001-20261008`, creada desde el CURRENT main anterior.

## Regla de recuperación

CONSERVAR → ENTENDER → ENVOLVER → PROBAR → MEJORAR → MIGRAR.

No se elimina ni sustituye ningún comportamiento actual de Skill Factory, App/CRM, Supabase, SEO, Notion, WordPress, Training, automatizaciones o Trading. Trading queda fuera de alcance. Ninguna pieza de esta recuperación autoriza PROD write, nuevas credenciales, datos de cliente, ejecución de código externo, paid fallback o auto-merge.

## Inventario OLD

PR #416 contiene 49 archivos: 13 workflows, 11 documentos, 12 módulos runtime y 13 tests. Los 12 runtimes son:

1. `continuous-improvement-contract.mjs`
2. `continuous-improvement-scheduler.mjs`
3. `learning-pipeline.mjs`
4. `experiment-pipeline.mjs`
5. `evaluation-tribunal.mjs`
6. `promotion-pipeline.mjs`
7. `meta-learning.mjs`
8. `multi-company-learning.mjs`
9. `factory-supervisor-improvement.mjs`
10. `knowledge-obsolescence.mjs`
11. `rsi-observability-security.mjs`
12. `continuity-handoff.mjs`

## Comparación OLD vs CURRENT y decisión

| OLD runtime | Estado de recuperación | Autoridad CURRENT relacionada | Decisión |
|---|---|---|---|
| continuous-improvement-contract | Falta contrato canónico; existe copia parcial dentro del bridge RSI | `runtime/runtime.mjs`, `skills/skill-rsi-shadow-bridge.mjs` | PORT_WITH_CHANGES |
| continuous-improvement-scheduler | AutoLoop actual controla cola/seguridad, pero no reproduce por sí solo horizontes DAILY/WEEKLY/MONTHLY/EVENT | `skills/skill-autoloop-controller.mjs` | PORT_WITH_CHANGES |
| learning-pipeline | Existen propuestas de eventos y bridge shadow, pero no pipeline genérico outcome→evidence→candidate persistible | `skills/skill-improvement-events.mjs`, `skills/skill-rsi-shadow-bridge.mjs` | PORT_WITH_CHANGES |
| experiment-pipeline | CURRENT tiene OLD-vs-NEW más rico para skills, pero no contrato experimental genérico de todos los motores | `skills/skill-old-vs-new-contract.mjs` | PORT_WITH_CHANGES |
| evaluation-tribunal | CURRENT tiene juez/tribunal de skills más rico; faltan invariantes genéricos anti-leakage/anti-Goodhart para cualquier motor | `skills/skill-independent-judge.mjs`, `skills/skill-tribunal.mjs` | PORT_WITH_CHANGES |
| promotion-pipeline | CURRENT gobierna promoción segura de skills con autorización de alcance; el pipeline OLD no debe sustituirlo | `skills/skill-promotion-readiness.mjs`, `skills/skill-autonomous-promotion-v1.mjs` | PORT_WITH_CHANGES_AS_GENERIC_ENVELOPE |
| meta-learning | No se ha encontrado sustituto canónico equivalente en CURRENT | ninguno equivalente auditado | PORT_WITH_CHANGES |
| multi-company-learning | CURRENT tiene bootstrap multiempresa, no transferencia de conocimiento contextual | `multicompany/bootstrap.mjs` | PORT_WITH_CHANGES |
| factory-supervisor-improvement | Skill Factory moderna existe, pero no se debe importar el supervisor OLD sin adaptar a FACT-001 actual | Skill Factory/AutoLoop actuales | PORT_WITH_CHANGES |
| knowledge-obsolescence | Lógica conservadora útil, pero OLD carece del contexto multiempresa completo obligatorio | sin sustituto canónico auditado | PORT_WITH_CHANGES |
| rsi-observability-security | Observabilidad/Audit/FinOps CURRENT es sustancialmente más fuerte y persistente; AutoLoop ya aplica safety gates | `runtime/observability-audit-finops.mjs`, `skills/skill-autoloop-controller.mjs` | ALREADY_REPLACED_KEEP_ONLY_RSI_METRIC_ADAPTERS |
| continuity-handoff | Invariantes de estado vivo/reanudación siguen siendo útiles; formato OLD debe adaptarse a continuidad moderna | documentación/estados actuales | PORT_WITH_CHANGES |

## Dependencias y autoridad

`runtime/runtime.mjs` y `runtime/observability-audit-finops.mjs` permanecen autoridad CURRENT. Los módulos RSI recuperados deberán depender de ellos cuando proceda; nunca al revés en la primera fase. Para skills, `skill-old-vs-new-contract`, `skill-independent-judge`, `skill-tribunal`, `skill-promotion-readiness` y `skill-autonomous-promotion-v1` siguen siendo autoridad del flujo Skill Factory. El RSI genérico no puede saltarse ni rebajar esos gates.

El primer puerto seguro es el contrato canónico de mejora continua, porque actualmente `skill-rsi-shadow-bridge.mjs` duplica localmente el esquema de learning record y apunta explícitamente a PR #416. La migración inicial debe centralizar esa validación sin activar persistencia ni publicación RSI.

## Gates de aceptación para cada puerto

- identidad `company_id`, `engine_id`, `environment`, `version`;
- idempotencia determinista;
- evidencia/provenance obligatoria;
- OLD vs NEW cuando aplique;
- juez independiente y tribunal cuando aplique;
- rollback/rebuild antes de promoción;
- HUMAN_REQUIRED únicamente con códigos canónicos;
- coste adicional 0 EUR por defecto;
- no PROD write por defecto;
- no elevación de permisos/presupuesto;
- tests de regresión del comportamiento CURRENT y tests del comportamiento recuperado;
- promoción gradual solamente tras PREPROD y evidencia verde.

## Rollback de RSI-RECOVERY-001

Rollback físico inicial: eliminar/revertir únicamente los commits de esta recovery branch. `main` permanece intacto hasta PR revisada y checks verdes. PR #416 permanece sin mergear como snapshot histórico.

## Next block

`RSI-RECOVERY-001A`: portar `continuous-improvement-contract.mjs` como contrato canónico no ejecutor, conectar `skill-rsi-shadow-bridge.mjs` a dicho validador, añadir tests de compatibilidad y ejecutar CI antes de continuar con scheduler/learning pipeline.
