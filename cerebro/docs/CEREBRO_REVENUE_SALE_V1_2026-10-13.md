# CEREBRO Revenue · SALE-001 V1 · 2026-10-13

## Estado

- `SALE-001`: **PARCIAL / PREPROD IMPLEMENTADO** para planificación de acción comercial y progresión de caso sin side effects externos.
- `LEAD-001 + NBA-001`: **PARCIAL / PREPROD IMPLEMENTADO** y upstream de SALE-001.
- `COM-001`: **EXISTENTE EN REGISTRO / ADAPTER DE ENTREGA POR CERRAR**. SALE-001 sólo produce `delivery_intent`; no autoriza dispatch.
- WhatsApp, PHONE y WEB_WIDGET: **DEFINIDOS COMO FUTURE ADAPTERS / SIN AUTORIDAD PROD NUEVA** según el Channel Registry V1.
- Coste adicional objetivo: **0 €**.
- PROD writes: **NO**.

## Contrato funcional

Entrada:

`SALE-001 PREPROD context + LEAD/NBA decision + contact_permission snapshot + explicit now_ms`.

SALE-001 V1 conserva referencias opacas y no transporta PII cruda. Genera un `sale_case_id` determinista y un estado comercial gobernado.

Estados/acciones principales:

- `WAITING_HUMAN / HUMAN_REQUIRED`
- `STOPPED / DO_NOT_CONTACT`
- `VERIFYING_PERMISSION / VERIFY_CONTACT_PERMISSION`
- `RETURN_TO_LEAD / REQUEST_MORE_EVIDENCE`
- `VERIFYING_CONTACT / VERIFY_CONTACT`
- `MONITORING / MONITOR`
- `READY_FOR_DELIVERY / CONTACT_NOW | FOLLOW_UP_FAST | NURTURE | FOLLOW_UP | OBJECTION_RECOVERY | RECOVER_NO_SHOW`
- `WAITING_RESPONSE`
- `QUALIFIED_INTEREST / PREPARE_APPOINTMENT`
- `APPOINTMENT_BOOKED`
- `COOL_DOWN`
- `WON`
- `LOST`

## Delivery intent

Cuando la acción comercial puede requerir contacto, SALE-001 sólo crea un objeto de intención:

- `target_engine = COM-001`
- `route = AUTO_SELECT_AUTHORIZED_CUSTOMER_CHANNEL`
- `channel_binding_required = true`
- `dispatch_authorized = false`
- `external_side_effect_executed = false`
- sin email/teléfono/texto de mensaje crudos

Por tanto, este bloque **no afirma envío real** por WhatsApp, teléfono, email o web widget.

## Cadencia y rescate

Eventos soportados:

- `CONTACT_SUCCEEDED`
- `NO_REPLY`
- `REPLIED_INTERESTED`
- `OBJECTION_PRICE`
- `OBJECTION_TIMING`
- `OBJECTION_COMPETITOR`
- `NEEDS_THINKING`
- `APPOINTMENT_BOOKED`
- `NO_SHOW`
- `CONTACT_PERMISSION_REVOKED`
- `CUSTOMER_HUMAN_REQUEST`
- `WON`
- `LOST`

La cadencia automática está acotada y termina en `COOL_DOWN`; no existe loop infinito. Las objeciones producen `OBJECTION_RECOVERY`, y un no-show produce `RECOVER_NO_SHOW`, ambos como intents no despachados.

La revocación de permiso produce `STOPPED / DO_NOT_CONTACT`. Una solicitud explícita de humano produce `HUMAN_REQUIRED / CUSTOMER_HUMAN_REQUEST`.

`WON`, `LOST` y `STOPPED` son terminales para eventos comerciales posteriores.

## Privacidad y seguridad

Se rechazan campos de PII/secretos/mensaje crudos, incluyendo email, teléfono, dirección, identificadores fiscales/personales, IBAN, credenciales, tokens y texto de mensaje.

`lead_ref`, `decision_id`, `event_id` y demás referencias deben ser referencias opacas seguras.

La decisión upstream debe proceder de `LEAD-001` PREPROD y pertenecer a la misma `company_id`; se bloquea cross-company.

## Dependencias

Flujo implementado:

`LEAD-001 → NBA-001 → SALE-001 → delivery_intent(COM-001)`

Ejecución:

`sale.plan-action → JOB-001 durable V1 → durable-worker-runner-v1 → salePlanJobHandler`

Se reutiliza:

- `JOB-001` durable V1 para idempotencia, persistencia, retry, lease, checkpoint y recuperación.
- durable worker runner V1 para timeout, heartbeat y fairness multiempresa.
- Engine Registry canónico; no se crea un motor nuevo.
- Channel Registry V1 como frontera de autoridad de canal.

## Runbook PREPROD

1. Recibir resultado gobernado de LEAD/NBA.
2. Aportar snapshot explícito de `contact_permission`.
3. Encolar `sale.plan-action` con contexto `SALE-001/PREPROD`.
4. Ejecutar mediante worker durable.
5. Persistir el estado comercial resultante.
6. Si existe `delivery_intent`, mantener `dispatch_authorized=false` hasta superar el gate de COM-001/channel adapter.
7. Aplicar eventos comerciales por `event_id` idempotente.
8. Ante revocación de permiso, detener.
9. Ante `CUSTOMER_HUMAN_REQUEST`, enrutar por el supervisor de excepciones existente.
10. No promover a PROD sin OLD vs NEW, tribunal, adapter/channel gate y rollback probado.

## Backup / rollback / rebuild

- Backup: Git + evidencia de PR/CI + journal JOB-001 PREPROD.
- Rollback: dejar de registrar `sale.plan-action` o revertir el merge; no hay migración destructiva ni write PROD.
- Rebuild: checkout del SHA + Node 24 + `npm test` en `cerebro`.
- Reproducibilidad: `sale_case_id` y delivery intents son deterministas para inputs/version/tiempos explícitos equivalentes.

## Tests

Gate dedicado: `.github/workflows/cerebro-revenue-sale-v1.yml`.

Cubre:

- NBA alto → delivery intent side-effect-free;
- permiso DENIED/UNKNOWN;
- customer-requested-contact sin bypass de canal;
- HUMAN_REQUIRED canónico;
- retorno a LEAD/verify/monitor;
- bloqueo cross-company;
- rechazo de PII/secretos/mensaje;
- PREPROD exacto;
- idempotencia de eventos;
- cadencia bounded/cooldown;
- objeciones/no-show;
- revocación de permiso;
- solicitud humana;
- terminal WON/LOST;
- ejecución durable real y journal reopen;
- regresión completa de CEREBRO.

## Límite de evidencia

Este bloque demuestra lógica y ejecución durable PREPROD de SALE-001. **No demuestra todavía entrega externa real** ni autoridad PROD de WhatsApp/PHONE/WEB_WIDGET. El siguiente gate natural es `COM-001 delivery outbox + adapter authority` sin romper los canales existentes.
