# FACT-001 · Fábrica de tokens Cloudflare para ChatGPT normal y CEREBRO
Fecha: 2026-11-10. Estado: **DEFINIDO / NO DESPLEGADO / NO PROMOVIDO**. No secretos ni endpoints mutables en este documento.

## Objetivo

Una única capacidad lógica `CF-TOKEN-ISSUER-001` accesible a los clientes autenticados **ChatGPT normal** (plugin/MCP conectado y bridge seguro cuando falte OAuth) y **CEREBRO Gateway**. Ambos deben poder **solicitar** emisión, consulta, rotación y revocación de tokens sin recibir ni visualizar una credencial maestra. El servidor controlador autentica, consulta políticas/recursos, limita permisos y crea tokens mediante API. El token nuevo se entrega exclusivamente al almacén seguro y al consumidor autorizado, sin devolverse al navegador, GPT ni logs. Para materializar una clave creada via API en Vault se necesita un flujo de transferencia cifrado y atómico con comprobación de redacción de logs.

## Base real y necesidad de credenciales humanas

- EXISTE: `CEREBRO-OS-CLOUDFLARE-UNIVERSAL`, token amplio (59 permisos observados previamente) para recursos; carece de privilegios para tokens API, GET cuenta/usuario tokens devolvieron HTTP 403, código 9109. El conector directo ChatGPT puede hacer GET y CRUD controlado de KV y D1; no se ha probado emisión de tokens.
- **Siguiente token MANUAL propuesto (único adicional para cuentas):** `CEREBRO-CLOUDFLARE-TOKEN-FACTORY-V1`, permisos **Account > Account API Tokens > Edit**, ámbito solo la cuenta `e39a57e1ac42650ca5a6d5307cf0ac8e`, sin DNS/Workers/D1 edit ni otros permisos de operación en ese token. Cloudflare requiere usuario Super Administrator o rol API Token Provisioning para creación de tokens de cuenta.
- Ruta de creación cuenta: `https://dash.cloudflare.com/` → seleccionar cuenta → Manage account → Account API tokens → Create Token. Cuenta Cloudflare y permisos a verificar físicamente en el asistente. La API oficial es POST /accounts/{account_id}/tokens.
- Ruta de depósito: `https://supabase.com/dashboard/project/cluhljgonannaafpmblx` → Database → Vault, secreto `cerebro_cf_account_token_issuer_v1`. Nunca pegarlo en chat, GitHub, Workflows ni WordPress.
- Si la conexión OAuth del ChatGPT instalado puede pedir explícitamente `account_api_tokens:create`, preferir reautorización del conector para el cliente ChatGPT en lugar de compartir la clave emisora. **No probado** que ese plugin ofrezca la reautorización de ámbito.
- **Tokens personales** (`/user/tokens`) son una clase distinta: Cloudflare exige plantilla **Create additional tokens** para bootstrap del permiso User > API Tokens > Edit; solo si una función específica realmente los necesita se justificaría un **tercer token inicial manual** de usuario y Vault separado. No confundirlo con tokens de cuenta ni garantizar gestión de todos los productos con solo un token de cuenta.
- Objetivo mínimo: **1 token manual nuevo** para emisión de tokens de cuenta, además del amplio ya existente; **0 nuevos tokens manuales por cada motor** después de verificar el emisor. Se generarán tokens de recursos automáticamente, con duraciones/alcances distintos. Total de secretos finales puede crecer por aislamiento, pero no requeriría creación manual para cada uno.

## Contrato futuro del broker (CEREBRO + ChatGPT)

`company_id`, `engine_id`, `environment`, `version`, `client_id`, `request_id`, `account_id`, `purpose`, `requested_permission_groups`, `resource_scope`, `ttl`, `cost_cap_eur`, `risk`, `approval_id`, `audit_id`. Descubrimiento de permission groups por API (no usar IDs estáticos); cotejo con derechos efectivos y permisos allowlist por categoría; nunca crear un token por encima del alcance permitido ni un permiso editor general por defecto.

Operaciones: `account_token.provision`, `list_metadata`, `rotate`, `revoke`. `create` devuelve identificador/metadata y estado; **jamás el valor** del token en chat ni registros. Almacenar en Vault con separación de roles, auditoría, revocación y fallback solo explícito. El token emisor NO se expone como variable de entorno de frontends ni como parámetro aceptado desde la conversación.

## Reglas de administración total

Cloudflare tiene miles de operaciones, pero el catálogo no garantiza permiso, entitlement, cuota gratuita ni rollback. Los clientes pueden descubrir, planear y ejecutar **operaciones autorizadas** con motor lógico compartido, políticas por recurso, snapshots/rollback y gates. Alta exposición (tokens, DNS, WAF, credenciales, facturación y borrado de datos existentes) exige aprobaciones/controles del tribunal según riesgo. Ningún servicio no habilitado se contrata automáticamente. Usar HUMAN_REQUIRED solo en las excepciones previstas.

