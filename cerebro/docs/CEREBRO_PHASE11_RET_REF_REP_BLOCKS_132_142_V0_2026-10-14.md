# CEREBRO OS · FASE 11 · Retención, recomendaciones y reputación · Bloques 132–142 V0

**Fecha:** 2026-10-14  
**Ámbito:** `PREPROD`  
**Motores canónicos:** `RET-001`, `REF-001`, `REP-001`  
**Coste adicional objetivo:** 0 €  
**PROD:** OFF

## Fuente contractual

La lista maestra define:

- 132 `RET-001` → construir.
- 133 churn/abandono score → RET.
- 134 customer rescue → RET.
- 135 upsell/cross-sell → RET/SALE.
- 136 `REF-001` → construir.
- 137 Referral-as-a-Service patterns → REF, LAB.
- 138 mejor momento para referido → REF.
- 139 `REP-001` → construir.
- 140 request review → REP.
- 141 negative review alert → REP.
- 142 respuesta de bajo riesgo → REP, automatizar.

Los tres engine IDs ya existen en el registro canónico. Este cambio no crea motores paralelos.

## Inventario y decisión OLD vs NEW

### EXISTENTE

- Registry canónico con `RET-001`, `REF-001` y `REP-001`.
- `SALE-001` para oportunidades comerciales.
- `COM-001` para comunicación.
- `JOB-001` para ejecución durable futura.
- `HEX-001` para excepciones humanas.
- `NOTIF-001` para alertas.
- El runtime comercial ya contiene recuperación de `NO_SHOW`; FASE 11 no duplica esa máquina de estados.

### DEFINIDO en el Master

- RET: detectar abandono/renuncia y activar recuperación contextual mediante risk score + playbooks.
- REF: pedir referido en el mejor momento usando satisfacción/resultado, sin incentivos complejos inicialmente.
- REP: solicitar reseñas, detectar negativas, clasificarlas y responder automáticamente solo cuando el riesgo sea bajo.

### POR AUDITAR

- Integración viva con Google Business Profile.
- Lectura/escritura viva en CRM para estas capacidades.
- Dispatch real por `COM-001`.
- Señales vivas `C360-001`, `CX-001` y `POST-001` como inputs automáticos.

Ninguna de esas piezas se declara operativa en este V0.

## HECHO en V0

Se añade `cerebro/customer/ret-ref-rep-runtime-v0.mjs`, runtime compartido y determinista que preserva la separación lógica de los tres motores mediante `context.engine_id`.

### RET-001

`scoreChurnRisk()` usa reglas explícitas —sin ML— sobre silencio, proceso estancado, follow-ups fallidos, no-shows, incidencias, caída de engagement y señales explícitas de abandono/renuncia. Devuelve score 0–100, banda y trazabilidad por componentes.

`buildCustomerRescuePlan()` selecciona playbook contextual y genera un intent hacia `COM-001`; no hace dispatch ni escribe CRM.

`buildUpsellCrossSellPlan()` solo declara elegible un caso exitoso, con satisfacción alta, sin incidencias/quejas abiertas y con riesgo de retención bajo; el target es `SALE-001`, sin crear oportunidad real.

### REF-001

`evaluateReferralMoment()` calcula determinísticamente el mejor momento con resultado, satisfacción, feedback positivo, ventana temporal, ausencia de incidencias y ausencia de petición reciente. `Referral-as-a-Service` permanece `LAB_PATTERN_ONLY`. El resultado puede crear un intent hacia `COM-001`, nunca un envío.

### REP-001

`evaluateReviewRequest()` decide si procede solicitar reseña y genera un intent `COM-001`. Google Business queda marcado `POR_AUDITAR_NOT_LIVE_CONNECTED`.

`classifyNegativeReview()` trabaja únicamente con señales estructuradas; no acepta ni persiste texto bruto de la reseña. Clasifica severidad y detecta riesgos legales, fraude/delito, seguridad, privacidad, discriminación/acoso, demandas de compensación o reclamación activa.

`buildNegativeReviewAlert()` prepara alerta a `NOTIF-001` para bajo riesgo o `HEX-001` cuando hay alto riesgo; no envía la alerta.

`buildLowRiskReviewResponse()` genera únicamente un plan/template de respuesta cuando el riesgo es bajo. Nunca publica en Google Business ni otro canal. Cualquier caso de alto riesgo queda bloqueado con `HUMAN_REQUIRED:HIGH_RISK`.

## Guardrails

- `environment=PREPROD` exacto.
- Scope estricto por `company_id`.
- PROD y PROD writes OFF.
- Dispatch externo OFF.
- CRM writes OFF.
- Publicación pública de reseñas/respuestas OFF.
- Google Business write OFF.
- Trading OFF.
- PII, credenciales, texto bruto de reseñas y cuerpos de mensajes prohibidos en estado.
- Telemetría solo metadata/hash.
- `HUMAN_REQUIRED` limitado a razones canónicas.
- Idempotencia fail-closed por `company_id|engine_id|request_id|operation`.
- Coste adicional 0 €.
- V0 no requiere nuevas tablas Supabase.

## Runbook PREPROD

1. Resolver el motor: `RET-001`, `REF-001` o `REP-001`.
2. Construir contexto con `company_id`, `engine_id`, `environment=PREPROD`, `version` y referencias opacas.
3. Ejecutar la función determinista adecuada.
4. Si aparece una razón HUMAN_REQUIRED, bloquear cualquier automatización de salida.
5. Si se genera un intent, conservar `dispatch_authorized=false` / `crm_write_authorized=false` / `public_post_authorized=false`.
6. Para repetición, usar `createPhase11Ledger()`; el futuro side effect durable deberá envolverse con `JOB-001`.
7. Registrar solo telemetría metadata/hash.

## Tests y aceptación

El gate dedicado ejecuta:

- tests focalizados FASE 11;
- parse de profile/evidence JSON;
- validación del registry canónico;
- regresión completa `cd cerebro && npm test`.

El estado máximo tras CI verde es `PREPROD_CODE_TESTED_PLAN_ONLY`. No equivale a integración viva ni a autonomía PROD.

## Backup, rollback y rebuild

No hay migración de datos ni side effects externos. Backup = branch/commits Git. Rollback = revert del PR/commit de FASE 11. Rebuild = registry canónico + `ret-ref-rep-profile.v0.json` + `ret-ref-rep-runtime-v0.mjs` + tests/CI.

## Gate de promoción futura

Antes de habilitar mensajes, CRM o Google Business: inventario de adapters vivos, permisos/consentimiento, tests OLD vs NEW, evaluación `EVA-001`, tribunal `JDG-001`, observabilidad, idempotencia durable `JOB-001`, rollback probado, costes medidos y promoción explícita. Las respuestas REP solo podrán automatizarse en vivo si el clasificador demuestra que el caso es de bajo riesgo.
