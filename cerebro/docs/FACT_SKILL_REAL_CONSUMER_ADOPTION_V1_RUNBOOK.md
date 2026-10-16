# FACT-SKILL-NATIVE · REAL CONSUMER ADOPTION V1

## Estado

`PARCIAL_AWAITING_EXACT_HEAD_CI` hasta que exista evidencia viva exact-head, Governed Main y ejecución automática de `main`.

## Objetivo

Endurecer el contrato anterior de `FACT-SKILL-NATIVE` sin romperlo. Un binding receipt, un `consumed:true`, un heartbeat o una entrega de evento NO prueban consumo funcional. Para `FULL_E2E_REAL_PREPROD`, cada consumidor aplicable debe leer campos concretos de la salida FACT y producir una decisión/outcome semántico verificable.

## Regla de preservación

No se modifica ni elimina el runtime técnico existente de FACT ni el loop operacional Lote 1+2. Esta capa es paralela y estricta:

`FACT producer -> strict consumer adapters -> semantic outcomes -> LRN/telemetry -> persistent evidence -> strict gate`

PROD, Trading, gasto, Android, provider writes, CRM writes y DB mutation permanecen denegados.

## Consumidores obligatorios

| Consumidor | Clase | Uso funcional probado |
|---|---|---|
| ROUTE-001 | REAL_RUNTIME_CONSUMER | usa bindings, decisión FACT y autorización PREPROD para aplicar/retener rutas |
| SEC-001 | GOVERNANCE_CONSUMER | usa provenance, supply-chain, licencia, scope de permisos y denegación PROD |
| QA-001 | GOVERNANCE_CONSUMER | usa `native_full`, estado y gates reales para PASS/FAIL |
| EVA-001 | GOVERNANCE_CONSUMER | consume outcomes ROUTE+SEC+QA y ejecuta Evaluation/Tribunal existente |
| LRN-001 | LEARNING_CONSUMER | consume el evento real `skill.native.learning.feedback`, lo localiza y persiste en RSI outbox |
| OBSERV-001 | TELEMETRY_CONSUMER | persiste hash/estado/idempotencia del productor en ledger operativo |
| FINOPS-001 | TELEMETRY_CONSUMER | persiste coste real del productor y bloquea cualquier regresión sobre 0 € |

## Prueba fuerte de consumo

No basta con comprobar que existe un receipt. Los tests mutan la salida del productor y exigen que el consumidor cambie de decisión:

- quitar autorización PREPROD -> ROUTE-001 pasa a HOLD;
- romper scope de permisos -> SEC-001 deniega;
- introducir failed gate -> QA-001 falla y EVA-001 no aprueba;
- retirar feedback event -> LRN-001 queda incompleto;
- desconectar observabilidad -> OBSERV-001 falla;
- introducir coste > 0 -> FINOPS-001 falla.

Si una mutación relevante no altera la decisión del consumidor, ese consumidor NO cuenta como adopción funcional.

## Persistencia / reanudación

- LRN outbox se persiste por compañía y el segundo replay debe crear 0 batches nuevos.
- OBSERV/FINOPS reutilizan sus ledgers persistentes y no duplican evidencia para la misma correlación.
- Una segunda ejecución sobre el mismo workdir debe mantener FULL y conservar conteos estables.

## Criterio exacto de FULL

Solo puede marcarse `FULL_E2E_REAL_PREPROD` cuando:

1. los 7 consumidores están presentes;
2. los 7 consumen realmente campos de la salida FACT;
3. los 7 producen el outcome esperado;
4. cobertura funcional = 1;
5. Evaluation/Tribunal = PASS;
6. feedback LRN persistido e idempotente;
7. estado persistente/reanudable;
8. observabilidad y FinOps persistidos;
9. coste adicional = 0 €;
10. PROD/Trading/Android/escrituras externas = OFF;
11. CI exact-head = GREEN;
12. Governed Main = GREEN;
13. merge a `main`;
14. ejecución automática de `main` = GREEN.

## Rollback

Eliminar/desactivar únicamente la capa estricta nueva y volver al contrato técnico anterior. No se toca la implementación FACT previa ni sus registros históricos.

## Rebuild

Reproducible desde:

- `cerebro/runtime/fact-skill-real-consumer-adoption-v1.mjs`
- `cerebro/tests/fact-skill-real-consumer-adoption-v1.test.mjs`
- `cerebro/registry/fact-skill-real-consumer-adoption-v1.json`
- `.github/workflows/cerebro-fact-skill-full-e2e-real-v1.yml`

## next_block

Después del cierre real de FACT: `GH-SAFE-NATIVE_REAL_CONSUMER_ADOPTION_TO_FULL_E2E`.
