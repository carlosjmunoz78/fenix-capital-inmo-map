# FACT-001 · Orden de aceptación de conectores Cloudflare → GitHub/Supabase/Vercel/Notion → Opera
Fecha: 2026-11-10 · Estado: VERIFICADO PARCIAL / PLANIFICADO · Sólo LAB / PR DRAFT · sin cambios a PROD.

## Objetivo
Que ChatGPT normal y CEREBRO Gateway operen proveedores compartidos usando **identidades de cliente distintas**, broker de credenciales, políticas por acción, auditoría, pruebas reales y rollback. No prometer capacidad total por tener un catálogo API; no comprar, cambiar suscripciones, tocar App/CRM, DNS, PROD, main ni recursos existentes sin gates. Coste adicional objetivo 0 EUR.

## 0. Evidencia del 10/11/2026
- Supabase PROD Vault metadata: existe `cerebro_cf_account_token_issuer_v1`; el valor nunca se consultó ni imprimió.
- Desde SQL con pg_net, secretos leídos exclusivamente dentro de la operación servidor, respuestas Cloudflare GET `/accounts/e39a57e1ac42650ca5a6d5307cf0ac8e/tokens/permission_groups`: HTTP 200, `success=true`, **416** grupos. GET `/accounts/.../tokens`: HTTP 200, `success=true`, **2** tokens en lista.
- **Hallazgo de mínimo privilegio**: token emisor posee `Account API Tokens Write/Read`, **también** `Billing Write/Read`, `Integration Write`, `Account API Gateway/Read`. No usarlo para emisión hasta recortar privilegios y volver a verificar. No revocar/modificar automáticamente el token sin reemplazo probado.
- Conector directo ChatGPT `Cloudflare · CEREBRO` consultó cuatro endpoints en cuenta exacta: D1 8, Workers 7, KV namespaces 1, Access apps 3, todos GET exitosos sin mutaciones.
- PR #44 histórica: CRUD real aislado de KV y D1 probado en ambos clientes, pero el Gateway CEREBRO Console v33 sigue sin conexión productiva a FACT-001, y creación/rotación/revocación de tokens hijos **no** está probada; PR aún DRAFT.
- GitHub: 3 instalaciones de App visibles, herramienta conectada puede leer/escribir repos. Supabase: 2 proyectos accesibles. Notion: identidad y búsqueda confirmadas. Vercel: acceso a un team, pero listados con y sin team id devuelven 0 proyectos; investigar account/team binding antes de crear nada. Opera: detectadas 2 instalaciones, ambas `list_tabs` fallan por timeout, no es E2E verde.
- Restricciones proveedor: no todos los productos Cloudflare admiten tokens de cuenta (ver matriz oficial https://developers.cloudflare.com/fundamentals/api/get-started/account-owned-tokens/). Acciones con billing requieren consentimiento económico y entitlement. Acceso remoto no significa capacidad para evitar MFA, CAPTCHA, contratos o permisos de terceros.

## 1. P0: Cloudflare emisor y broker
1. Recortar/reemplazar mediante UI propietaria el emisor actual a **Account API Tokens Edit sólo en cuenta Fénix**; verificar políticas por metadata, no por suposiciones. No extraer secreto.
2. Implementar broker BACKEND exclusivo, autenticado por identidad humana real y CEREBRO service identity diferenciadas; anti-replay, idempotency, request_id, 4D scope, RBAC por operación, budgets 0 EUR y audit redacted. Ningún token en frontend, chats, logs, workflows, Git.
3. Confirmar de forma física mediante solicitud LAB crear un **token hijo de lectura de alcance mínimo**, guardarlo CIFRADO DIRECTAMENTE en Vault sin persistencia de respuesta que contenga plaintext, comprobar privilegio efectivo, hacer GET, revocar/rotar y comprobar 401 posterior; documentar reintentos y rollback.
4. Catálogo Cloudflare por dominio: D1, Workers, KV, Access, Pages, DNS, WAF/Rulesets, SSL, Queues, R2, AI, Logs, billing. Cada operación lleva estado READ_VERIFIED / LAB_WRITE_VERIFIED / PERMISSION_BLOCKED / NOT_ENTITLED / NOT_TESTED. Nada de escritura PROD hasta contrato, snapshot, tests, OLD vs NEW y rollback.
5. E2E independiente: ChatGPT normal autenticado → broker → Cloudflare y CEREBRO Gateway identidad de servicio → broker → Cloudflare. No aceptar como equivalente GitHub OIDC LAB o prueba de otra identidad.

## 2. P1: GitHub
Preferir GitHub App de instalación existente (inventariar permisos), instalación de repos concreta y tokens efímeros (~1h). Capabilities: commits/branches/PRs/workflow-dispatch/read job status/check-run/deployments/secrets write-only si API y privilegios lo permiten. Nunca hacer merge/producción automática sin CI, rollback y gate. Resolver bloqueo económico de Actions de repo privado usando runner/alternativa sin nueva cuota; no copiar código privado a repo público para esquivarlo.

## 3. P2: Supabase
Reutilizar API/MCP ya conectado; diseñar sidecar del broker en ámbito aislado, permisos backend estrictos, Vault y logs redactados; no utilizar service_role en navegador. No crear DB ni sustituir Console/App/CRM existentes. Comprobar JWT propietario vivo en canary separado antes de enlazar CEREBRO Console.

## 4. P3: Vercel
Primero resolver discrepancia del team/proyectos reales. Aprovechar SDK/REST de Vercel: projects/deployments/env (secrets no legibles)/domains/rollback; credencial scoped y auditoría. Ningún proyecto ni deploy sin inventario y rollback; no gasto.

## 5. P4: Notion
Reutilizar conexión OAuth existente; verificar por acción lectura, actualización, databases, files, usuarios y permisos del workspace. Servicio CEREBRO con identidad de integración propia. No duplicar bases de conocimiento ni suplantar permisos humanos. Sync incremental con idempotencia y conflictos resueltos por propietario.

## 6. P5: Opera y Computer Use (último)
Reparar dos instalaciones y resolver binding de browser_id autorizado, timeout/transporte y sesión; primero E2E list/read/go_to y luego clic, escritura, formularios, descargas y login manual cuando proceda. Completar puente físico Browser-1; no inferir control completo por disponer de 7 herramientas de Opera.

## Gates por proveedor
- inventario y alcance de cuenta; permisos efectivos; capacidad real por endpoint;
- identidad autenticada / least privilege / credential broker;
- dry-run/lectura → recursos LAB propios → tests negativos → backups/snapshot/rollback;
- medición de cuota y 0€; logs sin secretos; protección humana por LEGAL_REQUIRED, SIGNATURE_REQUIRED, LOW_CONFIDENCE, HIGH_RISK, POLICY_CONFLICT, SECURITY_INCIDENT, MONEY_LIMIT, CUSTOMER_HUMAN_REQUEST;
- doble E2E con ChatGPT y CEREBRO, y sólo después habilitación escalonada.

## Siguiente bloque único
`CF-TOKEN-ISSUER-001_P0_SCOPE_CORRECTION_AND_LAB_BROKER` — no se declara operativo. Mantener PR #44 DRAFT, main/Console v33/App/CRM/WordPress/DNS/Workers existentes intactos.
