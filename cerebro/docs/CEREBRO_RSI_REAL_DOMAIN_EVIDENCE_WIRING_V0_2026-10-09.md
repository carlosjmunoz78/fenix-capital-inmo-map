# CEREBRO OS · RSI REAL DOMAIN EVIDENCE WIRING V0

Fecha: 2026-10-09  
Ámbito: Fénix únicamente · PREPROD learning plane · coste adicional objetivo 0 €

## Estado

**HECHO en este bloque:** contrato y cableado automático de evidencia real/read-only desde dominios Fénix registrados hacia el `universal-learning-ingress` y el outbox persistente de `LRN-001`.

**NO significa:** autonomía PROD, escritura PROD, activación comercial, modificación automática de App/CRM/WordPress/SEO, ni continuación de MULTIEMPRESA.

- PROD authority: FALSE
- PROD write authority: FALSE
- Trading authority: FALSE
- MULTIEMPRESA continuation: FALSE
- Incremental cost target: 0 EUR

## Regla de preservación

`CONSERVAR -> ENTENDER -> ENVOLVER -> PROBAR -> MEJORAR -> MIGRAR`.

Este bloque no sustituye ninguno de los productores operativos existentes. Solo observa evidencia permitida, la normaliza y la entrega al plano de aprendizaje ya certificado.

## Qué cambia respecto al bloque anterior

El registro de autonomía por dominio ya existía. Ahora cada uno de sus 10 dominios Fénix tiene al menos una fuente automática explícita de evidencia.

La separación es deliberada:

`fuente real -> adapter read-only -> universal-learning-ingress -> rsi-event-outbox -> LRN durable -> candidate factory -> OLD/NEW -> tribunal -> policy`

El cableado de evidencia **no concede autonomía**. **ASSISTED remains ASSISTED** hasta que cada dominio supere sus propios gates físicos y contractuales.

## Fuentes reales registradas

### APP-001 · `fenix.app`
Fuente: `PROD Runtime Smoke`.  
Profundidad: `LIVE_READONLY_OPERATIONAL_CONTRACT`.

Se aprende del resultado del smoke vivo ya existente. No se escribe en PROD.

### CRM-001 · `fenix.crm`
Fuente: `PROD Runtime Smoke`.  
Profundidad: `LIVE_READONLY_API_CONTRACT_PROXY`.

Es evidencia real de contratos/API relacionados, pero no se presenta como cobertura funcional completa del CRM.

### DATA-001 · `fenix.data`
Fuente: `PROD Runtime Smoke`.  
Profundidad: `LIVE_READONLY_DATA_API_CONTRACT_PROXY`.

No habilita nuevas consultas de datos de cliente ni escrituras.

### KNW-001 · `fenix.knowledge.notion`
Fuente: `PROD Runtime Smoke`.  
Profundidad: `LIVE_READONLY_ANA_KNOWLEDGE_CONTRACT`.

La evidencia actual corresponde al contrato vivo de conocimiento/Ana. No implica que todo Notion esté automatizado.

### WEB-001 · `fenix.web.wordpress`
Fuente: sonda HTTP pública `https://fenixcapital.es/`.  
Profundidad: `LIVE_PUBLIC_AVAILABILITY`.

Solo prueba disponibilidad pública. No inspecciona credenciales ni modifica WordPress.

### SEO-001 · `fenix.seo`
Fuente: sonda pública `https://fenixcapital.es/robots.txt`.  
Profundidad: `LIVE_PUBLIC_SEO_AVAILABILITY_ONLY`.

Esta señal no demuestra salud SEO completa y **no sustituye ni evita** `CORE_GUARD_CANONICAL_RECONCILIATION_BEFORE_PROD_PROMOTION`. El estado físico de Core Guard sigue siendo un gate separado.

### MKT-001 · `fenix.marketing`
Fuente: disponibilidad pública de la home.  
Profundidad: `LIVE_PUBLIC_MARKETING_SURFACE_AVAILABILITY_ONLY`.

No se interpreta como rendimiento de campañas ni como atribución comercial.

### AUTO-001 · `fenix.automation`
Fuentes: `CEREBRO RSI Learning Control Plane V0` y `CEREBRO RSI Learning Outbox Publisher V0`.  
Profundidad: `LIVE_AUTOMATION_CONTROL_PLANE`.

### TRN-001 · `fenix.training`
Fuente: `CEREBRO RSI Learning Control Plane V0`.  
Profundidad: `LIVE_LEARNING_TRAINING_CONTROL_PLANE`.

No equivale a promover datasets/modelos automáticamente fuera del contrato actual.

