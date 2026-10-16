# CAP-NATIVE · Strict Real Consumer Adoption V1

## Estado
Candidate PREPROD. Mantener `PARCIAL` hasta exact-head CI, PR gobernada, merge, repetición automática verde en `main`, certificación y repetición post-certificación.

## Principio
La capa estricta es aditiva. No modifica `cap-native-v1.mjs`, su evidencia nativa ni la matriz operacional compartida. Un binding receipt no cuenta como consumo: cada consumidor debe cambiar una decisión semántica verificable cuando cambian los campos CAP que realmente utiliza.

## Producer chain
Reutiliza el runtime nativo:
1. `SCORE_CHANNELS`.
2. `PLAN_EXPERIMENT`.
3. `DECIDE_STOP_SCALE`.
4. `BUILD_PLAN`.
5. `REPLAY_VERIFY`.

Los datos de spend presentes en los canales son evidencia histórica de entrada. No autorizan gasto nuevo. `recommended_new_spend_eur = 0` y `provider_execution_authorized = false` son gates obligatorios.

## Consumo semántico requerido
- `MKT-001`: decide si existe mezcla de canal/creatividad utilizable para una hipótesis PREPROD sin gasto.
- `SEO-001`: decide si la calidad y score orgánicos justifican una hipótesis de escala SEO.
- `WEB-001`: decide si winner + brazos del experimento contienen landings utilizables y distintas.
- `LEAD-001`: consume volumen, calidad, conversión e ingresos agregados para emitir señal de calidad de lead.
- `EVA-001`: evalúa semánticamente replay, autoridad económica, brazos y winner; su evaluación alimenta un Tribunal independiente.
- `LRN-001`: persiste `cap.consumer.outcome` por RSI outbox con replay idempotente.
- `OBSERV-001`: persiste outcome semántico correlacionado.
- `FINOPS-001`: demuestra coste adicional 0 €.

El Tribunal independiente usa `QA-001:CAP-TRIBUNAL:v1`. `EVA-001` sigue contando como consumidor requerido; el Tribunal es un gate transversal adicional.

## Mutation tests
Debe fallar el consumidor correspondiente cuando se modifica:
- score semántico de Meta → `MKT-001` HOLD;
- ratio de qualified orgánico → `SEO-001` HOLD;
- landing de un brazo → `WEB-001` HOLD;
- calidad agregada de lead → `LEAD-001` HOLD;
- winner evaluado → `EVA-001` HOLD y Tribunal no PASS.

Además se prueba:
- tampering de nueva autoridad de gasto/provider → rechazo antes de downstream;
- LRN ausente → FULL bloqueado;
- rerun durable e idempotente;
- backup → rollback local → rebuild exacto por hash.

## Persistencia
La capa strict mantiene:
- `semantic-consumer-state.json`;
- journal del producer bundle;
- backup del estado aplicado;
- estado final strict;
- ledgers OBSERV/FINOPS;
- outbox LRN.

El rebuild debe reproducir exactamente el hash del estado semántico previo.

## Autoridad
- PREPROD solamente.
- PROD/PROD write OFF.
- DB/CRM/provider write OFF.
- nuevo spend OFF.
- Trading OFF.
- Android untouched.
- external code execution OFF.
- coste adicional 0 €.

## Rollback de implementación
Retirar únicamente:
- `cerebro/runtime/cap-real-consumer-adoption-v1.mjs`
- `cerebro/tests/cap-real-consumer-adoption-v1.test.mjs`
- `cerebro/registry/cap-real-consumer-adoption-v1.json`
- `.github/workflows/cerebro-cap-full-e2e-real-v1.yml`
- este runbook.

El runtime `CAP-NATIVE`, su evidencia y las capacidades operacionales compartidas permanecen intactos.

## Promoción
1. strict branch CI verde;
2. PR exact-head con strict + Governed Main + RSI verdes;
3. merge a `main`;
4. strict automático verde en `main`;
5. PR separada de certificación con SHA/run IDs observados;
6. nueva repetición automática strict verde post-certificación;
7. solo entonces `CAP-NATIVE = FULL_E2E_REAL_PREPROD`.

## Siguiente bloque
`LEAD-NATIVE_REAL_CONSUMER_ADOPTION_TO_FULL_E2E`.
