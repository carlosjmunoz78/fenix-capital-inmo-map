# FACT-001 · CF-TOKEN-ISSUER-001 · Metadatos físicos y gate de sustitución · 2026-11-11

**Estado:** PARCIAL / BLOQUEADO EN EMISIÓN SEGURA. **Ejecución:** lectura oficial real Cloudflare desde ChatGPT, sin escritura. **Cuenta:** `e39a57e1ac42650ca5a6d5307cf0ac8e`.

## HECHO verificable
- GitHub PR #44 sigue OPEN/DRAFT; rama aislada sin merge.
- Cloudflare GET `/accounts/{account_id}/tokens` devolvió `success=true`, **3 tokens activos** (en lugar de 2 del snapshot anterior).
- `cerebro_cf_account_token_issuer_v1`: `Integration Write`, `Account API Gateway`, `Account API Gateway Read`, `Account API Tokens Write`, `Account API Tokens Read`, `Billing Write`, `Billing Read`. Alcance: una sola cuenta, pero permisos excesivos.
- `CEREBRO-FACT001-D1-READ-LAB-20261110`: solo `D1 Read`, caduca 2026-11-17.
- `CEREBRO-INSTAGRAM-LAB-DEPLOY-TEMP`: `Workers Admin`, token preexistente fuera del alcance de esta misión; NO modificado.
- `GET /accounts/{account_id}/tokens/permission_groups`: 416 grupos, correspondencia de permisos comprobada. No se leyó, mostró ni copió ningún valor de token.
- Se incorporó módulo determinista `cloudflare-issuer-policy.mjs` con pruebas negativas y rechazo de permisos desconocidos/excesivos. Este módulo no crea, revoca ni guarda credenciales.

## Puerta de emisión cerrada
El emisor v1 permanece ACTIVO, pero la política impide aceptarlo como emisor de mínimo privilegio. **No emitir token hijo a través de un canal cuya respuesta pueda conservar el secreto en logs/artefactos o mostrárselo al cliente.**

Sustituto de destino: `cerebro_cf_account_token_issuer_v2`, **únicamente `Account API Tokens Write`**, recurso exacto cuenta Fénix. Creación de sustituto, custodia directa cifrada en Supabase Vault, prueba efectiva mediante credencial v2, un token hijo D1 Read LAB de 24 h, posterior revocación y verificación 401: **TODAVÍA NO EJECUTADOS**. Mantener v1 sin revocarlo ni tocar credenciales existentes hasta prueba completa.

## Contrato mínimo exigible para continuar
1. Backend con identidad firmada propia y acceso a Vault dentro de la misma ejecución (sin reenvío de secreto por tools/chats).
2. Reemplazo v2 no privilegiado → secretos guardados directamente → GET restringido → negativo de privilegios → token hijo → GET D1 → revocación tras prueba → GET 401.
3. Anti-replay e idempotencia por `request_id`, 4D, operaciones y destinatarios exactos, auditoría REDACTADA, sin costes facturables.
4. Snapshot de servicio LAB y rollback verificados antes de desplegar nueva ruta. No crear D1; se registran **10/10** ocupadas.
5. Si el proveedor requiere pantalla de consentimiento/MFA, acción humana solo para dicho paso. No pedir nuevas autorizaciones de proyecto.

## Estados
- `issuer_legacy_preflight=BLOCKED_OVERPRIVILEGED` **VERIFICADO FÍSICAMENTE**.
- `issuer_v2=NOT_PROVISIONED`, `child_lifecycle=NOT_TESTED`, `gateway_dual_e2e=NOT_TESTED`.
- `provider_mutations=0`, `subscriptions_added=0`, `PROD=UNCHANGED`.
- **next_block:** `CF-TOKEN-ISSUER-001_BACKEND_VAULT_DIRECT_PROVISION_AND_E2E`.
