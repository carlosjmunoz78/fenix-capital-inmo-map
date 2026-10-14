# CEREBRO OS · FASE 13 · Marketing, Ads, SEO, Local, Social y feedback offline · Bloques 152–161 V0

**Fecha:** 2026-10-14  
**Ámbito:** `PREPROD`  
**Coste adicional objetivo:** 0 €  
**PROD:** OFF  
**Motores nuevos:** ninguno

## Contrato de fase

La fuente maestra define:

| Bloque | Capacidad | Decisión V0 |
|---:|---|---|
| 152 | Claude Ads patterns | portar patrones a skill neutral; sin dependencia de Claude |
| 153 | Ads audit | capacidad de `MKT-001` |
| 154 | Competitor ads scan | capacidad de `COMPET-001` |
| 155 | Creative testing | `MKT-001 + EVA-001` |
| 156 | Landing experimentation | `MKT-001 + CAP-001 + EVA-001` |
| 157 | SEO existente | envolver `SEO-001`, nunca sustituir |
| 158 | Local SEO | `SEO-001 + LOCALP-001` |
| 159 | Social audit | `SOCAUD-001 + MKT-001` |
| 160 | c15t / LibreConsent | LAB/benchmark web-compliance |
| 161 | Google/Meta offline conversion feedback | `CAP-001 + LRN-001` |

## Inventario OLD antes de NEW

### EXISTENTE

- `SEO-001` figura como operativo en la especificación canónica. Por tanto este PR no construye un SEO alternativo.
- `MKT-001` existe y está parcial; la fase añade contratos de audit/experimento, no lo reemplaza.
- `COMPET-001`, `LOCALP-001` y `SOCAUD-001` ya son IDs canónicos.
- `EVA-001`, `CAP-001`, `LRN-001`, `WEB-001` y `OBSERV-001` ya existen en Engine Registry.

### POR AUDITAR / no fingido como operativo

- adapters vivos Google Ads y Meta para offline conversions;
- escritura viva WordPress/GSC/GBP/social desde esta capa;
- conectores de ads de competidores;
- instalación/configuración de c15t o LibreConsent;
- publicación o gasto de campañas.

## Implementación V0

### 152 · Neutral Ads Patterns

Los patrones útiles se expresan como componentes neutrales: audiencia, ángulo, creatividades, coherencia con landing, medición y seam económico stop/scale. `claude_required=false`; la capacidad no queda atada a un proveedor IA.

### 153 · Ads Audit

Audit determinista de tracking, ruta de offline conversion, cap de presupuesto, consentimiento, atribución, alineación landing y número de variantes creativas. Devuelve gaps; nunca lanza campaña.

### 154 · Competitor Ads Scan

`COMPET-001` genera un plan de análisis de oferta, ángulo, formato, CTA, landing y posicionamiento visible. Solo acepta web pública o conectores autorizados. El scraping prohibido queda bloqueado.

### 155 · Creative Testing

`MKT-001` compone con `EVA-001`: hipótesis, control, variantes y métrica principal `CONTRIBUTION_MARGIN_CENTS`. No publica y no gasta.

### 156 · Landing Experimentation

Plan `MKT-001 + CAP-001 + EVA-001`; control y variante mediante referencias opacas. No escribe web ni despliega.

### 157 · SEO existente

`wrapExistingSeo001()` declara explícitamente `replace_existing=false` y `preserve_existing_runtime=true`. Únicamente abre seams futuros para research, content, technical, internal linking, GSC feedback y refresh. WordPress/GSC/SEO writes permanecen OFF.

### 158 · Local SEO

Compone `SEO-001 + LOCALP-001` sobre señales estructuradas NAP, GBP, categorías, servicios, reviews y citations. Devuelve gaps; no modifica Google Business Profile ni citations.

### 159 · Social Audit

`SOCAUD-001 + MKT-001`; analiza completitud, frecuencia, formatos, engagement, marca, gaps, competencia y calendario desde fuentes públicas/autorizadas. No escribe en redes.

### 160 · c15t / LibreConsent

Benchmark LAB bajo `WEB-001`. No se declara como implementación de `CONS-001`: la especificación canónica de `CONS-001` cubre consentimiento/firma documental y no demuestra que sea el owner de una CMP web. V0 puntúa privacidad, self-host, integración y mantenimiento; no instala ni cambia configuración.

### 161 · Google/Meta offline conversion feedback

`CAP-001` genera un plan de feedback económico hacia `LRN-001` y `OBSERV-001` para `GOOGLE_ADS` o `META`, usando referencias opacas y `contribution_margin_cents`. No acepta PII, no sube conversiones y no escribe plataformas. Si en el futuro se solicita ejecución con consentimiento/base legal no validada, el runtime bloquea con `LEGAL_REQUIRED`.

## Guardrails

- PREPROD exacto y tenant isolation por `company_id`.
- PROD OFF.
- Ad spend/budget mutation OFF.
- Publish de campaña OFF.
- WordPress/GSC/SEO/GBP/social writes OFF.
- Offline conversion upload OFF.
- Instalación/configuración de herramientas de consentimiento OFF.
- Credenciales de proveedores prohibidas.
- PII, atributos sensibles y payloads crudos prohibidos.
- Scraping prohibido OFF; solo fuentes públicas/autorizadas.
- Trading OFF.
- Coste adicional 0 €.
- Sin nueva tabla Supabase.
- Idempotencia fail-closed.
- Telemetría metadata/hash hacia `OBSERV-001`.

## HUMAN_REQUIRED

Solo las ocho razones canónicas. Gasto o aumento de presupuesto → `MONEY_LIMIT`; publish/write/upload/install todavía no autorizado → `POLICY_CONFLICT`; ejecución de offline feedback sin consentimiento/base legal validada → `LEGAL_REQUIRED`; cross-company → `SECURITY_INCIDENT`; baja confianza → `LOW_CONFIDENCE`; alto riesgo → `HIGH_RISK`; solicitud humana del cliente → `CUSTOMER_HUMAN_REQUEST`.

## Tests y aceptación

El gate dedicado debe ejecutar tests focalizados 152–161, parse de contrato/evidence JSON, `npm run validate` del Engine Registry y la regresión completa `cd cerebro && npm test`.

CI verde solo permite `PREPROD_CODE_TESTED_PLAN_ONLY`. No demuestra adapters vivos, publicación, gasto, modificaciones SEO/web/GBP/social ni offline upload.

## Backup, rollback y rebuild

No hay migración ni side effects. Backup = branch/commit Git. Rollback = revertir PR/commit. Rebuild = Engine Registry + profile + runtime + tests y reejecutar CI.

## Promoción futura

Antes de cualquier side effect: inventario del adapter vivo y readers/writers, permisos, consentimiento/compliance, snapshot/backup, comportamiento OLD, comparación OLD vs NEW, `EVA-001`, `JDG-001`, observabilidad, coste/FinOps, rollback probado y promoción explícita. `SEO-001` siempre se preserva hasta probar una mejora compatible.
