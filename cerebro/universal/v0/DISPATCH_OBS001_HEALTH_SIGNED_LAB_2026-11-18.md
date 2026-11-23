# CEREBRO OS · DISPATCH-OBS-001 · Salud física de despachadores existentes
**Fecha:** 18/11/2026 · **Estado:** HECHO Y VERIFICADO EN LAB para disponibilidad de API; EJECUCIÓN DE TRABAJOS SIN CERTIFICAR.

## 1. Objetivo, contratos y dependencias
Conservar los ejecutores originales de CONSOLE-001, FACT-001 y UMS-001 sin modificar ni relajar su autenticación OIDC de GitHub Actions. Mientras Actions está temporalmente bloqueado, ofrecer un observador independiente de disponibilidad **únicamente GET /health**:
- `jarvis-work-dispatch-v1-preprod` → `CONSOLE-001`
- `cerebro-browser-work-total-dispatch-v1-preprod` → `CONSOLE-001`
- `cerebro-creative-dispatch-v1` → `FACT-001`
- `cerebro-ums-production-dispatch-v1` → `UMS-001`

Todas las URL se construyen con los slugs literales y host fijo del proyecto Supabase LAB `hnqlnvakzaywtafeiybt`. No hay parámetro de URL arbitrario ni llamadas POST, lease, heartbeat, enqueue o complete. No leer contraseñas ni claves de trabajos.

## 2. Implementación física
- `supabase/migrations/20261118220000_cerebro_dispatch_health_probe_lab_v1.sql`: tablas privadas `cerebro_lab.dispatch_health_signer_v1` y `dispatch_health_sample_v1`, RLS y permisos denegados a anon/authenticated/service_role. HMAC-SHA256 por fila con secreto aleatorio exclusivo de esta función, dominio `DISPATCH_HEALTH_LAB_V1`.
- `cerebro_lab.enqueue_dispatch_health_v1()`: produce cuatro peticiones GET a través de **pg_net existente**, sin depender de GitHub Actions.
- `cerebro_lab.collect_dispatch_health_v1()`: consume respuestas del propio pg_net, valida código HTTP 200, `ok=true`, servicio exacto, entorno PREPROD y restricciones indicadas; genera recibo firmado. No confundir una API accesible con ejecución autónoma.
- `public.cerebro_lab_dispatch_health_observe_v1()`: verifica criptográficamente las cuatro últimas respuestas sin revelar la clave; solo `service_role` puede ejecutar RPC. No acepta datos enviados desde navegador.
- Nueva Edge aislada `cerebro-dispatch-health-lab-v1` v1: GET solo de lectura, `CARLOS-ADMIN` validado con Gateway propietario, datos LAB y flags `legacy_jobs_executed=false`, `full_engine_certified=false`.
- Vercel Preview: `api/cerebro-executor-coverage.ts`, `src/cerebroExecutorCoverageApi.ts` y `src/CerebroRoleAgentRosterReadonly.tsx` exponen inventario separado de salud, firma, estado y temporalidad. No se acredita autonomía ni un agente por un health check.

## 3. Evidencia real de aceptación
- Opera (sesión de propietario): los cuatro endpoints originales respondieron `ok:true` y `environment:PREPROD`.
- Supabase SQL: `select cerebro_lab.enqueue_dispatch_health_v1();` → `QUEUED`, cuatro GET.
- `net._http_response`: cuatro respuestas reales observadas.
- `select cerebro_lab.collect_dispatch_health_v1();` → `COLLECTED`, `new_samples=4`, `health_ok=4`.
- `select public.cerebro_lab_dispatch_health_observe_v1();` → `HEALTH_ENDPOINTS_RESPOND`, cuatro `signature_verified=true`, `runtime_execution_verified=false`, `full_engine_certified=false`.
- Privilegios: anon/authenticated NO SELECT sobre tabla de muestras, service_role NO SELECT tabla privada y SÍ EXECUTE de la función que verifica la firma.
- API Vercel y Edge LAB: prueba anónima real devuelve `OWNER_SESSION_REQUIRED`; sin permisos alternativos sobre dispatchers.
- Vercel Preview `dpl_EPbWHDW11YHWaXkKZF82brahRkhq` READY, código SHA `03a22d97411c960ed916f4c5cffda0f24d37cf6b`; alias estable LAB `fenix-capital-preprod-operativa.vercel.app` reasignado. Opera propietario muestra 4/4 con firmas válidas, matriz CERT001 y QA001.
- Tests por fixtures añadidos a `cerebro/universal/v0/operativa-executor-coverage-private.acceptance.mjs`. GitHub Actions temporalmente no ejecuta esa suite; la compilación Vercel y el E2E UI de lectura sí se han comprobado.

