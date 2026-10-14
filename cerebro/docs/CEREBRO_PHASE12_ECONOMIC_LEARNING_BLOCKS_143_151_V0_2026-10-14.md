# CEREBRO OS · FASE 12 · Atribución y aprendizaje económico · Bloques 143–151 V0

**Fecha:** 2026-10-14  
**Ámbito:** `PREPROD`  
**Coste adicional objetivo:** 0 €  
**PROD:** OFF  
**Motores nuevos:** ninguno

## Fuente contractual

La secuencia maestra define exactamente:

| Bloque | Capacidad | Destino |
|---:|---|---|
| 143 | revenue attribution | OBS/LRN/Marketing |
| 144 | source→lead→meeting→sale→margin | CRM/LRN |
| 145 | campaign ROI | Marketing/LRN |
| 146 | agent/action ROI | LRN |
| 147 | channel ROI | LRN |
| 148 | WTP real | Product Factory |
| 149 | pricing experiments | Product/LRN |
| 150 | FREE_PARITY_GATE | Product Factory existente |
| 151 | automatic stop/scale | CAP/LRN |

La regla de la fase es pasar de optimizar clics a aprender qué produce margen. El contrato indica además que no debe crearse un motor nuevo salvo que una auditoría pruebe un gap real.

## Inventario y resolución de dependencias

### EXISTENTE

El Engine Registry canónico contiene `LRN-001`, `MKT-001`, `CRM-001`, `OBSERV-001`, `FINOPS-001`, `EXP-001`, `FREE-001` y `CAP-001`. Por tanto esta fase se implementa como capability compartida sobre motores existentes.

### Corrección de ambigüedad OBS

El catálogo contiene dos IDs distintos:

- `OBS-001` = Motor de Obsolescencia / Desaprendizaje.
- `OBSERV-001` = Motor de Observabilidad.

FASE 12 usa `OBSERV-001` para eventos, métricas y trazas económicas. No se conecta atribución económica al motor de obsolescencia.

### Estado documental relevante

- `LRN-001`: PARCIAL; falta pipeline automático evento→resultado→comparación→aprendizaje→regla candidata→validación.
- `MKT-001`: PARCIAL; falta atribución y optimización integrada.
- `FINOPS-001`: PLANIFICADO; debe instrumentar costes por motor/tarea/API/IA/storage, ahorro, alertas y presupuesto.
- `EXP-001`: PARCIAL; falta contrato común hipótesis→control→experimento→métrica→decisión.
- `FREE-001`: PLANIFICADO; debe decidir recurso por coste/cuota/privacidad/duración/carga con pago solo por excepción.
- `CAP-001`: PLANIFICADO; debe decidir canal/campaña/landing/creatividad/presupuesto y stop/scale.

V0 no finge que esas integraciones estén físicamente conectadas; solo establece y prueba el contrato determinista común.

## Implementación HECHA en esta rama

`cerebro/economics/phase12-economic-learning-runtime-v0.mjs` añade funciones deterministas y sin side effects.

### 143 · Revenue attribution

Construye una atribución cerrada mediante referencias opacas y calcula:

`revenue - direct_cost - acquisition_cost - operating_cost = contribution_margin`

La atribución declara como dependencias `CRM-001`, `MKT-001`, `OBSERV-001`, `FINOPS-001` y `LRN-001`.

### 144 · source→lead→meeting→sale→margin

Mantiene la cadena completa `source_ref → lead_ref → meeting_ref → sale_ref → contribution_margin_cents`. `CRM-001` permanece fuente de verdad; V0 no escribe CRM.

### 145–147 · ROI de campaña, agente/acción y canal

El ROI económico usa margen atribuible y coste incremental:

`ROI = (attributed_gross_margin - incremental_cost) / incremental_cost`

Si el coste incremental es 0 no se devuelve infinito: el ratio es `null` y se emite un estado explícito `ZERO_COST_*`. La métrica primaria es margen, no clics, impresiones ni interacciones.

`agent/action ROI` solo acepta referencias opacas y no usa atributos sensibles del trabajador.

### 148 · WTP real

`evaluateObservedWtp()` consume evidencia agregada por precio: ofertas, aceptaciones y margen realizado. Solo considera puntos con muestra mínima y aceptación mínima; si no existe evidencia suficiente devuelve `WTP_INSUFFICIENT_EVIDENCE` y no inventa una disposición a pagar.

El candidato WTP se elige por margen realizado entre puntos que pasan los mínimos. No existe pricing individual ni segmentación sensible.

