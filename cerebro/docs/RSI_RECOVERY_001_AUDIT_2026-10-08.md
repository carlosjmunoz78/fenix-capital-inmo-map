# RSI-RECOVERY-001 · Audit de recuperación controlada

Fecha: 2026-10-08
Estado: RUNTIME_RECOVERY_COMPLETE_NONPROD_GREEN
Entorno objetivo: LAB/PREPROD
PROD autorizado: NO
Coste adicional autorizado: 0 EUR

## Fuentes congeladas

- CURRENT main de arranque: `63e4a02341d8884b4df21c7c2a94562b06844059`.
- OLD RSI source: PR #416, branch `cerebro-rsi-continuous-improvement-loop-v0-20260919`, head `a79d51dccb794ab0718d6959554185bfab3ca0b4`.
- PR #416 se conserva como snapshot histórico y NO se mergea de forma bruta.
- Recovery branch: `cerebro-rsi-recovery-001-20261008`.
- Recovery PR: #502, DRAFT.
- Último runtime head con gate completo GREEN antes de esta actualización documental: `75ee94a0a1602ca18decaf5c06810200e3d47949`, run `37777163573`, conclusion `success`.

## Regla aplicada

CONSERVAR → ENTENDER → ENVOLVER → PROBAR → MEJORAR → MIGRAR.

No se elimina ni sustituye comportamiento existente de Skill Factory, App/CRM, Supabase, SEO, Notion, WordPress, Training, automatizaciones o Trading. Trading queda fuera de alcance. Ninguna pieza de esta recuperación autoriza PROD write, nuevas credenciales, datos de cliente, ejecución de código externo, paid fallback, auto-merge o elevación de presupuesto/permisos.

## Inventario OLD

PR #416 contiene 49 archivos: 13 workflows, 11 documentos, 12 módulos runtime y 13 tests.

## Resultado de los 12 runtimes OLD

| OLD runtime | Resultado actual | Autoridad CURRENT preservada |
|---|---|---|
| `continuous-improvement-contract.mjs` | PORT_WITH_CHANGES · implementado | Runtime/Governance actuales |
| `continuous-improvement-scheduler.mjs` | PORT_WITH_CHANGES · implementado | AutoLoop sigue autoridad operativa de skills |
| `learning-pipeline.mjs` | PORT_WITH_CHANGES · implementado | Skill improvement events/bridge siguen sin persistencia automática |
| `experiment-pipeline.mjs` | PORT_WITH_CHANGES · implementado como envelope genérico | `skill-old-vs-new-contract.mjs` sigue autoridad para skills |
| `evaluation-tribunal.mjs` | PORT_WITH_CHANGES · implementado | juez/tribunal modernos de skills siguen autoridad para skills |
| `promotion-pipeline.mjs` | PORT_WITH_CHANGES_AS_GENERIC_ENVELOPE · implementado | promoción CURRENT por dominio; RSI se detiene en CANARY evidence |
| `meta-learning.mjs` | PORT_WITH_CHANGES · implementado fail-closed | no puede rebajar gates ni autoelevarse |
| `multi-company-learning.mjs` | PORT_WITH_CHANGES · implementado | `multicompany/bootstrap.mjs` sigue autoridad de onboarding |
| `factory-supervisor-improvement.mjs` | PORT_WITH_CHANGES · implementado | FACT-001 actual sigue autoridad de Factory/promotion |
| `knowledge-obsolescence.mjs` | PORT_WITH_CHANGES · implementado no destructivo | historia preservada |
| `rsi-observability-security.mjs` | ALREADY_REPLACED | NO se copia; `observability-audit-finops.mjs` sigue autoridad y se añade `rsi-observability-adapter.mjs` puro |
| `continuity-handoff.mjs` | PORT_WITH_CHANGES · implementado | estado vivo + HEAD/PR/CI + next_block, sin SHA inventada |

## Diferencias de seguridad introducidas respecto a OLD

- Todos los contratos recuperados llevan o validan `company_id`, `engine_id`, `environment`, `version` cuando corresponde.
- Ejecución de recuperación restringida a LAB/PREPROD; PROD no es un destino autorizado.
- `HUMAN_REQUIRED` se limita a: `LEGAL_REQUIRED`, `SIGNATURE_REQUIRED`, `LOW_CONFIDENCE`, `HIGH_RISK`, `POLICY_CONFLICT`, `SECURITY_INCIDENT`, `MONEY_LIMIT`, `CUSTOMER_HUMAN_REQUEST`.
- Reintentos técnicos agotados NO inventan HUMAN_REQUIRED.
- Promoción genérica RSI no puede activar PROD: PREPROD → SHADOW → CANARY evidence → `CURRENT_PROMOTION_AUTHORITY_REQUIRED`.
- FACT-001 self-improvement puede producir candidato y evidencia, pero el supervisor RSI no puede auto-promover la Factory.
- Meta-learning no puede reducir requisitos, editar su juez, elevar permisos o elevar presupuesto.
- Transferencia multiempresa bloquea secretos y datos brutos, exige firma de contexto compatible y validación local en destino.
- Obsolescencia de conocimiento nunca borra historia.
- Telemetría RSI usa envelopes compatibles con OBSERV-001/FINOPS-001 CURRENT y no persiste por sí sola.
- Coste adicional objetivo: 0 EUR.

