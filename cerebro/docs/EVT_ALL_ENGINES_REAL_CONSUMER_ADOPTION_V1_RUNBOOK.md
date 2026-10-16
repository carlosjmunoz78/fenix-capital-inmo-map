# EVT-001 · ALL_REGISTERED_ENGINES · Strict Real Consumer Adoption V1

## Estado
Candidate PREPROD. No promover a `FULL_E2E_REAL_PREPROD` hasta exact-head CI, gates gobernados de PR y repetición automática en `main`.

## Objetivo
Demostrar que `EVT-001` no solo publica o entrega recibos: cada motor lógico del `engine-registry.v1.json` consume un evento gobernado y aplica un efecto semántico persistente. El diseño usa un único protocolo/runtime compartido; no crea un servidor por motor.

## Contrato semántico
Evento: `cerebro.registry.epoch.v1`.

Cada evento contiene:
- `target_engine_id`
- `registry_fingerprint`
- `registry_count`
- `generation`
- `semantic_action=APPLY_CANONICAL_REGISTRY_EPOCH`

El consumidor solo acepta el evento si contexto, tenant, motor objetivo, fingerprint, cardinalidad y generación coinciden con el registro canónico. El efecto observable es estado durable por `engine_id`, no un `consumed:true`.

## Gate exhaustivo
La lista requerida se carga dinámicamente de `cerebro/registry/engine-registry.v1.json`. Cualquier motor registrado sin evento/estado semántico, cualquier dead-letter o cualquier fingerprint incorrecto deja la capacidad en `PARCIAL`.

## Resiliencia
- Transporte: `Evt001Native` + `PersistentEventBus` + `AtomicV8Journal`.
- Reintentos acotados: runtime native.
- Dead letter: runtime native.
- Idempotencia: idempotency key determinista y estado semántico conflict-safe.
- Backup: snapshot local del estado aplicado.
- Rollback: vaciado al baseline PREPROD local.
- Rebuild: replay del journal de eventos y comparación exacta del hash del estado.
- Restart: rerun sobre el mismo workdir debe producir el mismo outcome y no duplicar LRN/OBSERV/FINOPS.

## Tests adversariales
1. Falta un motor canónico → cobertura < 1 y FULL bloqueado.
2. Fingerprint incorrecto → consumidor rechaza, 3 intentos y dead letter.
3. Fallo transitorio → segundo intento entrega y aplica.
4. Cross-company → rechazo antes de transporte.
5. LRN desactivado → FULL bloqueado.
6. Rerun → publicaciones duplicadas suprimidas, entregas terminales no repetidas, estado estable.

## Autoridad
- PREPROD únicamente.
- PROD OFF.
- Escrituras externas DB/CRM/provider OFF.
- Spend OFF.
- Trading access OFF, incluido que este gate no ejecuta lógica ni credenciales de `LAB-TRD`.
- Android untouched.
- Coste adicional 0 €.
- Sin broker externo obligatorio.

## Rollback de implementación
Eliminar únicamente la capa estricta:
- `cerebro/runtime/evt-all-engines-real-consumer-adoption-v1.mjs`
- `cerebro/tests/evt-all-engines-real-consumer-adoption-v1.test.mjs`
- `cerebro/registry/evt-all-engines-real-consumer-adoption-v1.json`
- `.github/workflows/cerebro-evt-all-engines-full-e2e-real-v1.yml`

El runtime native EVT-001 y sus contratos/evidencias legacy no se modifican.

## Promoción
Solo tras:
1. CI strict exact-head verde.
2. PR con Governed Main y RSI readiness verdes.
3. Merge a `main`.
4. Repetición automática strict verde en `main`.
5. PR separada de certificación con SHA/run IDs reales.
6. Nueva repetición automática strict verde tras la certificación.
