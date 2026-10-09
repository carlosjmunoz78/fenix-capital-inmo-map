# CEREBRO Skill Capability Evolution V0

Fecha: 2026-10-09  
Estado: **HECHO / MERGED / CERTIFIED PREPROD**  
Merge principal: `0c92fa1ba1b72d3ef4f1a772990d4d17428dee70`  
PR de implementación: `#537`  
Coste adicional objetivo y medido en contrato: **0 EUR**

## Objetivo

Conectar cualquier skill/capability nueva al ciclo de evolución continua ya existente sin crear un runtime paralelo ni ampliar autoridad. El flujo canónico es:

`NUEVA SKILL -> REGISTRO -> IMPACTO -> OLD VS NEW -> LRN-001 -> TRIBUNAL/SUPERVISOR -> PROMOCION SEGURA O ROLLBACK`

Si no existe un motor compatible, se genera exclusivamente un candidato de gap para FACT-001. No se crea ni promociona un motor nuevo directamente.

## Contrato universal de skill

Campos obligatorios: `company_id`, `environment=PREPROD`, `skill_id`, `skill_version`, `capabilities`.

Campos normalizados: `engine_id=SKILL-REGISTRY`, `version=0.1.0`, `inputs`, `outputs`, `tags`, `permissions`, `risk_class`, `source`, `skill_fingerprint`, `idempotency_key`, `registered_at`.

Restricciones fail-closed:

- `additional_cost_eur = 0`.
- `prod_authorized = false`.
- `prod_write_authorized = false`.
- `trading_access = false`.
- Solo son validos los codigos HUMAN_REQUIRED canonicos.
- Un mismo `skill_id + skill_version` no puede mutar su contrato.

## Dependencias conservadas

- Persistencia local atomica existente: `runtime/persistent-runtime.mjs`.
- Contratos RSI existentes: `runtime/continuous-improvement-contract.mjs`.
- Aprendizaje persistente existente: `runtime/learning-ledger.mjs` (`LRN-001`).
- FACT-001 existente permanece como unica fabrica de scaffold; esta capa solo emite gap candidato.
- Tribunal, Supervisor, autonomia por dominio, permisos, rollback y rebuild siguen siendo gates obligatorios existentes.
- Skill Discovery/Supply Chain existente permanece intacto; esta capa cierra el enlace universal desde manifest admitido hasta impacto, experimento y aprendizaje.

No se sustituye ningun runtime, motor, tabla, workflow o integracion existente.

## Impact Analyzer

Analisis determinista y 0 EUR. Compara capabilities, inputs, outputs y tags de la skill con descriptores de motores de la misma empresa. Prioriza `EXTEND_EXISTING_ENGINE`.

Si no existe compatibilidad suficiente:

- `gap_detected = true`.
- `factory_action = FACT001_REGISTRY_CANDIDATE_REQUIRED`.
- `create_new_engine_authorized = false`.
- `next_gate = FACT001_CAPABILITY_GAP_REVIEW`.

Esto preserva Factory First sin fabricar motores duplicados.

## OLD vs NEW

Cada impacto compatible produce un plan PREPROD con:

- misma evidencia/dataset para baseline y candidato;
- policy y permissions bloqueados;
- rollback y rebuild obligatorios;
- coste adicional 0 EUR;
- PROD y Trading deshabilitados.

La evaluacion rechaza automaticamente regresiones de coste, seguridad, politica o metricas medibles. Un candidato que no demuestra mejora queda en rollback.

## Aprendizaje LRN-001

Cada resultado medido se transforma en un learning record compatible con `LRN-001`.

- Un resultado `PASS` queda como `promotion_state=CANDIDATE` y continua hacia tribunal.
- Un resultado `FAIL` queda como `promotion_state=REJECTED`: se conserva como aprendizaje, pero no puede volver a materializarse como candidato de mejora.

## Runbook

