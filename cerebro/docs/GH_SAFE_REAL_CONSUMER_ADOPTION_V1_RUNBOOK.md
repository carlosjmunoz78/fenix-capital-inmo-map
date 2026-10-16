# GH-SAFE-NATIVE · REAL CONSUMER ADOPTION V1

## Estado

`PARCIAL_AWAITING_EXACT_HEAD_CI` hasta completar exact-head CI, Governed Main, RSI, merge a `main` y ejecución automática del mismo circuito en `main`.

## Gap auditado

El contrato operacional anterior podía demostrar bindings/receipts sin demostrar que cada consumidor aplicable utilizase realmente el output de `GH-SAFE-NATIVE`. Esta capa estricta es aditiva y no sustituye ni modifica el runtime legacy.

También se detectó una contradicción de ownership: el registry operacional antiguo declara owner `SEC-001`, mientras el registry nativo y el runtime identifican `FACT-001`. La capa estricta resuelve owner a `FACT-001` por evidencia viva, sin reescribir el registro legacy dentro de este bloque.

## Ruta real

`GH-SAFE producer -> authorized PREPROD adapter -> FACT/QA/MIG/RBLD/DEP -> EVA/Tribunal -> OBSERV/FINOPS -> LRN outbox -> persisted strict state`

El adaptador de CI es un sandbox first-party determinista, inyectado por el contrato ya existente de `executeGitHubSafeAction`. No ejecuta código upstream, no toca PROD y no realiza mutaciones externas. La propia promoción de esta implementación por branch/PR/checks/merge aporta después la evidencia GitHub viva externa.

## Consumidores obligatorios

| Consumidor | Clase | Uso funcional |
|---|---|---|
| FACT-001 | REAL_RUNTIME_CONSUMER | branch + commit + PR deben enlazar al mismo head y nunca usar commit directo a main |
| QA-001 | GOVERNANCE_CONSUMER | consume checks, conclusión y exact-head del commit |
| EVA-001 | GOVERNANCE_CONSUMER | consume outcomes de FACT/QA/MIG/RBLD/DEP en OLD vs NEW + Tribunal |
| MIG-001 | REAL_RUNTIME_CONSUMER | consume compare reversible, ahead/behind y rollback-ready |
| RBLD-001 | REAL_RUNTIME_CONSUMER | consume el rollback real del bundle y exige restaurar baseline |
| DEP-001 | REAL_RUNTIME_CONSUMER | consume merge exact-head + checks GREEN manteniendo PROD denegado |
| OBSERV-001 | TELEMETRY_CONSUMER | persiste hash y cobertura del bundle completo |
| FINOPS-001 | TELEMETRY_CONSUMER | consume el coste de todas las operaciones y exige 0 € |

`LRN-001` es sink transversal obligatorio para FULL, sin alterar artificialmente la lista histórica de 8 required consumers.

## Prueba semántica obligatoria

Los tests cambian output real del productor y exigen que cambie la decisión del consumidor:

- PR head != commit -> FACT HOLD;
- CI failed/exact-head roto -> QA FAIL y EVA no PASS;
- compare no reversible -> MIG HOLD;
- rollback no restaura baseline -> RBLD FAIL;
- merge expected-head != PR -> DEP HOLD;
- bundle incompleto/alterado -> OBSERV FAIL;
- coste > 0 -> FINOPS FAIL;
- ausencia de feedback -> FULL bloqueado por LRN.

Un receipt declarado no cuenta como adopción funcional si una mutación relevante no cambia el outcome.

## Persistencia / reanudación

- state estricto persistido en JSON con conflicto fail-closed;
- LRN outbox idempotente, segundo replay crea 0 batches;
- OBSERV/FINOPS reutilizan correlación y no duplican eventos en reanudación;
- misma entrada + mismo workdir debe conservar hashes de bundle, consumidores y outcome.

## Criterio FULL

Solo `FULL_E2E_REAL_PREPROD` cuando:

1. los 8 consumidores declarados están presentes;
2. los 8 usan campos concretos de la salida GH-SAFE;
3. los 8 producen el outcome esperado;
4. OLD vs NEW + Tribunal = PASS;
5. LRN feedback persistido e idempotente;
6. estado persistente/reanudable;
7. observabilidad y FinOps persistidos;
8. coste adicional 0 €;
9. PROD/provider/CRM/DB/spend/trading/Android = OFF;
10. CI exact-head GREEN;
11. Governed Main GREEN;
12. RSI GREEN;
13. merge a `main`;
14. ejecución automática en `main` GREEN.

## Rollback

Retirar únicamente esta capa estricta y su workflow. `github-safe-native-v1.mjs`, el wrapper previo y el loop operacional Lote 1+2 permanecen sin cambios.

## Rebuild

Reproducible desde:

- `cerebro/runtime/gh-safe-real-consumer-adoption-v1.mjs`
- `cerebro/tests/gh-safe-real-consumer-adoption-v1.test.mjs`
- `cerebro/registry/gh-safe-real-consumer-adoption-v1.json`
- `.github/workflows/cerebro-gh-safe-full-e2e-real-v1.yml`

## next_block

Tras certificar GH-SAFE: `DB-SAFE-NATIVE_REAL_CONSUMER_ADOPTION_TO_FULL_E2E`.
