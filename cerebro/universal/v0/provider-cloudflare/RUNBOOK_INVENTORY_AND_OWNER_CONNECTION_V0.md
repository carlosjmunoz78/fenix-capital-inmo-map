# CEREBRO OS · Cloudflare Provider V0 · Registro, conexión y puertas de control
**Estado:** AUDITORÍA REAL HECHA; consulta Vercel en vivo PENDIENTE DE CREDENCIAL EN PREVIEW. Fecha 15-11-2026.

## 1. Evidencia física inalterable
Se consultó la cuenta Cloudflare `e39a57e1ac42650ca5a6d5307cf0ac8e` directamente mediante el conector autorizado, **sin operaciones de escritura**.

Fotografía auditada: `observations/cloudflare-workers-2026-11-15.json` (contiene timestamps de comprobación por recurso; esquema 1.1.0). Datos:
- **37 Workers** existentes en cuenta (no 37 agentes activos);
- **5 crons presentes y 32 sin cron**, comprobación de schedules de 37/37. Programación no prueba ejecuciones exitosas;
- **10 D1** en la cuenta, de ellas 8 con jurisdicción `eu` y 2 sin jurisdicción explícita en resultado (no inferir residencia);
- **5 Workers con subdominio workers.dev habilitado** y **32 sin subdominio workers.dev**. No hay prueba de que un usuario anónimo pueda acceder: Cloudflare Access, rutas y autenticación requieren revisión diferenciada;
- configuración de Worker leída de **37/37** sin mostrar secretos, sólo `COMPANY_ID`, `ENGINE_ID`, `ENVIRONMENT` cuando están presentes y booleanos `*_ENABLED` de tipo `plain_text`;
- **Observabilidad real Cloudflare, ventana auditada de 24 horas**: 236 eventos registrados entre 2026-11-14T11:02:04.171Z y 2026-11-15T11:02:04.171Z; Facebook Buffer Replenisher 163, Facebook Knowledge AUTOQUAL 73. Son recuentos de eventos de observabilidad, NO invocaciones, trabajos, publicaciones ni éxitos certificados. Servicios ausentes de ese desglose = SIN OBSERVACIÓN, no 0 trabajos. Archivo de datos versionado 1.2.0.
- **7 Workers con ENGINE_ID declarado** identificable: SOC-FB-FINANCIAL-REAL-ESTATE-V1 (2 scripts), SOC-IG-FINANCIAL-REAL-ESTATE-V1 (2), SOC-LI-FINANCIAL-REAL-ESTATE-V1 (2), SOC-FB-BUFFER-REPLENISHER-LAB (1). Scripts múltiples pueden representar un motor lógico. **No** deducir número de subagentes de esto.
- Instagram/Facebook AUTOQUAL de los Workers examinados: `AUTOQUAL_ENABLED=false` y `GROQ_ENABLED=false`. Facebook Buffer Replenisher: `FB_BUFFER_PUBLISH_ENABLED=false`, `SOC_ALL_DISPATCH_ENABLED=false` aunque tiene cron `*/20 * * * *`. Sus flags no acreditan que todos sus otros efectos sean seguros.
- JARVIS CUT32, Instagram AUTOQUAL y Facebook AUTOQUAL siguen sin cron y sin `workers.dev`; no se cambió ninguno.

Los cinco cron verificados en esta fotografía:
`cerebro-facebook-buffer-replenisher-lab` (*/20),
`cerebro-fact001-headless-operator-lab-20261111` (*/5),
`cerebro-fact001-recovery-runner-lab` (*/5),
`cerebro-ums001-multisource-scout-lab-eu` (12:07 UTC diario),
`cerebro-ums001-polyhaven-dualmode-candidate-lab-eu` (06:23 UTC diario).
No modificar estas programaciones sin contrato de dependencias, backup y rollback probado.

## 2. Servicio vivo preparado, sin conectar todavía
API Vercel Preview: `GET /api/cerebro-cloudflare-fleet?company_id=fenix`, opcional `refresh=1`.
- Fuente preparada: `api/cerebro-cloudflare-fleet.ts`, valida servidor `CARLOS-ADMIN` mediante sesión real, hostname permitido, Vercel Preview, método GET, empresa Fénix y token exclusivamente en entorno servidor.
- Permite **solo** `GET` a `/accounts/<account_id>/workers/scripts` y a la ruta fija `/.../schedules` de Workers descubiertos; no código de scripts, no secretos, no mutaciones, no dominios desconocidos, respuestas acotadas y `UNAVAILABLE/PARTIAL` si falla un proveedor. Controles cloudflare deshabilitados.
- Cliente y chat: `src/cerebroCloudflareFleetApi.ts`, `src/CerebroCloudflareFleetPanel.tsx`, pruebas `cerebro/universal/v0/cloudflare-fleet-live.test.mjs` y `tests/cerebro-operativa-owner-quickreads-lab.spec.ts`.
- La foto auditada sirve de fallback **ARCHIVO / NO EN VIVO** cuando no hay credencial. No presentar los 37 y 5 como lecturas nuevas.
- Para mostrar actividad/último éxito real se requieren métricas de invocación, colas y logs del proveedor. Un cron no es prueba de trabajo.

