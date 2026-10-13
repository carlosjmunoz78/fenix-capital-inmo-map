# CEREBRO OS · Revenue COM-001 Delivery Router V1

Fecha: 2026-10-13

## Estado

- `JOB-001`: HECHO/PARCIAL en PREPROD para runtime durable V1 y worker runner V1; no se declara multi-writer distribuido.
- `LEAD-001 + NBA-001`: PARCIAL / PREPROD IMPLEMENTADO Y TESTEADO.
- `SALE-001`: PARCIAL / PREPROD IMPLEMENTADO Y TESTEADO.
- `COM-001`: PARCIAL / PREPROD IMPLEMENTADO Y TESTEADO para planificación de canal; NO envío externo.
- `NOTIF-001`: EXISTENTE como ID canónico y propietario lógico de política/notificación, sin nueva implementación física en este bloque.
- `WHATSAPP/PHONE/WEB_WIDGET/MOBILE/OTHER`: DEFINIDOS como future adapters en `cerebro/multichannel/channel-registry.v1.json`; ningún adapter de cliente se declara PROD autorizado.

## Principio de conservación

Este bloque no sustituye comunicación existente. Conserva:

- `cerebro/communication/communication-controller.mjs` y su flujo de comunicación con propietario.
- `cerebro/communication/mail_bridge.py`, que permanece restringido a `OWNER_PRIVATE_IDENTITY` y no se reutiliza para clientes.
- `cerebro/multichannel/channel-registry.v1.json`, que sigue siendo la fuente de autoridad de canales.
- App, CRM, Supabase, WordPress, SEO, Notion, automatizaciones, Training y Trading sin cambios de autoridad.

## Contrato COM-001 V1

Ruta: `cerebro/communication/com-delivery-router-v1.mjs`.

Entrada principal:

`SALE-001 delivery_intent -> COM-001 planCustomerDelivery()`

Requisitos:

- contexto exacto `company_id + engine_id=COM-001 + environment=PREPROD + version`;
- `delivery_intent.target_engine=COM-001`;
- `dispatch_authorized=false` y `external_side_effect_executed=false` a la entrada;
- referencias opacas, sin teléfono/email/nombre/dirección/credenciales/message body;
- permiso de contacto explícito;
- binding exacto de empresa y PREPROD;
- `status=PREPROD_AUTHORIZED`;
- `access_profile=CUSTOMER_OPERATIONAL`;
- `customer_scope=true`;
- acción soportada por el adapter.

Salida:

- `SUPPRESSED` ante opt-out/denegación;
- `BLOCKED_PERMISSION_UNKNOWN` si el permiso no está probado;
- `DEDUPLICATED` si el delivery intent ya fue visto;
- `DEFERRED_QUIET_HOURS` durante horario de silencio;
- `BLOCKED_NO_AUTHORIZED_CUSTOMER_ADAPTER` si no existe binding válido;
- `READY_FOR_ADAPTER_GATE` si existe binding PREPROD válido.

Incluso en `READY_FOR_ADAPTER_GATE`:

- `dispatch_authorized=false`;
- `adapter_dispatch_authorized=false`;
- `external_side_effect_executed=false`.

Por tanto este bloque prueba el routing pero NO envía a clientes.

## Mapa de dependencias

```text
JOB-001 durable V1
  -> LEAD-001 + NBA-001
    -> SALE-001
      -> COM-001 Delivery Router V1
        -> [real customer adapter gate]
          -> WHATSAPP | PHONE | WEB_WIDGET | MOBILE | OTHER

COM-001 -> NOTIF-001 (política/ventanas/delivery lifecycle)
COM-001 -> multichannel/channel-registry.v1.json (autoridad)
COM-001 -X-> owner mail_bridge as customer transport
COM-001 -X-> PROD direct dispatch
COM-001 -X-> Trading
```

## Runbook PREPROD

1. Producir un `delivery_intent` válido desde `SALE-001`.
2. Resolver el contexto `COM-001` para la misma `company_id`.
3. Aplicar permiso/suppression antes de cualquier selección de canal.
4. Aplicar dedupe por `delivery_intent_id`.
5. Aplicar quiet-hours.
6. Filtrar bindings por empresa, PREPROD, status, access profile, customer scope y acción soportada.
7. Seleccionar el primer binding según preferencias autorizadas.
8. Emitir sólo `route_plan_id` y adapter reference opaca.
9. No despachar. El adapter real requiere su propio contrato, tests, observabilidad, rollback, PREPROD y tribunal.

## Tests y evaluación

Workflow dedicado: `.github/workflows/cerebro-com-delivery-router-v1.yml`.

Cobertura:

- ruta sin adapter -> fail closed;
- selección exact-company PREPROD;
- cross-company denial;
- quiet-hours;
- opt-out / permission denied / unknown;
- dedupe;
- rechazo de PII y texto de mensaje;
- rechazo de PROD;
- rechazo de binding no autorizado;
- handler JOB compatible;
- full CEREBRO regression;
- registry validation;
- governance/shadow gates externos del PR.

## Backup / rollback / rebuild

Backup lógico: Git branch + commits + PR preservan OLD y NEW en paralelo.

Rollback:

- eliminar/deshabilitar el binding de `com.plan-delivery`;
- dejar de registrar/importar `com-delivery-router-v1.mjs`;
- volver a `SALE-001 delivery_intent` sin consumidor externo;
- no existe migración destructiva ni cambio de datos PROD que revertir.

Rebuild:

1. checkout de SHA aprobado;
2. Node 24;
3. ejecutar tests focalizados;
4. `cd cerebro && npm run validate`;
5. `cd cerebro && npm test`;
6. reconstruir cualquier binding futuro sólo desde adapters declarados en registry.

## Autonomía

`COM-001` queda en `PREPROD_CODE_TESTED_NOT_LIVE_CUSTOMER_CONNECTED`.

No se autoriza:

- contacto real a cliente;
- escritura PROD;
- credenciales nuevas;
- bypass de opt-out/quiet-hours;
- reutilizar correo privado del propietario como transporte cliente;
- pago adicional;
- acceso Trading.

Siguiente gate exacto:

`REAL_CUSTOMER_ADAPTER_DISCOVERY -> FREE_PARITY_GATE -> CONTRACT -> LAB -> PREPROD -> OLD_vs_NEW -> OBSERVABILITY -> ROLLBACK -> TRIBUNAL -> GRADUAL_PROD`.

## Coste

Objetivo y evidencia de este bloque: `0 €` adicionales. No se incorpora SaaS nuevo.
