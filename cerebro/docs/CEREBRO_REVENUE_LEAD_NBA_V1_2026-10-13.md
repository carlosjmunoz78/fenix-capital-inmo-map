# CEREBRO Revenue · LEAD-001 + NBA-001 V1 · 2026-10-13

## Estado

- `LEAD-001`: **PARCIAL / PREPROD IMPLEMENTADO** para scoring determinista normalizado y explicable.
- `NBA-001`: **PARCIAL / PREPROD IMPLEMENTADO** para selección determinista de siguiente mejor acción.
- `SALE-001`: **EXISTENTE EN REGISTRO / POR IMPLEMENTAR EN ESTE LOOP** como consumidor de las decisiones comerciales.
- `CAP-001`: **EXISTENTE EN REGISTRO / POR AUDITAR IMPLEMENTACIÓN FÍSICA**.
- Contacto real externo: **NO ACTIVADO** por este bloque.
- PROD writes: **NO ACTIVADOS**.
- Coste adicional objetivo: **0 €**.

## Contrato funcional V1

Entrada PREPROD normalizada sin PII cruda:

`lead_ref + source + signals + evidence_refs + contact_permission + estimated_value_eur + optional human_required_reason`

Dimensiones calculadas:

- `fit_score`
- `intent_score`
- `urgency_score`
- `contactability_score`
- `confidence`
- `priority_score`
- `conversion_propensity_score`

`conversion_propensity_score` es una heurística determinista y queda marcado expresamente como **NO calibrado / NO probabilidad**. No debe usarse como afirmación estadística hasta existir calibración con outcomes reales.

Siguientes acciones posibles:

- `HUMAN_REQUIRED`
- `DO_NOT_CONTACT`
- `VERIFY_CONTACT_PERMISSION`
- `REQUEST_MORE_EVIDENCE`
- `VERIFY_CONTACT`
- `CONTACT_NOW`
- `FOLLOW_UP_FAST`
- `NURTURE`
- `MONITOR`

## Gobierno

Sólo se aceptan las ocho causas HUMAN_REQUIRED canónicas:

`LEGAL_REQUIRED`, `SIGNATURE_REQUIRED`, `LOW_CONFIDENCE`, `HIGH_RISK`, `POLICY_CONFLICT`, `SECURITY_INCIDENT`, `MONEY_LIMIT`, `CUSTOMER_HUMAN_REQUEST`.

La baja confianza ordinaria del scoring no molesta automáticamente al humano: produce `REQUEST_MORE_EVIDENCE`. HUMAN_REQUIRED sólo se propaga cuando un upstream gobernado ya aporta una de las causas canónicas.

El permiso de contacto precede a la prioridad comercial:

- `DENIED` → `DO_NOT_CONTACT`.
- `UNKNOWN` → `VERIFY_CONTACT_PERMISSION`.
- `CUSTOMER_REQUESTED_CONTACT` → `CONTACT_NOW` si confianza y contactabilidad superan los gates mínimos.

## Privacidad y seguridad

La capability rechaza campos de PII/secretos crudos como email, teléfono, dirección, documentos identificativos, IBAN, contraseñas, tokens, JWT, API keys o claves privadas. `lead_ref` y `evidence_refs` deben ser referencias opacas seguras.

Objetivo: que JOB-001 transporte referencias y señales normalizadas, no datos personales innecesarios.

## Dependencias

Flujo actual:

`fuente/CAP-001 (por auditar) → LEAD-001 V1 → NBA-001 V1 → SALE-001 (siguiente bloque)`

Ejecución:

`LEAD-001 job lead.score-and-route → JOB-001 durable V1 → durable-worker-runner-v1 → leadScoreAndNbaJobHandler`

Dependencias reutilizadas, no duplicadas:

- `JOB-001` durable V1: idempotencia, persistencia, retry, checkpoint, lease, dead-letter.
- worker runner V1: timeout, heartbeat, cancelación, fairness multiempresa.
- Engine Registry canónico: `LEAD-001`, `NBA-001`, `SALE-001` ya existen; no se crea motor nuevo.
- Tribunal/shadows existentes para límites de autoridad y aislamiento de App.

## Runbook PREPROD

1. Normalizar señales sin PII cruda.
2. Encolar `lead.score-and-route` con contexto `{company_id, engine_id:'LEAD-001', environment:'PREPROD', version}`.
3. Registrar `leadScoreAndNbaJobHandler` en el durable worker runner.
4. Ejecutar el job.
5. Persistir/consumir únicamente el resultado del scoring y la recomendación gobernada.
6. No ejecutar contacto externo desde esta capability.
7. Si el resultado es `HUMAN_REQUIRED`, enrutar exclusivamente por el supervisor de excepciones existente.
8. Si CI, tribunal o aislamiento se ponen rojos, no promover.

## Backup / rollback / rebuild

- Backup lógico: Git + commits/PR + journals de JOB-001 en PREPROD.
- Rollback de esta capability: revertir el merge correspondiente o dejar de registrar `lead.score-and-route`; no requiere migración destructiva.
- Rebuild: checkout de SHA + Node 24 + `npm test` dentro de `cerebro`; la capability no necesita servicio de pago ni Supabase para reconstruirse.
- El scoring es determinista sobre inputs normalizados; mismas entradas normalizadas y misma versión deben producir el mismo `decision_id`.

## Tests y promoción

Gate dedicado: `.github/workflows/cerebro-revenue-lead-nba-v1.yml`.

Comprueba:

- determinismo;
- evidencia negativa;
- permiso de contacto;
- solicitud explícita del cliente;
- baja confianza sin falsa excepción humana;
- ocho causas HUMAN_REQUIRED;
- bloqueo de PII/secretos;
- PREPROD/engine boundary;
- no falsa probabilidad calibrada;
- ejecución real por JOB-001 durable + worker runner;
- validación del Engine Registry;
- regresión completa de CEREBRO.

Promoción posterior requerida:

`PREPROD → OLD vs NEW con outcomes reales → calibración → tribunal → canary → PROD gradual`.

## Límite de evidencia

Este documento no afirma que CAP-001 capture leads reales ni que SALE-001 contacte clientes de forma autónoma. A fecha de este bloque, la evidencia física nueva corresponde únicamente a scoring/NBA PREPROD y su ejecución durable side-effect-free.
