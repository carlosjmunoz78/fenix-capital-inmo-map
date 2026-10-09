# CEREBRO Skill Capability Evolution V0

Fecha: 2026-10-09  
Estado de implementación en esta rama: CANDIDATE / PREPROD ONLY  
Coste adicional objetivo: 0 EUR

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

Cada resultado medido se transforma en un learning record compatible con `LRN-001`. Las mejoras aprobadas continuan hacia tribunal. Los resultados negativos se conservan como evidencia de aprendizaje pero no autorizan promocion.

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

## Rebuild

El registro de skills es reproducible desde manifests canonicos. Los fingerprints son deterministas respecto al contrato y no dependen del timestamp de registro. Los planes OLD vs NEW se regeneran a partir del manifest canonico + descriptores de motores.

## Estado de autonomia

- LAB: permitido para pruebas locales.
- PREPROD: objetivo operativo de V0.
- PROD global: NO autorizado.
- Autoaplicacion: solo puede avanzar en los dominios cuya politica de autonomia ya lo permita y siempre tras evaluacion + tribunal + supervisor.
- Trading: aislado y no accesible.

## Aceptacion V0

La certificacion debe demostrar como minimo:

1. idempotencia y conflicto de version;
2. campos multiempresa;
3. impacto determinista;
4. prioridad de ampliar motor existente;
5. gap real genera candidato FACT-001, nunca motor directo;
6. OLD vs NEW bloquea regresiones;
7. resultado llega a LRN-001;
8. rollback ante regresion;
9. HUMAN_REQUIRED fuera del canon es rechazado;
10. coste adicional 0 EUR;
11. PREPROD fail-closed y sin PROD global;
12. no regresion de seguridad/politicas.