## Workflows OLD

Los 13 workflows RSI de #416 NO se copian uno a uno porque duplicarían gates y crearían dos autoridades concurrentes. Su cobertura funcional recuperada se consolida en `.github/workflows/cerebro-rsi-recovery-001-gate.yml` y, para capacidades de Skill Factory, en los workflows CURRENT ya existentes. Los workflows OLD permanecen trazables dentro de PR #416.

## Documentación OLD

Los 11 documentos OLD se conservan íntegramente en PR #416 como evidencia histórica. No se duplican como documentación canónica porque describen la arquitectura de septiembre. La documentación canónica de la recuperación es este audit, `RSI_RECOVERY_001_RUNBOOK.md`, `RSI_RECOVERY_001_CHANGELOG.md`, el código actual y sus tests.

## Tests y evidencia

La recovery branch contiene tests para contrato, scheduler, learning, experiment, tribunal, promoción, meta-learning, multiempresa, Factory/Supervisor, obsolescencia, continuidad, observability adapter y E2E; además conserva el test del bridge RSI CURRENT. El gate completo de runtime + governance + bridge fue GREEN en run `37777163573` sobre head `75ee94a0a1602ca18decaf5c06810200e3d47949`.

El E2E demuestra: outcome → evidence → learning candidate → OLD vs NEW → holdout evaluation → independent tribunal → PREPROD/SHADOW/CANARY evidence, sin otorgar PROD; también verifica meta-learning, transferencia multiempresa localmente validada, propuesta FACT-001 no destructiva, obsolescencia, telemetría 0 EUR y continuidad.

## Dependencias y autoridad

`runtime/runtime.mjs` y `runtime/observability-audit-finops.mjs` permanecen autoridad CURRENT. Para skills, `skill-old-vs-new-contract.mjs`, `skill-independent-judge.mjs`, `skill-tribunal.mjs`, `skill-promotion-readiness.mjs` y `skill-autonomous-promotion-v1.mjs` permanecen autoridad del flujo moderno. Los módulos RSI recuperados son contratos/envelopes genéricos y no pueden saltarse ni rebajar esos gates.

## Engine Registry

NO modificado todavía. RSI recuperado sigue como componente candidato dentro de PR DRAFT #502; no se declara operativo ni autónomo. Cualquier alta/cambio en Engine Registry requiere primero verificación de main vivo, PREPROD integration, comparación OLD vs NEW y decisión de promoción.

## Rollback y rebuild

Rollback antes del merge: cerrar/revertir PR #502 o descartar recovery branch; `main` queda intacto. Rollback después de un eventual merge solo podrá hacerse por commit/PR revert explícito y probado. Rebuild: partir del main autorizado, aplicar únicamente los archivos aprobados de #502 y ejecutar `CEREBRO RSI Recovery 001 Gate` completo. PR #416 nunca es una dependencia de ejecución; es fuente histórica.

## Autonomía actual

- Contratos RSI genéricos: PARCIAL/NO-PROD.
- Persistencia automática de learning records: NO AUTORIZADA.
- Publicación RSI persistente desde `skill-rsi-shadow-bridge`: NO AUTORIZADA.
- Promoción PROD: NO AUTORIZADA.
- FACT-001 auto-promoción: NO AUTORIZADA.
- Multiempresa cross-company: solo candidato abstracto sin secretos/raw data + validación local; NO PROD.
- Coste adicional: 0 EUR.

## Pendiente antes de cualquier promoción

1. Verificar main vivo y calcular drift desde el base de #502.
2. Ejecutar comparación CURRENT main vs recovery branch y resolver conflictos sin pisar cambios modernos.
3. Integrar en PREPROD únicamente los adapters/contratos necesarios; persistence sigue off hasta contrato específico.
4. Verificar gates actuales del repositorio además del gate RSI.
5. Confirmar rollback/rebuild físico sobre el head final.
6. Actualizar Engine Registry y autonomía solo si existe evidencia de promoción.

## Next block

`RSI-RECOVERY-002 · PREPROD INTEGRATION & CURRENT-MAIN RECONCILIATION`.
