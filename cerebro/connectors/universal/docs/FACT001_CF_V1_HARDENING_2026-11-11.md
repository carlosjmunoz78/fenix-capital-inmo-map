# FACT-001 · CF v1 alcance mínimo conservativo · snapshot antes de mutación
Fecha: 2026-11-11. Emisor viejo sólo de LAB `cerebro_cf_account_token_issuer_v1`, ID `45c74c2de351bf8c1deeb1bee3f8f7ef`, cuenta `e39a57e1ac42650ca5a6d5307cf0ac8e`.

Este snapshot NO contiene secretos ni credenciales; sólo metadatos de autorización de Cloudflare. Revisión específica de dependencias LAB: `cerebro-fact001-cf-issuer-lab` v10 ya no lee v1; `cerebro-fact001-cloudflare-*` y `owner-canary` usan `cerebro_fact001_cf_readonly_lab_20261109`, `headless-provider-lab` usa sus propios secretos. Supabase `cerebro-console-gateway-v0` v33 no tiene referencia directa v1. El único uso observado del token v1 fue 2026-11-11T08:49:44Z por el workflow de corrección LAB.

**Operación preparada**: mantener token v1 ACTIVO conservando `Account API Tokens Write` y `Account API Tokens Read` para compatibilidad de emisión y lectura; eliminar exclusivamente cinco permisos sobrantes (Integration Write, Account API Gateway, Account API Gateway Read, Billing Write, Billing Read). No revocar, no cambiar el valor y no tocar v2. Original exacto y rollback se documentan en `registry/cloudflare-v1-legacy-scope-snapshot-20261111.json`.

**Limitación:** el inventario de consumidores fuera de FACT-001 no es global; no afirmar equivalencia ni retirar el token entero hasta completar dependencias. Antes del PUT comprobar id/nombre/recurso exactos y siete permisos esperados; después comprobar dos permisos y repetir smoke de identidades. Si hay fallo, PUT original del snapshot, GET verificado. No crear suscripciones ni D1.
