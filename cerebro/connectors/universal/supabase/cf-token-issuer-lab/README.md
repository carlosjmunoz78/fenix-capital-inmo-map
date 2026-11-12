# FACT-001 · Cloudflare Issuer v2 LAB · Estado 11/11/2026

**ACTIVE v10 · SOLO LECTURA · NO CONECTADO A CEREBRO CONSOLE PROD.**

## Identidad y seguridad
- Cuenta fija `e39a57e1ac42650ca5a6d5307cf0ac8e`; token `cerebro_cf_account_token_issuer_v2` almacenado **solo en Supabase Vault** del proyecto `cluhljgonannaafpmblx`.
- V2 verificado en cuenta con exactamente `Account API Tokens Write` (excluidos Billing, Integration, DNS y Workers).
- Edge `cerebro-fact001-cf-issuer-lab` v10 `verify_jwt=false` **porque usa OIDC GitHub RS256 custom obligatorio**, exacto repo/rama/workflow/audiencia/actor. No hay bypass anónimo.
- ALLOWLIST en runtime: `GET /health` y `POST /verify-scoped-issuer-v2`; ambas requieren firma. Mutaciones `v2-child-create`, `v2-child-revoke`, `issue-d1-read-lab`, `issue-scoped-issuer-v2` devuelven **404**.
- Sin rutas de escritura a Cloudflare en bundle vivo. Tampoco se accede al emisor v1 en este servicio.
- Bundle sha256: `2e7dc0a823b353022fbb426c2a24e1a718d0351e38c6202a1c2389b3d95a81c8`.
- Cron y cola de órdenes autónomas **NO habilitados**. NO confundir GitHub OIDC LAB con orden firmada del usuario en Console PROD.

## E2E previo y cleanup completados
- [Run issuer v2 verificado](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42993618913).
- [Run E2E D1 Read child + revoke + HTTP401](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42994346869).
- [Run post-cutover v10 readonly](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42995197342).
- Hijo efímero revocado y eliminado Cloudflare; dos secretos Vault de prueba retirados. E2E v9 y rollback conservados en historial de la PR #44. No borrar v2.
- D1 permanece 10/10, sin Worker nuevo, sin rutas públicas, sin compras.

## Rollback y dependencias
- Código y políticas anteriores preservados en commit `40ea6ee6cc8e79ddbb91234139b71da57b70d7f4` y versiones Edge previas; **rollback físico a v9 no se ha ejecutado** porque restauraría rutas mutantes, contra la política de no exposición tras E2E.
- Para rollback correctivo de v10 (en caso de error de lectura), restaurar snapshot v7 verificando diff de rutas y re-aplicando cierre de mutaciones; nunca revocar v2 sin recuperar dependencias.
- Token v1 sigue activo y demasiado privilegiado por compatibilidad/ausencia de inventario global de consumidores; requiere gate específico antes de desactivarlo.
- Gateway Console/owner JWT, una cola duradera con idempotencia, auditable, quota/cost guard, automatizaciones CEREBRO y promoción de producción siguen **PENDIENTES**.

**Next gate:** `CF-GATEWAY-SIGNED-OWNER-DUAL-E2E-QUEUE-LAB`, sin tocar App/CRM/PROD/DNS/main.
