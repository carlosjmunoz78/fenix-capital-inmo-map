# CEREBRO Universal Capability Evolution Loop V0

Fecha: 2026-10-09  
Ámbito: misión transversal sobre los 6 pasos ya cerrados. **No es un Paso 7.**

## Estado de esta entrega

Esta entrega implementa en paralelo un V0 de registro, impacto, prueba OLD vs NEW, aprendizaje y binding PREPROD de skills/capabilities. No modifica los 177 IDs del Engine Registry, no convierte dominios ASSISTED en autónomos, no activa MULTIEMPRESA runtime y no concede autoridad PROD.

Principio aplicado: **CONSERVAR → ENTENDER → ENVOLVER → PROBAR → MEJORAR → MIGRAR**.

## Objetivo

Convertir cualquier skill, plugin, tool, connector, ruleset o componente nuevo en una capacidad versionada que CEREBRO pueda evaluar de forma determinista contra los motores existentes:

`capability → register/version → zero-cost route → impact analysis → EXTEND_EXISTING first → OLD vs NEW → LRN-001 evidence → domain policy → PREPROD binding or HOLD/rollback`

Solo cuando no existe un motor compatible se emite un candidato de gap para FACT-001:

`FACT001_GAP_CANDIDATE → FACT001_EXISTING_ENGINE_OR_COMPOSITION_REVIEW`

Ese resultado **no crea un motor**, no muta el Engine Registry y no autoriza FACT-001 a saltarse sus contratos.

## Reutilización de arquitectura existente

No se crea un motor lógico nuevo. El V0 reutiliza:

- `LRN-001` y `universal-learning-ingress.mjs` para aprendizaje por evidencia.
- `FACT-001` como único gate futuro para un gap real tras descartar extensión/composición.
- `HEX-001` y sus ocho razones canónicas para excepciones humanas.
- `rsi-domain-autonomy-policies.v0.json` para decidir hasta dónde puede llegar cada dominio.
- Engine Registry canónico de 177 motores como universo válido de targets.
- rollback/rebuild obligatorios en cada manifest.

## Contrato de capability

Toda capability incorpora como mínimo:

- `capability_id`
- `version` semántica
- `company_scope`
- `environment` LAB/PREPROD
- `source_type` + `source_ref`
- `capabilities_provided`
- `capability_tags`
- `compatible_engine_ids` / `compatible_domain_ids`
- `risk_class`
- `confidence`
- `execution_options`
- permisos sin elevación PROD/Trading
- `evidence_refs`
- `rollback_ref`
- `rebuild_ref`

La huella del manifest es determinista. Repetir exactamente `capability_id + version + company_scope` produce `DUPLICATE_NOOP`; intentar cambiar el payload manteniendo la misma versión produce `POLICY_CONFLICT` fail-closed.

## Todos los motores vs. autonomía

**Todos los 177 motores canónicos pueden ser targets explícitos de una capability.** Esto no significa que los 177 reciban autoaplicación.

- Si el motor tiene política de dominio registrada, se respetan `autonomy_mode`, confianza mínima, riesgo permitido, kill switch y rollback.
- Si el motor no tiene política registrada, queda `UNREGISTERED_FAIL_CLOSED` y la capability no puede autoaplicarse.
- Actualmente solo los dominios que ya estaban certificados como `PREPROD_AUTONOMOUS` pueden llegar automáticamente a `PREPROD_CANDIDATE_PROMOTION`.
- Los dominios `ASSISTED` pueden acumular prueba OLD vs NEW y aprendizaje, pero permanecen HOLD para el binding automático.

Por tanto, el V0 hace universal la **capacidad de evaluar y aprender**, no una autorización universal de mutación.

## Coste 0 € y Model/Execution Router

Cada manifest puede declarar varias rutas. La selección es:

1. coste adicional 0 €;
2. determinista;
3. herramienta ya existente;
4. prioridad declarada estable;
5. desempate determinista por `route_id`.