## 4. Programación autónoma, costes y alcance
- #80 `cerebro-dispatch-health-enqueue-lab-v1`: `8,38 * * * *`, activo, cuatro GET cada media hora.
- #81 `cerebro-dispatch-health-collect-lab-v1`: `10,40 * * * *`, activo, valida y firma las respuestas.
- En total, ocho peticiones GET/hora, todas de salud y sin carga comercial. Ninguna suscripción nueva. Coste marginal de red/DB no medido. La ejecución periódica de los jobs 80/81 está CONFIGURADA y CONFIRMADA ACTIVA; todavía falta una prueba de su primer ciclo disparado por cron, distinta de las llamadas manuales que produjeron las primeras cuatro muestras.
- Los dispatchers **siguen exigiendo GitHub OIDC** para ejecutar trabajos. Su servidor responde, pero sus capacidades de ejecución no están acreditadas por este observador.
- `UMS-001` mantiene HOLD (un trabajo), sin levantarlo, publicar, consumir IA de pago ni generar vídeos.

## 5. Monitor, recuperación y rollback
```sql
select jobid,jobname,schedule,active from cron.job where jobid in (74,77,80,81);
select public.cerebro_lab_dispatch_health_observe_v1() as verified_health;
select state,count(*) from cerebro_lab.dispatch_health_sample_v1 group by state;
-- Pausar únicamente las nuevas sondas (NO ejecutado):
select cron.unschedule('cerebro-dispatch-health-enqueue-lab-v1');
select cron.unschedule('cerebro-dispatch-health-collect-lab-v1');
-- Reconstituir con misma configuración después de verificar fuente y permisos:
select cron.schedule('cerebro-dispatch-health-enqueue-lab-v1','8,38 * * * *','select cerebro_lab.enqueue_dispatch_health_v1();');
select cron.schedule('cerebro-dispatch-health-collect-lab-v1','10,40 * * * *','select cerebro_lab.collect_dispatch_health_v1();');
```
Se conserva último deployment READY anterior `dpl_FrHvqwa8zWjZN6B9DKW6yjhCkBfj` como rollback únicamente del alias privado LAB. **No se ha probado rollback completo de producción ni backup externo del nuevo ledger**, por tanto gate PROD=HOLD.

## 6. Próximos gates de ejecución
1. Confirmar primer ciclo automático de jobs 80/81 y firma de cuatro nuevas muestras.
2. Para CONSOLE-001: alternativa de ejecutor paralelo con identidad autorizada, trabajo real seguro, políticas, contrato, HMAC y comparación con ruta OIDC (sin modificar ni eludir protección original).
3. FACT-001: atestación histórica del registro existe; falta ejecución integral de la fábrica real, permisos, evaluación y tribunal.
4. UMS-001: HOLD permanece hasta derechos de activos, presupuesto, calidad audiovisual y ejecutor alternativo autorizado; no reiniciar el trabajo actual.
5. Autonomía de perfiles: sólo dar por activos los que generen recibos firmados desde un trabajo real con `company_id`, `engine_id`, `environment`, `version`, `agent_role_id`, `job_id`, `event` y sello comprobable.

**PROMOCIÓN PROD=HOLD.** App/CRM/WordPress/Supabase PROD/Cloudflare/DNS/main/Trading intactos.
