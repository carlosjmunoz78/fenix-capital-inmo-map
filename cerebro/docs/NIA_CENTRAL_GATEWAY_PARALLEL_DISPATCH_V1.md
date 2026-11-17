# NIA ↔ CEREBRO FACT-001 · Despacho firmado paralelo · 17/11/2026

## Estado
**CÓDIGO PREPARADO EN PR DRAFT**. No registrar que el Gateway central haya habilitado NIA. FACT-001 y UMS-001 están desplegados como Workers LAB independientes, sin URL pública ni cron.

### Inventario de las dependencias actualmente desplegadas
- `cerebro-fact001-gateway-lab-eu-20261109`: `GATEWAY_ENABLED=false`, `ALLOW_MUTATIONS=false`, `UMS001_QUEUE_ENABLED=true`, `UMS001_PRIVATE_BINDING_ENABLED=true`, bindings `LAB_KV`, `UMS001_RUNTIME_BROKER`, `UMS_PRODUCER`, y cuatro credenciales de servicio cifradas.
- `cerebro-ums001-universal-gateway-lab-eu`: `UNIVERSAL_GATEWAY_ENABLED=true`, `REGISTERED_IMAGE_ENABLED=true`, `REGISTERED_IMAGE_QUEUE` y `MEDIA_LEDGER` (Durable Object), con firma de mensajes de su propia familia.
- Ninguno contiene una ruta NIA; el handler `queue` del FACT-001 solo admite `cerebro-fact001-ums001-read-lab-eu`, y el UMS solo los trabajos de medios firmados. Reutilizar esa cola para NIA rompería contratos.
- Hashes de línea base de multipart `content/v2`, obtenidos por API sin extraer secretos (los límites multipart pueden variar):
  - FACT `69670bd1a8a710dcfea329e558c2490e829aa2d3d05dfedf5e87e50aa581803b`, 22202 bytes, despliegue `2be39464-9762-4ec6-a5b2-f74b9ee20112`
  - UMS `53ae6251011ec25bf496e33dc10c7228de3f071d5627a8c1790e78e7682228aa`, 17799 bytes, despliegue `d0ae998f-e238-4e6f-b4e6-5b3716101c77`
- Backend del Gateway central en LAB no se considera promovido: FACT `GATEWAY_ENABLED=false`. No tocar switches o bindings actuales sin migración OLD/NEW.
- La credencial NIA de Notion está en un Worker **distinto**, `cerebro-nia-notion-proof-lab`, únicamente lectura de la página Skill; E2E ACTGW ya acreditado 17/17 PASS y Worker restaurado OFF.

### Nuevo contrato aditivo: `cerebro/gateway/nia-private-dispatch-v1.mjs`
- Cola futura exclusiva `cerebro-nia-actgw-private-lab-eu`, **no usar** colas multimedia existentes.
- Envío solo desde un emisor autenticado de FACT-001 mediante HMAC-SHA256 **nuevo**, nunca reutilizar las claves HMAC de UMS, ni `GATEWAY_CALLER_TOKEN` ni el token Notion.
- Audiencia, issuer, empresa, motor, entorno, versión, capacidad y TTL (≤60 s) estrictos. HMAC incluye payload e identidad. El cliente jamás puede establecer `authorized:true`; se deriva dentro del adaptador tras validar la firma.
- Rechazo seguro sin lecturas de Notion para mensajes manipulados, caducados, otras empresas, otras colas y falta de firma. Antirrepetición **atómica obligatoria** (D1 UNIQUE o Durable Object) antes de llamar al ACTGW real; Cloudflare KV no sirve como garantía de unicidad fuerte.
- Motor ACTGW real: `ActionGatewayV1` + binding `bindNiaDiscoveryToActionGatewayV0`, sin modificar el primero. Resultado metadata-only, sin iniciar Notion AI ni exponer contenido.
- No hay nueva suscripción. Cambios quedan en rama aislada.

### Pruebas
`node --test cerebro/tests/nia-private-dispatch-v1.test.mjs`. No se utilizan GitHub Actions durante suspensión. La aplicación real del contrato debe tener prueba firmada desde el emisor central y replay ledger antes de activarlo.

### Gates PREPROD (no saltar)
1. Crear e inspeccionar emisor **paralelo**, con identidad separada y secreto propio generado/guardado en vault; elegir ledger anti-replay duradero.
2. Verificar contratos de mensajes y firma, comparar OLD vs NEW para los eventos UMS que ya existen, sin modificar FACT original.
3. Fijar snapshot, pruebas independientes, backup/rollback y límites de coste. Promover solo si firmas, idempotencia persistente, auditoría y reversión están VERDES.
4. Registrar `notion.nia.discover.read` en el despacho central solo cuando haya evidencia del emisor IAM. **No merge del PR #70 antes de esas pruebas**.
5. Mantener GitHub Actions excluido de la ruta de prueba.

### Decisión
`NIASIDE-CENTRAL-DISPATCH` = **PARCIAL — contrato listo, central sin conexión**; user action no requerida para continuar con pruebas técnicas LAB, no se autoriza acceso a PROD.
