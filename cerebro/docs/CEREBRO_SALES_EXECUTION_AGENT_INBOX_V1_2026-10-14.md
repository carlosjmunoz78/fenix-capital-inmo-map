# CEREBRO OS · SALES EXECUTION / CADENCE / AGENT INBOX V1
**Bloques:** 93–104  
**Fecha:** 2026-10-14  
**Perfil:** `sales_executive`  
**Motor canónico:** `SALE-001`  
**Ámbito:** `PREPROD`  
**Estado de seguridad por defecto:** `PLAN_ONLY`

## 1. Decisión arquitectónica

Este bloque **no crea un motor SALE nuevo**. Extiende el motor canónico `SALE-001` mediante un perfil transversal y reutiliza las piezas que ya existen:

- `LEAD-001` / `NBA-001` → scoring y next-best-action.
- `SALE-001` → acción comercial y seguimiento.
- `COM-001` → selección/gobierno del canal; nunca se reemplaza por un envío directo desde este perfil.
- `CRM-001` → destino lógico de escritura CRM, bloqueado por defecto.
- `owner-approval-gate.mjs` / control humano → autorización exacta.
- `channel-registry.v1.json` → inventario/capacidad de canales.
- `JOB-001` → ejecución durable reutilizable por la capa de scheduling.

No se instala Mautic, listmonk, Dittofeed, Posta ni ningún otro producto. Mautic degradado no bloquea el cierre técnico. n8n puede orquestar, pero no es fuente de verdad.

## 2. Invariantes de seguridad

1. `outreach_authorized=false` en todo intake inicial.
2. `crm_write_authorized=false` en todo intake inicial.
3. Solo `PREPROD`; `PROD` falla cerrado.
4. No se admite PII cruda, secretos ni cuerpo del mensaje en el estado de este perfil.
5. Un borrador se representa por `draft_ref`; el contenido vive fuera del estado gobernado.
6. La aprobación es exacta por `scope_fingerprint`; editar el borrador cambia la huella y anula la aprobación anterior.
7. Una aprobación habilita únicamente el paso actual. Tras un envío registrado, el siguiente paso vuelve a `PLAN_ONLY`.
8. El perfil **no llama al transporte**. Produce una `delivery_request` para `COM-001` con:
   - `dispatch_authorized=false`
   - `adapter_dispatch_authorized=false`
   - `external_side_effect_executed=false`
9. Una respuesta, opt-out, supresión o frequency cap detiene la cadencia.
10. Casos de alto valor, financieros sensibles, conflictos de identidad o permiso incierto escalan a humano antes de outbound.

## 3. Mapeo 93–104

### 93 · Intake de lead/oportunidad
`createSalesExecutionCase()` acepta referencias opacas, campaña, permiso de contacto y estado de elegibilidad. No ingiere email, teléfono, nombre, DNI, IBAN, tokens ni cuerpo del mensaje.

### 94 · Resolución de identidad / elegibilidad
Se reutiliza `customer_ref` cuando existe. Si hay exactamente un candidato `VERIFIED`, se reutiliza; múltiples candidatos verificados producen `identity_conflict` y `ESCALATED_TO_HUMAN`.

### 95 · Cadencia gobernada
Cadencia por defecto:
- D0 → EMAIL
- D2 → EMAIL
- D5 → WHATSAPP solo con elegibilidad válida
- D9 → EMAIL
- fin

No hay loops infinitos.

### 96 · Borrador seguro
Cada paso produce un `draft_ref` determinista. El perfil no persiste texto bruto.

### 97 · Aprobación humana exacta
`authorizeSalesExecutionStep()` exige:
- decisión explícita,
- `approved_by_ref`,
- `scope_fingerprint` exacto,
- checkpoint `customer_human_request`.

Acciones soportadas en Agent Inbox:
`APPROVE / EDIT / REJECT / SUPPRESS`.

### 98 · Queue + idempotencia
La clave canónica es:

`tenant_id|profile_id|customer_or_lead_id|campaign_id|step_id|channel`

La misma entrega no puede duplicarse.

### 99 · Handoff de entrega
`requestSalesExecutionDelivery()` genera una solicitud para `COM-001`. No ejecuta transportes ni modifica autorización del adapter.

### 100 · Reply / opt-out / suppression
Se detiene contacto ante:
- reply,
- user opt-out,
- hard bounce,
- manual suppression,
- complaint,
- legal hold,
- frequency cap,
- permission denied.

`reply_received`, `positive_intent` y `uncertain_intent` escalan a humano.

### 101 · Rate limit + retry/backoff
Hay caps total/canal y mínimo intervalo por canal. Los bloqueos de transporte usan backoff exponencial acotado con jitter determinista. Al agotarse el presupuesto de retry se escala a humano.

### 102 · Agent Inbox
`buildAgentInboxItem()` expone:
- `draft_ref`,
- canal y paso,
- motivo,
- historial reciente,
- estado de consentimiento,
- frequency cap,
- owner,
- scope exacto,
- acciones posibles.

No expone PII ni texto crudo.

### 103 · CRM y rutas de operador
`buildCrmWritePlan()` conserva CRM en `PLAN_ONLY_HUMAN_REQUIRED` salvo una autorización futura separada.

`executeSalesCommand()` ofrece superficie equivalente a RPC/MCP:
- `status`
- `ingest`
- `plan`
- `queue`
- `approve`
- `reject`
- `send`
- `reply`
- `suppress`
- `inbox`
- `simulate`

No se añade un CLI persistente paralelo porque la función de comandos es reutilizable por consola, MCP, API o job runner.

### 104 · Evidencia / QA / cierre técnico
Pruebas obligatorias:
- no-send por defecto,
- anti-PII/secret/message,
- PREPROD-only,
- identidad,
- caso sensible/high-value,
- permiso desconocido/denegado,
- WhatsApp elegible,
- aprobación exacta,
- idempotencia,
- frequency cap,
- backoff,
- reply stop,
- opt-out,
- CRM no-write,
- Agent Inbox,
- simulación/command router,
- contrato de invariantes.

El workflow dedicado ejecuta la batería focalizada, valida el registro canónico y corre toda la regresión CEREBRO.

## 4. Estado final válido

Un cierre técnico correcto **no necesita envío real**. El estado esperado antes de una autorización humana real puede ser:

```json
{
  "status": "planned",
  "plan_valid": true,
  "delivery_enabled": false,
  "blocker": "HUMAN_REQUIRED",
  "checkpoint_token": "customer_human_request",
  "outreach_authorized": false,
  "crm_write_authorized": false
}
```

Esto no es un fallo: es el límite de seguridad previsto.

## 5. Qué queda fuera de este bloque

- Activar campañas reales.
- Autorizar outbound masivo.
- Introducir credenciales/secretos.
- Escribir en CRM real.
- Instalar herramientas de marketing por conveniencia.
- Convertir n8n en fuente de verdad.
- Promover a PROD.

Cualquiera de esas acciones necesita una autorización y evidencia específicas fuera de este cierre.
