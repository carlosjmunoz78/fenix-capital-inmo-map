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

## 18/11/2026 · Adapter opcional de propietario: implementado en LAB y probado con claves sintéticas

El archivo `worker/owner-readonly-gate.ts` implementa un **adapter HTTP de lectura desactivado por defecto**, sin depender de los objetos request/response de Vercel. El Worker enruta exclusivamente `GET /api/cerebro-agent-directory`; `/api/cerebro-preview-owner` y todas las restantes rutas API continúan devolviendo 503.

**Condiciones acumulativas para responder 200:** activar explícitamente el flag de servidor `CEREBRO_OWNER_READONLY_ENABLED=true`; configurar `CF_ALLOWED_HOST` exacto, `CF_ACCESS_ISSUER` Cloudflare Access y `CF_ACCESS_AUD` de la aplicación autorizada, y `SUPABASE_PUBLISHABLE_KEY`; validar esquema HTTPS, host, Origin y `company_id=fenix`; recibir un Bearer válido; verificar criptográficamente `Cf-Access-Jwt-Assertion` con **RS256/JWKS reales del emisor configurado**, comprobando `kid`, `iss`, `aud`, `iat`, `nbf` y `exp`; comprobar de nuevo el JWT del propietario contra `fenix-app-gateway/session/context` y `actor_code=CARLOS-ADMIN`. No usa service_role ni almacena credenciales. Toda respuesta lleva `no-store`.

Los fallos de falta de configuración, token ausente/falsificado, JWT Access expirado, sesión Supabase ajena, tenant distinto, método POST, host equivocado, Origin cruzado, JWKS o Gateway no disponibles son **denegaciones explícitas**. El catálogo devuelve `read_only:true`, `executed:false` y `runtime_verified:false`. Un token del navegador, por sí solo, nunca concede acceso.

**Prueba:** `owner-access-contract.test.mjs` genera claves RSA sintéticas con WebCrypto, firma JWTs reales en memoria, simula únicamente el endpoint JWKS Access y el Gateway, y verifica lectura autorizada y negativos sin realizar tráfico a Internet. Los tests anteriores de Workerd local mantienen **todas** las API denegadas porque el flag sigue desactivado. GitHub Actions `44211413709`, job `134490444083`, **SUCCESS**, empaquetado Wrangler 4.164.0 sin alerta node:zlib, sin despliegue remoto.

**Access Free real:** consulta de solo lectura a la cuenta Cloudflare el 18/11 encontró 4 aplicaciones Access existentes, pero **ninguna específica para `cerebro-operativa-cf-portability-lab`**. No es correcto reutilizar una política de JARVIS/FACT ni crear aquí una app pública sin preflight. Antes de cualquier despliegue remoto hacen falta una aplicación Access dedicada, host protegido, identidad permitida, AUD real y pruebas de red; ninguna ha sido creada o activada en este laboratorio.

**No confundir**: pasar el test de firma sintética no demuestra que la sesión real del propietario funcione en Cloudflare ni que el frontend haya sido migrado. `src/cerebroAgentDirectoryApi.ts` sigue limitado a los dominios Vercel actuales. No modificar el frontend existente, los dominios, Auth redirects ni la App real sin gates de cambio. El plan económico de Cloudflare tampoco está certificado: la lectura de suscripciones en la cuenta devolvió 403.

**PROD_PROMOTION=HOLD. Sin trabajadores publicados, sin DNS, sin altas ni suscripciones.**
