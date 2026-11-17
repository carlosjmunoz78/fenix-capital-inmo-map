# NIA · FACT-001 central receiver/issuer (isolated LAB) · 17/11/2026

## Objetivo
Activar solo lectura de la Skill NIA desde el Worker FACT-001 actual, por el canal privado de Cloudflare Service Bindings RPC. La orden sale **firmada desde FACT-001** y se valida en NIA con HMAC-SHA256, Durable Object SQLite antirrepetición y ActionGatewayV1. No depende de GitHub Actions.

## Política de seguridad
- Emisor: `cerebro-fact001-gateway-lab-eu-20261109`, con **cola privada exclusiva** `cerebro-fact001-nia-request-lab-eu`; cola UMS y métodos UMS intactos.
- Receptor: `cerebro-nia-notion-proof-lab`, export `NiaReadOnlyLab`, binding de servicio FACT `NIA_RECEIVER`.
- **Clave HMAC nueva** `CEREBRO_NIA_DISPATCH_HMAC_KEY`, compartida únicamente como dos secretos cifrados Cloudflare de los dos Workers. No reutilizar FACT_EVENT_SIGNING_KEY, UMS ni Notion token. Nunca exportar el valor.
- **Caller RPC** adicional FACT `NIA_LAB_CALLER_TOKEN`, token exclusivo, sin tocar el valor ni alcance de otros caller tokens. Métodos RPC FACT autenticados mediante comparación constante antes de firmar. El acceso por la cola privada está controlado por permisos Cloudflare de productor.
- Flags separados: `NIA_ISSUER_ENABLED` en FACT y `NIA_DISPATCH_ENABLED` en NIA; OFF por defecto. `GATEWAY_ENABLED=false`, `ALLOW_MUTATIONS=false` y todos los flags UMS se conservan.
- Solo mensajes `NIA_FACT_PRIVATE_DISCOVERY_V1` permitidos con `company_id=fenix`, `engine_id=ACTGW-001`, topic de la lista permitida, `already_handled` opcional booleano. Los clientes no pueden imponer `authorized=true`.
- RPC NIA: `dispatchSignedEnvelope` exige firma, issuer, audiencia, empresa, env PREPROD, TTL ≤60 s y nonce nuevo. El Durable Object `NiaNonceLedger` reclama nonce en SQL de forma atómica. El ACTGW real ejecuta `notion.nia.discover.read` con Notion GET solo a la Skill permitida.
- `fetch` original FACT 403 y NIA 404; no workers.dev ni preview ni DNS ni cron. `Notion AI` no se invoca.

## Seguridad de migración
Inventario y snapshot FACT existentes en `cerebro/fact001-nia-parallel-lab/original/` (4 módulos) y `cerebro/docs/NIA_CENTRAL_GATEWAY_PARALLEL_DISPATCH_V1.md`. Versión Cloudflare de FACT antes de cambios: `31803bd4-dfe7-47a5-b62d-707dc853499e`, NIA `c91e07db-1b08-402b-b8ac-c36de97e2446`. Validar en vivo inmediatamente antes.

1. Cargar clase receptor NIA con flags OFF; conservar DO SQLite, Notion secret.
2. Provisionar clave aleatoria en Cloudflare, valor idéntico en FACT y NIA, sin revelar; caller token separado en FACT.
3. FACT: cargarse como módulos originales + un parche aditivo limitado a un método RPC y una rama de cola privada nueva; todos los bindings y secretos heredados en modo estricto y verificados. Flags OFF.
4. Comparar OLD vs NEW de las rutas UMS, payload HTTP, nombres de bindings, métodos y versiones. Revertir FACT por despliegue de la versión previa si difieren.
5. Activar NIA flags solo en LAB y ejecutar orden real de un solo uso por cola privada. Observar `FACT_NIA_PRIVATE_RESULT=PASS`, `NIA_CENTRAL_RECEIVER_GATE=PASS` y auditoría. Probar un NOOP. Sin cron/publicidad.
6. Conservar el binding privado para uso interno posterior, mantener el PR DRAFT; registrar rollback.

No promover autónomamente a PROD; no usar el canal NIA para escribir Notion ni para ejecutar su IA.

## Corte definitivo de esta integración LAB · 17/11/2026