## 3. Bloqueo de credencial: HECHO, no ocultar
Se intentó crear un token account-scoped con permiso exclusivo **Workers Metadata Read-Only**, caducidad 15-05-2027, y transferirlo a Vercel Preview. El primer intento de crear variable **ligada a rama** falló porque este proyecto Vercel no admite esa vinculación (Git link ausente). Una posterior transferencia entre conectores fue **bloqueada por los controles de seguridad de OpenAI**. No se forzó ni se eludió ese bloqueo.

El token temporal ID `87095d685686a581b71ea36a1aaf30b9` fue **REVOCADO** mediante Cloudflare API y el listado posterior confirmó ausencia; **Vercel no contiene** `CEREBRO_CF_READ_TOKEN_PREVIEW`. Nunca se expuso el valor en chat, archivos ni código.

**Ruta segura pendiente de acción humana administrativa, SIN pegar secretos al chat:**
1. Crear en Cloudflare (API Tokens de la cuenta exacta) un token nuevo limitado a **Workers Metadata Read-Only**, recurso únicamente cuenta `e39a57e1ac42650ca5a6d5307cf0ac8e`, con expiración y revocación controlada. No conceder Workers Write/Admin, D1 Write, Secrets Read ni Content Read.
2. Entrar directamente en Vercel, proyecto `fenix-capital-preprod-app`, Settings → Environment Variables. Introducir en el propio panel una variable server-only **`CEREBRO_CF_READ_TOKEN_PREVIEW`**, tipo **Encrypted/Sensitive**, ámbito **Preview** (sin vincular a rama en este proyecto). No crear `VITE_*` ni enviarla al navegador.
3. Tras rotar o crear el token, redeploy únicamente el Preview de PR #66. Probar consulta del dueño en URL protegida; sin credenciales las API deben devolver `503 CLOUDFLARE_READ_TOKEN_NOT_BOUND`. Validar anónimo 401/403, rechazo de POST, origen externo, Cloudflare rate limit y que el token no aparece en API/screenshot/logs.
4. Registrar fecha de caducidad en monitoreo, renovar solo con autorización; revocar inmediatamente en caso de incidente. Si se usa en otro entorno o costo, detener.

No habilitar Worker's `workers.dev`, no tocar Access, DNS, cron, D1, producción o staging para conectar la lectura.

## 4. Puertas para futura operativa Cloudflare (sin ejecutar)
- Estado actual: sólo consulta. Acciones `PAUSE_CRON`, `RESUME_CRON`, `CHANGE_PRIORITY`, `ENABLE_WORKER`, `DISABLE_WORKER` NO PERMITIDAS en esta versión.
- Cada acción futura debe resolver identidad exacta de cuenta/Worker/motor, dependencias/servicios, estado actual, flags de publicación, seguridad de red y rutas, permisos actor-server, congelación de otros productores, backup de schedules y bindings, OLD vs NEW, escenario de ensayo aislado, recibo durable, estado esperado, GET readback, costo, rollback físico y tribunal.
- Para cron, pausar significa desactivar **esa** programación, no `Worker OFF`; para Worker sin cron no existe acción `PAUSE_CRON` significativa. Reanudar cron debe restaurar el `crontab` exacto anterior. **No** realizar modificaciones masivas ni activar autopublicación de Facebook/Instagram.
- Un motor lógico puede agrupar 2+ Workers; no contabilizarlos como subagentes sin identidad declarada.
- Todos los Workers y D1 pueden existir sin estar activos; códigos `INVENTORY_PRESENT`, `CRON_CONFIGURED`, `BINDING_FLAG_DISABLED`, `RUNTIME_NOT_VERIFIED`, `UNAVAILABLE`, `ARCHIVED_SNAPSHOT` deben permanecer separados.

## 5. Changelog
15-11-2026: auditoría 37/37 crons, subdomains y settings; registro de 10 D1 y 7 scripts con motor declarado, instantánea JSON versionada. API/UX Preview lista para conexión de solo lectura. Credencial bloqueada y revocada, sin nuevas suscripciones ni escrituras Cloudflare.