### LRN-001 · `cerebro.learning.continuous_evolution`
Fuente: `CEREBRO RSI Learning Control Plane V0`.  
Profundidad: `LIVE_POSTMERGE_CERTIFIED_CONTROL_PLANE`.

LRN sigue siendo el único dominio del registro con `PREPROD_AUTONOMOUS` ya certificado.

## External dispatch seguro

Se admite `repository_dispatch` tipo `cerebro-domain-evidence-v0` para que plugins/connectors autorizados puedan emitir evidencia sanitizada posteriormente sin reescribir este workflow.

Contrato obligatorio:
- `company_id=fenix`;
- engine/domain ya registrados;
- sin customer data;
- sin secretos;
- sin autoridad PROD/Trading;
- coste incremental 0 €;
- el payload vuelve a pasar por `universal-learning-ingress`.

Cualquier violación falla cerrada.

## Privacidad y secretos

La capa reutiliza las defensas del ingress universal:
- claves con nombres de secretos/tokens/passwords están prohibidas;
- `contains_customer_data=false` obligatorio;
- `contains_secrets=false` obligatorio;
- no se añaden credenciales a evidencia, logs ni estado persistente;
- las sondas web solo usan URLs públicas;
- GitHub evidence usa metadatos inmutables de run/SHA, no secretos del workflow.

## Persistencia y aprendizaje

El workflow `CEREBRO RSI Real Domain Evidence Wiring V0` reutiliza el branch de estado append-only:

`cerebro-rsi-learning-outbox-v0`

No se persiste evidencia en `main`. El worker/control-plane LRN existente la consume y mantiene su estado durable separado.

La convivencia con `CEREBRO RSI Learning Outbox Publisher V0` usa el mismo concurrency group de escritura para evitar carreras sobre el outbox.

## Anti-loop

No se añade este nuevo workflow a los triggers `workflow_run` del LRN control plane.

Por tanto:
- LRN puede producir evidencia de su ciclo;
- la evidencia entra al outbox;
- no provoca inmediatamente otro LRN por sí misma;
- el siguiente ciclo normal/evento ya existente la consume.

No existe recursión `evidence -> LRN -> evidence -> LRN` sin límite.

## Fail-closed

- workflow no registrado -> no-op, 0 eventos;
- dominio no registrado -> rechazo;
- fuente sin policy registrada -> rechazo al cargar Registry;
- cobertura incompleta de los 10 dominios -> fallo de certificación;
- customer data/secrets -> rechazo;
- authority expansion -> rechazo;
- coste incremental distinto de 0 -> rechazo.

## Evidencia y acceptance

La aceptación técnica exige:
1. tests del adapter + ingress universal;
2. cobertura exacta de los 10 domain policies;
3. exact PR head;
4. ninguna escalada de autonomía: solo LRN puede seguir PREPROD_AUTONOMOUS;
5. Promotion Readiness Shadow existente GREEN;
6. post-merge certification GREEN;
7. `PROD Live Deploy` SKIPPED para este cambio CEREBRO-only;
8. `PROD Runtime Smoke` existente GREEN;
9. al menos un `workflow_run` real post-merge procesado por este wiring y persistido en el outbox sin autoridad PROD.

## Rollback / rebuild

Rollback lógico: retirar/deshabilitar el workflow de evidence wiring o revertir su commit; los productores observados no se modifican.

Los batches del outbox son append-only. Rebuild: el código, Registry y workflow en Git pueden reconstruir el adapter; la evidencia histórica durable queda separada del código principal.

## Registry impact

No se crea nuevo Engine ID. Se reutilizan APP-001, CRM-001, DATA-001, KNW-001, WEB-001, SEO-001, MKT-001, AUTO-001, TRN-001 y LRN-001.

## Changelog

- Añadido Registry de fuentes reales por dominio.
- Añadido adapter determinista GitHub workflow/public probe/external dispatch.
- Reutilizado universal ingress.
- Reutilizado outbox persistente y subscriber Fénix.
- Añadida automatización hostless GitHub Actions.
- Preservados PROD/Trading/MULTIEMPRESA deny-by-default.

## Runbook

Si el workflow falla:
1. identificar fuente exacta y run;
2. no tocar el productor para conseguir verde;
3. validar si es fallo de fuente, adapter, ingress o persistencia;
4. cambiar una sola causa;
5. repetir exact-head;
6. mantener dominio ASSISTED durante el incidente;
7. si aparece `SECURITY_INCIDENT`, `MONEY_LIMIT` u otra excepción canónica, escalar solo esa excepción.

## next_gate

`HUMAN_EXCEPTION_SUPERVISOR_V0`

Objetivo del siguiente bloque: que las excepciones canónicas lleguen automáticamente al canal humano adecuado, mientras la operación ordinaria permanece silenciosa y automática.
