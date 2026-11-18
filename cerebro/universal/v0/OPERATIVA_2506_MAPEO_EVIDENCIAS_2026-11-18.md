# CEREBRO OS · Auditoría objetiva 2.506 perfiles · 18/11/2026

**HECHO · Inventario generado y comprobado:** 2506 roles lógicos, cada uno con `profile_key` única, familia, fuente, estado de definición y evidencia de motor declarado. Archivos: [auditoría JSONL de los 2506](../../registry/operativa-profile-runtime-audit-2506.v1.jsonl) y [resumen verificable](../../registry/operativa-profile-runtime-audit-2506.summary.v1.json).

## Distribución validada
- ENGINEERING: 10
- INSTAGRAM_DEPARTMENTS: 39
- MEDIA_STUDIO: 529
- REVENUE_SALES: 1
- SEO_ENTERPRISE: 191
- SOCIAL_FACEBOOK: 598
- SOCIAL_INSTAGRAM: 569
- SOCIAL_LINKEDIN: 569

## Evidencia de runtime
- Perfiles con referencia explícita a un motor en su origen: **202** (referencia declarativa, NO ejecución).
- Perfiles sin `engine_ids` declarados: **2304** (NO inventar asociación).
- Templates, no instancias: **29**.
- Workers Cloudflare descubiertos: **45**; `ENGINE_ID` configurados en **8** workers con **5** IDs distintos; todos son evidencia de configuración y no de ejecución.
- Edge Functions Supabase registradas ACTIVE: **118**; ACTIVE significa desplegada, no ejecutando un trabajo.
- Perfiles con motor declarado que coincide exactamente con ENGINE_ID de Worker: **0**.
- Identidades de perfil iguales a un ENGINE_ID de Worker: **0**.
- **Perfiles ejecutándose acreditados por identidad individual: 0**, porque ningún registro de proveedor aportó prueba de ejecución enlazada exactamente a profile_id.

## Política de acreditación
Para pasar un perfil a ACTIVO se necesitan simultáneamente: `company_id`, `profile_id`, `engine_id`, `runtime_id`, `environment`, `observed_at`, último run real + resultado + evidencia de ejecución y permisos. La coincidencia de nombre de familia, Worker desplegado, workflow creado o plantilla declarada NO es suficiente.

No se han creado Workers, Edge Functions, servidores, perfiles adicionales, servicios de pago ni permisos nuevos. El siguiente bloque deberá añadir vínculos individuales únicamente cuando el ejecutor emita o almacene el identificador exacto del perfil con un contrato firmado/validado.

**Estado: PARCIAL en autonomía, HECHO en inventario documentado y reproducible.**