Si no hay ninguna ruta 0 €, la decisión es `HOLD_MONEY_LIMIT` / `MONEY_LIMIT`. No se convierte IA de pago ni SaaS nuevo en requisito.

## Impact analysis

El analizador usa dos vías compatibles:

1. Targets explícitos `compatible_engine_ids` / `compatible_domain_ids`.
2. Coincidencia determinista entre tags de la capability y tokens de los dominios registrados.

Si encuentra motores existentes devuelve `EXTEND_EXISTING`. Si no encuentra ninguno devuelve `FACT001_GAP_CANDIDATE`, sin crear nada.

## OLD vs NEW

La prueba V0 compara:

- `quality_score` ↑
- `cost_eur` ↓
- `latency_ms` ↓
- `error_rate` ↓
- `safety_score` ↑

Cualquier regresión material produce `ROLLBACK_HOLD`. Una mejora sin regresiones solo produce `PREPROD_CANDIDATE_PROMOTION` cuando el dominio ya es `PREPROD_AUTONOMOUS`. En ASSISTED se registra `PREPROD_IMPROVEMENT_PROVEN_ASSISTED_HOLD`.

## Aprendizaje automático

Cada tribunal OLD vs NEW genera un `TRIBUNAL_DECISION` hacia `buildUniversalLearningEventReport()`. La evidencia conserva:

- company
- engine
- capability/version
- decisión
- mejoras
- regresiones
- referencias de evidencia

No contiene secretos ni customer data y no eleva autoridad.

El loop resultante es:

`trabajo/evidencia → prueba → resultado → LRN-001 → futura selección/routing → nueva prueba`

## HUMAN_REQUIRED

Solo se emiten razones canónicas ya existentes. En este V0:

- `HIGH_RISK` para capability HIGH/CRITICAL.
- `LOW_CONFIDENCE` bajo umbral.
- `MONEY_LIMIT` cuando no existe ruta 0 €.
- `POLICY_CONFLICT` para version immutability o incompatibilidad de política que necesita resolución.

Un HOLD ordinario como “dominio sin política” o “falta más evidencia” no se convierte artificialmente en HUMAN_REQUIRED.

## Multiempresa

El registro es `multi_company_ready=true` y los manifests llevan `company_scope`, pero `multicompany_runtime_activation=false`. Los registros se filtran por empresa y no existe autorización cross-company implícita. Esta entrega prepara el contrato sin descongelar el onboarding multiempresa actual.

## Rollback y rebuild

Cada manifest exige referencias explícitas de rollback/rebuild. Cada activación PREPROD guarda el binding anterior en `binding_history`. `rollbackCapabilityBinding()` restaura el binding previo o elimina el primero si no existía.

## Límites que permanecen cerrados

- `prod_authorized=false`
- `prod_write_authorized=false`
- `direct_prod_binding_allowed=false`
- `engine_creation_directly_authorized=false`
- `trading_access=false`
- coste adicional autorizado = `0 €`
- ningún cambio en credenciales Trading
- ningún cambio en App/CRM/Supabase/WordPress/Notion existente
- ningún cambio del Engine Registry de 177 motores

## Acceptance V0

La suite dedicada demuestra:

1. registro idempotente;
2. aislamiento por empresa;
3. PROD directo denegado;
4. preferencia 0 €;
5. HIGH_RISK / LOW_CONFIDENCE canónicos;
6. regresión → rollback/HOLD;
7. mejora → candidato PREPROD cuando el dominio ya es autónomo;
8. `EXTEND_EXISTING` antes de fabricar;
9. gap real → candidato FACT-001, no motor directo;
10. evidencia enviada al ingress universal de aprendizaje;
11. rollback restaura binding previo;
12. determinismo reproducible;
13. los 177 IDs canónicos son targetables, con fail-closed en dominios no registrados;
14. certificado de límites no-PROD / no-coste / no-nuevo-motor.

## Criterio de promoción de esta misión transversal

Solo puede marcarse **HECHO EN PREPROD** después de CI GREEN sobre el head exacto y verificación post-merge. Este documento por sí solo no demuestra despliegue PROD ni autonomía global.