### 149 · Pricing experiments

`buildPricingExperiment()` reutiliza el contrato conceptual de `EXP-001`: hipótesis→control→experimento→métrica→decisión. La métrica primaria es `CONTRIBUTION_MARGIN_CENTS`; conversión/aceptación son secundarias.

V0 prepara control y variantes pero mantiene `live_price_mutation_authorized=false`.

### 150 · FREE_PARITY_GATE

`evaluateFreeParityGate()` compara ruta gratuita/local y ruta de pago mediante cobertura funcional, calidad, fiabilidad, latencia, privacidad y coste. Emite exactamente una recomendación:

- `HOLD`: la ruta gratuita satisface paridad o no existe caso económico defendible.
- `BUILD`: existe gap gratuito pero es razonable cerrarlo internamente.
- `PAY`: la opción de pago aporta ventaja material y además existe margen/ROI positivo defendible.

`PAY` es solo recomendación. Compra, suscripción o gasto permanecen desautorizados; una petición real de compra se bloquea con `HUMAN_REQUIRED:MONEY_LIMIT`.

### 151 · Automatic stop/scale

`buildAutomaticStopScaleDecision()` usa tamaño mínimo de muestra + ROI económico para producir `STOP`, `HOLD` o `SCALE`.

No muta campañas ni presupuestos. Una petición de ejecutar `SCALE` queda bloqueada por `MONEY_LIMIT`; cualquier otro side effect no autorizado queda fail-closed.

## Guardrails

- `environment=PREPROD` exacto.
- `company_id` obligatorio y aislamiento cross-company fail-closed.
- Sin PROD/PROD writes.
- Sin gasto publicitario real.
- Sin cambio de presupuestos real.
- Sin cambio de precio real.
- Sin compra/suscripción a proveedor.
- Sin credenciales de proveedor.
- Sin PII cruda ni atributos sensibles.
- Sin pricing personalizado por persona.
- Sin acceso a Trading.
- Sin migración ni nueva tabla Supabase para V0.
- Costes monetarios en céntimos enteros.
- Idempotencia por `company_id|engine_id|request_id|operation`.
- Telemetría metadata/hash solamente.
- `HUMAN_REQUIRED` limitado a las ocho razones canónicas.

## Runbook PREPROD

1. Seleccionar el motor canónico del bloque (`LRN-001`, `MKT-001`, `EXP-001`, `FREE-001` o `CAP-001`).
2. Proporcionar `company_id`, `engine_id`, `environment=PREPROD`, `version`, `request_id` y referencias opacas.
3. Introducir importes en céntimos enteros y evidencia agregada.
4. Ejecutar la función determinista del bloque.
5. Conservar cualquier decisión como plan/evidencia; nunca ejecutar gasto, pricing, campaña o PROD desde este runtime.
6. Usar `createEconomicLedger()` para repetición/idempotencia.
7. Emitir telemetría solo mediante `buildEconomicTelemetry()` hacia seams `OBSERV-001`/`FINOPS-001`.
8. Para convertir una decisión en side effect vivo, abrir un gate posterior con permisos, policy, presupuesto, evaluación y tribunal.

## OLD vs NEW

V0 no sustituye métricas, CRM, Marketing, FinOps, experimentación, Product Factory ni Captación. Los envuelve con un contrato económico transversal. La futura conexión a fuentes reales debe comparar resultados OLD vs NEW antes de promoción.

## Tests y aceptación

El workflow dedicado ejecuta:

1. tests focalizados 143–151;
2. parse de profile/evidence JSON;
3. validación del Engine Registry canónico;
4. regresión completa `cd cerebro && npm test`.

CI verde solo permite afirmar `PREPROD_CODE_TESTED_PLAN_ONLY`. No prueba atribución física desde CRM/ads, cambios reales de precio, gasto real ni stop/scale real.

## Backup, rollback y rebuild

No hay migración de datos ni side effects. Backup = branch/commit Git. Rollback = revertir el PR/commit FASE 12. Rebuild = Engine Registry + profile + runtime + tests y reejecutar validación/CI.

## Promoción futura

Antes de cualquier automatización viva: inventario de readers/writers/adapters, contratos de datos reales, permisos, presupuestos, compliance, OLD vs NEW, `EVA-001`, `JDG-001`, observabilidad, FinOps medido, idempotencia durable, rollback probado y promoción explícita. `PAY` nunca equivale a autorización de compra.
