# CEREBRO OS · Compatibilidad Cloudflare para OPERATIVA · 18/11/2026

**Estado: LAB LOCAL, NO DESPLEGADO. PROD_PROMOTION=HOLD.**

## Alcance verificable
- Base: PR #75 SHA `7163dccd962a19fbd5301b14fcacacf08b7245ea`; PROD real `a51dd14eac11f02424dce5db426346b041c1824f` en `app.fenixcapital.es`.
- Construcción React/Vite con salida `dist`; config Worker Static Assets con SPA fallback y `run_worker_first=["/api/*"]`.
- Worker de LAB importa **código fuente original del catálogo** `api/cerebro-agent-directory.ts` (JSON, `node:zlib`, `Buffer`). La prueba Node comprueba que son 2.506 registros y que `executed=false`.
- **Todas las llamadas a `/api/*` quedan bloqueadas**: esto es una prueba de compatibilidad de empaquetado y rutas, no una API migrada. No devuelve directorio de usuarios en Cloudflare ni solicita JWT.
- `workers_dev=false`, `preview_urls=false`, sin routes/custom domains/crons/vars, ni credenciales; workflow ejecuta **`wrangler deploy --dry-run`**, nunca un deploy remoto.

## Criterios todavía no satisfechos
1. Adapter real para GET, dueño `CARLOS-ADMIN`, timeout, token real, Origin y host (sin confiar en un header autocontrolado).
2. Reproducción segura de `/api/cerebro-preview-owner` sin depender de `VERCEL_ENV` ni `VERCEL_URL`.
3. Cloudflare Access Free configurado antes de cualquier URL pública, y login probado con identidad real.
4. Sesiones, Supabase Auth redirect, recuperación de contraseñas, CORS, seguridad anti-tenant, multiempresa y política de tratamiento de datos.
5. Regresión completa OLD vs NEW, rollback aislado Cloudflare, observabilidad y coste marginal medido.
6. Validación contractual para uso empresarial en plataforma elegida, sin contratación automática.

**Cloudflare no es sustituto operativo de Vercel mientras todos estos gates no estén VERDE.**

## Fuentes oficiales consultadas
- https://developers.cloudflare.com/workers/framework-guides/web-apps/react/
- https://developers.cloudflare.com/workers/static-assets/
- https://developers.cloudflare.com/workers/runtime-apis/nodejs/zlib/
- https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/

Documentación de compatibilidad: implementación `node:zlib` y compatibilidad Node por defecto a partir de fechas 2026-08-04. Los límites del plan Free deben comprobarse en cuenta antes de promoción. No afirmar coste 0 € medido.

**NO modificar App/CRM/Supabase, DNS, producción, PR #75 ni PR #76.**
