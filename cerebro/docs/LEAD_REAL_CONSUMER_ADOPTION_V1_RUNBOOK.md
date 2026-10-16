# LEAD-NATIVE · Strict Real Consumer Adoption V1

## Estado
Candidate PREPROD. Mantener `PARCIAL` hasta exact-head CI, PR gobernada, merge, repetición automática verde en `main`, certificación y repetición post-certificación.

## Principio
La capa estricta es aditiva. No modifica `lead-native-v1.mjs`, su registry/evidence nativo ni las superficies transaccionales existentes. Un receipt o `consumed:true` no cuenta como consumo: cada consumidor debe cambiar una decisión semántica verificable cuando cambian los campos LEAD que realmente usa.

## Producer chain
Reutiliza el runtime nativo:
1. `SCORE_BATCH`.
2. `PRIORITIZE`.
3. `BUILD_NEXT_ACTION`.
4. `REPLAY_VERIFY`.

La ruta estricta trabaja con snapshots deterministas PREPROD y no escribe CRM. El score sigue siendo heurístico-first, 0 € y sin ML obligatorio.

## Consumo semántico requerido
- `CRM-001`: genera una vista priorizada no mutante únicamente si orden, score IDs e aislamiento son coherentes.
- `SALE-001`: prioriza el lead de mayor urgencia/valor únicamente si supera el umbral de venta y la siguiente acción es inmediata.
- `NBA-001`: publica una next-best-action PREPROD únicamente si replay, confianza y acción coinciden.
- `C360-001`: acepta señales de lead únicamente si cada registro conserva fuente, confianza, probabilidad y valor suficientes.
- `CAP-001`: consume calidad por fuente para realimentar adquisición sin activar gasto ni proveedor.
- `LRN-001`: persiste `lead.consumer.outcome` mediante RSI outbox e idempotencia.
- `OBSERV-001`: persiste el outcome semántico correlacionado.
- `FINOPS-001`: demuestra coste adicional 0 €.

`EVA-001` es gate transversal y alimenta Tribunal independiente `QA-001:LEAD-TRIBUNAL:v1`; no sustituye a ninguno de los ocho consumidores requeridos.

## Mutation tests obligatorios
- cambiar el orden priorizado → `CRM-001` HOLD;
- reducir prioridad del top lead → `SALE-001` HOLD;
- perder replay → `NBA-001` HOLD;
- reducir confianza → `C360-001` HOLD;
- degradar calidad por fuente → `CAP-001` HOLD;
- activar CRM write en bundle o semantic profile → rechazo fail-closed antes de downstream;
- desactivar LRN → FULL bloqueado;
- repetir estado durable → hashes estables, sin duplicar LRN/OBSERV/FINOPS;
- backup → rollback local → rebuild exacto por hash.

## Persistencia y rebuild
Se mantienen:
- `semantic-consumer-state.json`;
- journal del producer bundle;
- backup del estado aplicado;
- estado final strict;
- ledgers OBSERV/FINOPS;
- outbox LRN.

El rebuild debe reproducir exactamente el hash del estado semántico aplicado antes del rollback local.

## Autoridad
- PREPROD solamente.
- PROD/PROD write OFF.
- DB/provider/CRM write OFF.
- spend OFF.
- Trading OFF.
- Android untouched.
- external code execution OFF.
- coste adicional 0 €.

## Rollback de implementación
Retirar únicamente:
- `cerebro/runtime/lead-real-consumer-adoption-v1.mjs`
- `cerebro/tests/lead-real-consumer-adoption-v1.test.mjs`
- `cerebro/registry/lead-real-consumer-adoption-v1.json`
- `.github/workflows/cerebro-lead-full-e2e-real-v1.yml`
- este runbook.

El runtime `LEAD-NATIVE`, sus tests, registry/evidence nativos y CRM/Supabase permanecen intactos.

## Promoción
1. strict branch CI verde;
2. PR exact-head con strict + Governed Main + RSI verdes;
3. merge a `main`;
4. strict automático verde en `main`;
5. PR separada de certificación con SHA/run IDs observados;
6. nueva repetición automática strict verde post-certificación;
7. solo entonces `LEAD-NATIVE = FULL_E2E_REAL_PREPROD`.

## Siguiente bloque
Cuando COMPET, CAP y LEAD estén los tres certificados FULL: `LOTE3_DECISION_GATE`, con inventario y contrato antes de construir nada nuevo.