**HECHO (ACTGW + FACT original + Notion), E2E real en Cloudflare LAB:** tras validar copia paralela se desplegó el mismo parche aditivo en `cerebro-fact001-gateway-lab-eu-20261109`. Su ruta antigua UMS, cuatro módulos originales y **16 bindings** se conservaron. `GATEWAY_ENABLED=false` y `ALLOW_MUTATIONS=false`; la única nueva ruta lógica privada tiene `NIA_ISSUER_ENABLED=true` y binding RPC `NIA_RECEIVER` al entrypoint `NiaReadOnlyLab` del Worker `cerebro-nia-notion-proof-lab`, que tiene `NIA_DISPATCH_ENABLED=true`. Ambos sin URL pública, sin preview y sin cron.

**Flujo ahora operativo solo en LAB privado:**
`Cloudflare Queues` (`cerebro-fact001-nia-request-lab-eu`, ID `c6325451fce54fd6bf4b25095627ba66`, consumidor FACT id `889f1c08580147eaa7e1189b6a83be9b`) → FACT valida solicitud → FACT firma HMAC-SHA256 exclusivo → Cloudflare Service Binding RPC → NIA verifica firma + 60 s TTL + nonce SQLite atómico → ACTGW autoriza y lee página NIA con token cifrado → respuesta metadata-only, sin invocar Notion AI.

**Evidencia en Cloudflare Workers Observability (FACT real):**
- `FACT_NIA_PRIVATE_RESULT=PASS` tras enviar una orden válida `NIA_FACT_PRIVATE_DISCOVERY_V1` el 17/11/2026 a las 09:51:31.989 UTC.
- `NIA_CENTRAL_RECEIVER_GATE=PASS` en el Worker NIA receptor.
- Pruebas negativas: `already_handled=true` aceptado como NOOP; `company_id` ajeno y campo `authorized:true` no permitido — **dos rechazos** `FACT_NIA_PRIVATE_RESULT=BLOCKED`, sin llegada de esos mensajes al receptor.
- 4/4 módulos originales coincidían **byte a byte** con la copia de seguridad antes de aplicar el parche. Solo se añadió nuevo método RPC, nueva rama de Queue y nuevos módulos de firmado/NIA; todos los bindings anteriores se conservaron por herencia estricta.

**Rollback físico original FACT probado:** promoción versión OFF `b2fedc38-e0fd-426e-ac89-62166b4d231b` al 100 %, verificación de flag OFF y UMS sin cambios; recuperación versión ON `a7bfd49b-f0ee-448f-b7e2-75e5512feee8` al 100 % y flag NIA ON. El original anterior al cambio de código es `ed3d352b-aa51-400e-844d-4b6369b85350` (backup adicional).

**Estado final:** clone `cerebro-fact001-nia-parallel-lab-eu` eliminado tras PASS y rollback; fuente del original guardada en `cerebro/fact001-nia-parallel-lab/original/`. Secretos HMAC y Notion cifrados; el Worker NIA conserva SQLite Durable Object exclusivo. D1 sigue 10/10, sin nueva DB, GitHub Actions ni suscripciones. PR DRAFT sin merge.

**Contrato de solicitud permitida a la cola privada:**
```json
{"type":"NIA_FACT_PRIVATE_DISCOVERY_V1","company_id":"fenix","engine_id":"ACTGW-001","topic":"documentation"}
```
`topic` debe ser `documentation`, `knowledge`, `research`, `meeting-notes`, `notion-skills` o `notion-events`. Campo opcional `already_handled` booleano; no admitir tokens, autorizaciones, contenido del cliente ni otros campos. Solo productores autenticados en Cloudflare pueden publicar en la cola. El contrato está limitado a NIA Skill metadata, no a tareas de escritura en Notion.

**LÍMITES AÚN PENDIENTES (NO declarar PROD):** No hay enrutamiento automático desde CEREBRO Console/App a esta Queue ni sesión de Notion AI ejecutada. Búsqueda de Custom Agents Notion por `NIA` no devolvió ningún agente publicado visible al conector. El GET de Skill es lectura de metadatos, **no ejecución del asistente nativo de Notion**. El coste incremental de suscripción es 0 €; no se han medido consumos futuros fuera de límites Free. App/CRM/Supabase/WordPress/PROD siguen sin cambios.