## Comprobaciones de aceptación aún faltantes

1. Crear token emisor por vía dashboard (acción humana) y depositarlo directamente en Vault mediante UI segura.
2. Verificar permiso `GET /accounts/{account_id}/tokens/permission_groups` 200 y un token LAB nuevo limitado. Confirmar que el emisor tiene capacidad de generar permisos útiles más allá de sí mismo respetando permisos del creador.
3. Guardar clave hija sin fuga, probar READ/WRITE aislado, rotación, revocación y comportamiento tras revocación.
4. Exponer broker autenticado y auditado a **ambos clientes**, verificar request real ChatGPT y request CEREBRO LAB; no aceptar como probado por un manifiesto.
5. Validar vínculo Console principal con sesión actual y token de recurso mínimo; sólo luego promoción gradual, comparador OLD/NEW y rollback.
6. Las acciones PROD ajenas a tokens continúan bloqueadas por contratos, coste, backup y riesgo hasta superar las pruebas particulares.

Documentación oficial:
- https://developers.cloudflare.com/fundamentals/api/how-to/create-via-api/
- https://developers.cloudflare.com/fundamentals/api/get-started/account-owned-tokens/
- https://developers.cloudflare.com/changelog/post/2026-10-01-account-api-token-provisioning/
- https://supabase.com/docs/guides/database/vault

Conservar → entender → envolver → probar → mejorar → migrar. Sin merge, sin credenciales nuevas aún, App/CRM/Console v33 intactos.

## Evidencia física añadida 10/11/2026 · Primera emisión automatizada REAL
- Servicio nuevo independiente `cerebro-fact001-cf-issuer-lab` **ACTIVE v4** en Supabase proyecto actual, `verify_jwt=false` exclusivamente porque valida por sí mismo JWS RS256 de GitHub OIDC y claims exactos; **no** se conectó Console v33.
- Fuente, pruebas, workflows y runbook en `cerebro/connectors/universal/supabase/cf-token-issuer-lab/`. Un solo token hijo fijo; no hay proxy Cloudflare arbitrario ni endpoint de escritura de recursos PROD.
- Primeros tres intentos de E2E fallaron en la lectura inmediatamente posterior a crear el token. Backend los revocó de forma controlada; se comprobaron 2 tokens iniciales, sin tokens nuevos persistentes. Evidencia run `#42784264310` attempts 1-3, diagnóstico sin secretos `CHILD_EFFECTIVE_READ_DENIED`.
- Cambio CAUSAL único: separar emisión+custodia atómica y comprobación de uso posterior. La ejecución `#42785585268` terminó **SUCCESS**: 18 pruebas de política/identidad PASS; anónimo 401; credencial falsa 401; OIDC firmado 200; creación cuenta HTTP 200; clave recibida únicamente en memoria Edge y guardada en Vault. Ninguna credencial pasó por GitHub ni el chat. Lectura D1 real con token hijo respondió HTTP 200 en verificación diferida.
- SQL metadata verificada (sin descifrar ni imprimir secretos): `vault.secrets` tiene `cerebro_cf_d1_read_lab_20261110` además del emisor previo. Cloudflare GET account tokens API HTTP 200 confirma **3** tokens tras la prueba y token nuevo `CEREBRO-FACT001-D1-READ-LAB-20261110` **active**, con únicamente permiso **D1 Read**, recursos sólo cuenta `e39a57e1ac42650ca5a6d5307cf0ac8e`, caducidad **2026-11-17 00:00 UTC**.
- Estado correcto: **LAB PHYSICAL ISSUANCE+VAULT+READ VERIFIED** para identidad de servicio CEREBRO por GitHub OIDC; **no** implica fábrica total para ChatGPT normal, ni revocación/rotación automatizadas aprobadas ni operación autónoma de PROD. Token hijo temporal expira; preparar renovación controlada antes de caducidad, sin crear duplicados.
- **Pendientes prioritarios:** el token emisor original aún conserva permisos extra `Billing Write/Read`, `Integration Write` y `Account API Gateway`; debe restringirse/rotarse con continuidad probada. El permiso `Account API Tokens Write` figura **no seleccionable** para crear un emisor hijo usando el rol actual; no asumir delegación recursiva. Diseñar broker central para identidades ChatGPT y CEREBRO separadas, con interfaz autenticada, pruebas negativas, eventos, trazabilidad y política por operación. Completar GET/WRITE de cada producto Cloudflare con pruebas específicas, protección de coste y rollback.
- **No modificado**: App, CRM, Console v33, main, DNS, Cloudflare Workers y recursos D1 existentes; no contratación nueva. PR #44 continúa DRAFT.
