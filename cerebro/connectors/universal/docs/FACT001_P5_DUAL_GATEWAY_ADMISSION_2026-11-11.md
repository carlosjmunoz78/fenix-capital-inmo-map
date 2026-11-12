# FACT-001 · P5 Gateway dual + admisión duradera · 2026-11-11

**Resultado:** HECHO EN CÓDIGO Y CI, NO CONECTADO NI AUTÓNOMO. PR #44 DRAFT, LAB.

## Trabajo nuevo
- `services/provider-headless-lab/fact001-dual-read-ingress.mjs`: admisión para cinco proveedores mediante una única capa lógica y un único runtime compartido reutilizable.
- Dos principales de confianza distintos: `chatgpt-human` debe llegar firmado/autenticado por el adaptador de acceso al ChatGPT normal, `cerebro-service` por el servicio headless real. Nunca tomar identidad de los parámetros del modelo.
- `source=owner_order` solo identidad real del titular y autoridad `owner_signed_command`; `source=automation` solo servicio CEREBRO `registered_automation` activo. Evita suplantación y autoautorización.
- Admite **únicamente** `provider.inventory.read` en LAB (5 providers) con company/engine/environment/version exactos; `max_cost_eur=0`, `request_id`, `idempotency_key`. Prohíbe cualquier escritura, prod, cross-company, token en request.
- Firma/fingerprint SHA256 e inyección de `queue.writeAtomic` obligatoria con `durable=true`. Su implementación real debe escribir cola, dedupe y evento de auditoría en **una transacción**. Los tests de cola son dobles sintéticos, no un D1 desplegado.
- `tests/fact001-dual-read-ingress.test.mjs`: 8 pruebas nuevas de dos principales, automatización firmada, repetición, conflictos, no-cost, abuso de scope y ausencia de backend durable.
- **CI físico:** [GitHub Actions #42991696940](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42991696940), 164/164 headless PASS, 22/22 issuer, 5/5 registry, 8/8 onboarding y 4/4 scaffold. Código no desplegado; cero mutaciones de proveedores.

## Gates NO cerrados
- AUTH real cliente ChatGPT normal → broker; aún no existe la verificación dinámica integrada en el Gateway.
- AUTH órdenes firmadas del propietario desde CEREBRO Gateway; el GitHub OIDC del runner LAB es evidencia independiente **limitada**, no equivale a orden de propietario.
- `queue.writeAtomic` en almacenamiento persistente **no existe conectado a esta entrada**; no afirmar durabilidad por mock.
- Cola/scheduler/reintentos/reconciliación/restauración y supervisión FinOps end-to-end faltantes.
- Cloudflare emisor v2 requiere autorización humana y v6 rollback pendiente; GitHub repo create 403; Supabase admin full parc.; Vercel generic OAuth scopes diferentes; Notion sync candidate OFF. No promover hasta cerrar esos riesgos.

## P6 Opera
**NO INICIADO**, conforme a instrucción del titular. No modificar navegador, tabs, descargas ni credenciales antes de los gates anteriores.

**Siguiente bloque único:** `FACT001_DUAL_INGRESS_DURABLE_ADAPTER_AND_GATEWAY_E2E_NONPROD` sin nuevos servidores o D1, reutilizando sólo recursos que tengan backup/permisos confirmados.

**Entorno:** LAB, `company_id=fenix-capital`, `engine_id=FACT-001`, `version=1.0.0`, gasto adicional contratado 0 EUR. Ninguna modificación App/CRM/PROD/DNS/WordPress/Trading/SEO/main.
