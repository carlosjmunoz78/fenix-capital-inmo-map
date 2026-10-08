# RSI-RECOVERY-011 · POST-MERGE AUTONOMY ACCEPTANCE

Fecha: 2026-10-08

## Estado final del bloque

**LRN-001 / RSI V0 = LISTO · AUTOMÁTICO · PREPROD**

**PROD = HOLD**

Esta aceptación cierra el bloque de recuperación y automatización transversal de aprendizaje continuo de CEREBRO en PREPROD. No concede autoridad de producción, no habilita Trading y no modifica las autoridades existentes de App, CRM, Supabase, Notion, WordPress, SEO, Social o Training.

## Alcance aceptado

El circuito demostrado es:

`Skill Factory → improvement events → durable outbox → LRN-001 → durable learning ledger → orchestration / horizons / meta-observability`

El núcleo se ejecuta con un modelo **HOSTLESS_BOUNDED_ITERATION** sobre GitHub Actions y ramas de estado durables. No depende de que el PC de Carlos permanezca encendido. El PC Windows queda como EDGE RUNNER opcional para Browser Bridge, Computer Use u otras tareas locales que sí requieran ese dispositivo.

## Evidencia real post-merge

### Evento real de Skill Factory

- Fuente: `CEREBRO Skill Discovery Scout`.
- Source run: `37823595302`.
- Batch durable: `lrn-batch:b8b672b50c515262a7ac25c8`.
- Tenant: `fenix`.
- Eventos reales: `15`.
- Estado de autoridad: PREPROD only, `prod_authorized=false`, `prod_write_authorized=false`, `trading_access=false`, coste adicional objetivo `0 EUR`.

### Primera ejecución real end-to-end

El publisher real `CEREBRO RSI Learning Outbox Publisher V0`, run `37823708844`, attempt 3, terminó `SUCCESS` tras la migración segura del contrato de checksum.

El evento disparó `CEREBRO RSI Learning Control Plane V0`, run `37827544846`, sobre main `03ba5af76b1518b4c3eb2c08705f6ef12a6bb87b`, con resultado `SUCCESS`.

Estado durable observado:

- `remote_outbox.status = REMOTE_OUTBOX_GREEN`
- `downloaded_total = 1`
- `processed_batches = 1`
- `persisted_total = 15`
- `skipped_receipts = 0`
- `held_total = 0`
- `human_required = []`
- `ledger_exists = true`
- `orchestration.status = ORCHESTRATOR_GREEN`
- `horizons.status = HORIZON_EXECUTORS_GREEN`
- `meta_observability.status = META_METRICS_GREEN`
- `additional_cost_eur = 0`
- `prod_authorized = false`
- `prod_write_authorized = false`
- `trading_access = false`

Esto prueba el camino real `Skill Factory → outbox → LRN → ledger` sin JSON manual y sin depender de un PC persistente.

### Segunda ejecución real · idempotencia

El mismo publisher, run `37823708844`, attempt 4, terminó `SUCCESS`.

Ese evento disparó `CEREBRO RSI Learning Control Plane V0`, run `37827678008`, también `SUCCESS`.

Estado durable observado:

- `remote_outbox.status = REMOTE_OUTBOX_GREEN`
- `downloaded_total = 0`
- `skipped_total = 1`
- `processed_batches = 0`
- `skipped_receipts = 1`
- `persisted_total = 0`
- `duplicates_total = 0`
- `held_total = 0`
- `human_required = []`
- `ledger_exists = true`
- `orchestration.status = ORCHESTRATOR_GREEN`
- `horizons.status = HORIZON_EXECUTORS_GREEN`
- `meta_observability.status = META_METRICS_GREEN`
- `additional_cost_eur = 0`
- `prod_authorized = false`
- `prod_write_authorized = false`
- `trading_access = false`

Esto demuestra que el mismo batch no se reaprende ni duplica: el receipt existente se reconoce y la segunda ejecución produce cero nueva persistencia.

## Incidencias encontradas y correcciones

Durante la aceptación real se detectaron dos incompatibilidades del contrato de checksum que los tests iniciales no habían revelado con evidencia histórica real:

1. El productor histórico indexaba el batch con SHA-256 de la serialización JSON del `Buffer`, mientras el consumidor verificaba el texto UTF-8 real. Se corrigió para que las nuevas publicaciones usen SHA-256 de bytes reales.
2. El batch histórico ya persistido seguía teniendo el checksum legado en el índice. Se añadió migración fail-closed: solo se cambia ese metadato si el checksum existente coincide criptográficamente con el algoritmo histórico aplicado a los bytes exactos del batch. El batch inmutable no se reescribe.

Además, los errores de transporte remoto dejan de aparecer como GREEN: se registran como `PARTIAL_REMOTE_ERROR`, se conserva evidencia durable y el workflow falla visiblemente después de persistir el estado necesario para anti-loop.

PRs de corrección post-merge:

- PR #503 · raw-byte checksum producer contract.
- PR #504 · legacy ingress hardening + visible remote transport failures.
- PR #505 · verified legacy outbox index checksum migration.

## Autoridad y límites

LRN-001 puede operar automáticamente en PREPROD dentro de los contratos conectados. Puede recoger eventos, persistir aprendizaje, ejecutar la planificación/horizontes habilitados y alimentar evaluación/meta-aprendizaje según sus políticas.

No implica que todo componente legado esté automáticamente conectado. Motores o sistemas que todavía no emitan eventos ni tengan learning hooks deben ser envueltos una vez siguiendo `CONSERVAR → ENTENDER → ENVOLVER → PROBAR → MEJORAR → MIGRAR`.

LRN-001 no tiene autoridad para:

- escribir en PROD;
- elevar sus propios permisos;
- debilitar políticas o tribunal;
- concederse presupuesto;
- usar Trading;
- ejecutar shell arbitrario fuera de los runtimes permitidos;
- saltarse `HUMAN_REQUIRED`;
- sustituir destructivamente sistemas existentes.

## Runbook, backup, rollback y rebuild

Siguen vigentes los contratos y runbooks de recuperación previos, incluidos:

- `cerebro/docs/RSI_RECOVERY_001_RUNBOOK.md`
- `cerebro/docs/RSI_RECOVERY_002_PREPROD_PERSISTENCE.md`
- `cerebro/docs/RSI_RECOVERY_003_PREPROD_RUNTIME_HOST_AUDIT.md`
- `cerebro/docs/RSI_RECOVERY_004_LRN_HOST_BINDING.md`

El binding Windows queda documentado como EDGE RUNNER opcional; no es dependencia del core hostless.

Rollback del código: revert PR de los merge commits aplicables con los mismos gates. Los branches durables de outbox/learning state no se borran; preservan evidencia y receipts. Rebuild: checkout de main + restauración/reuso de estados durables compatibles + ejecución de gates y control-plane PREPROD.

## Criterio de cierre

Se considera cerrado RSI-RECOVERY-011 porque existen dos ejecuciones reales consecutivas del mismo camino post-merge:

1. una primera ejecución que ingiere y persiste 15 aprendizajes reales;
2. una segunda ejecución que reconoce el batch ya procesado y persiste 0 nuevos aprendizajes.

Por tanto:

**HECHO · LRN-001 / RSI V0 = LISTO · AUTOMÁTICO · PREPROD**

**HOLD · PROD AUTONOMY = NO AUTORIZADA**