1. Recibir/normalizar manifest de skill.
2. Registrar idempotentemente.
3. Ejecutar Impact Analyzer contra el catalogo de motores de `company_id`.
4. Para motores compatibles, crear planes OLD vs NEW.
5. Ejecutar experimentos con el runtime de experimentacion existente.
6. Evaluar baseline vs candidate.
7. Persistir aprendizaje en LRN-001.
8. PASS -> tribunal/supervisor/politicas antes de cualquier promocion.
9. FAIL -> rollback del candidato; conservar evidencia para evitar repetir la estrategia.
10. Gap real -> FACT-001 capability gap review; extender motor existente sigue teniendo prioridad.

## Rollback

La capa no modifica PROD. Si un candidato empeora una metrica, aumenta coste o introduce una regresion de seguridad/politica, el resultado es `ROLLBACK`. La version baseline permanece como referencia y la candidate no recibe autoridad de promocion.

Los resultados FAIL se persisten como evidencia `REJECTED`, evitando que el candidate factory generico los recicle como mejora valida.

## Rebuild

El registro de skills es reproducible desde manifests canonicos. Los fingerprints son deterministas respecto al contrato y no dependen del timestamp de registro. Los planes OLD vs NEW se regeneran a partir del manifest canonico + descriptores de motores.

## Estado de autonomia

- LAB: permitido para pruebas locales.
- PREPROD: **operativo/certificado para este V0**.
- PROD global: **NO autorizado**.
- Autoaplicacion: solo puede avanzar en los dominios cuya politica de autonomia ya lo permita y siempre tras evaluacion + tribunal + supervisor.
- Trading: aislado y no accesible.

Esta ampliacion transversal no crea un Paso 7: los seis pasos canonicos de CEREBRO permanecen cerrados y esta capa se integra sobre ellos.

## Certificacion V0

La implementacion certificada demuestra:

1. idempotencia y conflicto de version;
2. campos multiempresa;
3. impacto determinista;
4. prioridad de ampliar motor existente;
5. gap real genera candidato FACT-001, nunca motor directo;
6. OLD vs NEW bloquea regresiones;
7. resultado llega a LRN-001;
8. rollback ante regresion;
9. aprendizaje negativo queda REJECTED y no vuelve a promocion;
10. HUMAN_REQUIRED fuera del canon es rechazado;
11. coste adicional 0 EUR;
12. PREPROD fail-closed y sin PROD global;
13. no regresion de seguridad/politicas;
14. aislamiento de App conservado;
15. Step 6 permanece CLOSED SAFE.

## Evidencia de aceptación

- PR `#537` head `0987955832ce23f989c612d85cca16c5d44cdf83`.
- `CEREBRO RSI Promotion Readiness Shadow V0` run `37926933527`: `app-surface-isolation-shadow`, `factory-preprod-shadow` y `tribunal-shadow` en SUCCESS.
- `CEREBRO Step6 Domain Promotion Closure V0` PR run `37926933855`: SUCCESS.
- Merge `0c92fa1ba1b72d3ef4f1a772990d4d17428dee70`.
- `PROD Runtime Smoke` post-merge run `37927030302`: SUCCESS. Es smoke de no regresion; no autoriza esta capa en PROD.
- `CEREBRO Step6 Domain Promotion Closure V0` post-merge run `37927030289`: SUCCESS.
- `CEREBRO Skill Discovery Scout` post-merge run `37927030303`: SUCCESS, preservando discovery read-only/fail-closed y supply-chain existente.
- `PROD Live Deploy` run `37927030319`: SKIPPED. No hubo despliegue de esta ampliacion a PROD.

## Changelog 2026-10-09

- Añadido `runtime/skill-capability-evolution.mjs`.
- Añadidos tests de aceptación `tests/skill-capability-evolution.test.mjs`.
- Corregida deuda de path CWD-independiente en tests de cierre Step 6 sin alterar disposiciones ni autoridad.
- Añadida barrera para que evidencia negativa de skills sea aprendida como `REJECTED` y no reciclada como candidato.
- PR #537 fusionada y certificada en PREPROD; PROD global permanece bloqueado.
