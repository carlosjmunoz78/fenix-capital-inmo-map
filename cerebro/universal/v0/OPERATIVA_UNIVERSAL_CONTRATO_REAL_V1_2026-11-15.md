# CEREBRO OS · OPERATIVA UNIVERSAL · CONTRATO DE CONSOLA V1
**Fecha:** 2026-11-15 · **Fuente:** inspección física GitHub PR #66, Vercel Preview, Supabase PREPROD y Opera autenticado.

## 0. Estado inequívoco
- **HECHO:** Operativa V3 existente con voz/chat, navegación, selector de empresa, vista Control y registros en Preview privado. PR #66 DRAFT, rama `cerebro/universal-control-plane-lab-v0-20261113`; el release observado antes de este bloque era SHA `e344cc29ed6c6db189853656f063256a5d115e3f`, Vercel `dpl_2HMbKGQDSyEdtS4dTFggpe4d8U8S` READY target Preview.
- **HECHO:** observación de GitHub Actions en repos públicos `fenix-capital-inmo-map` y `capital-mapa-pro`; enlaces de evidencia. Refresca a petición, al volver la pestaña y cada 120 s visible.
- **HECHO:** 179 *motores lógicos definidos* del registro FACT, no 179 ejecutores. Role-agent-registry tiene 11 roles registrados: 10 de ingeniería y 1 de ventas. Media Studio V2 materializa 529 roles diseñados: 1 cerebro, 48 departamentos, 384 especialistas, 32 supervisores, 48 jueces, 16 guardianes. Las fuentes pueden solaparse. NO sumar como agentes activos.
- **PARCIAL:** datos JOB-001: 20 controles configurados y 17 estados declarados observados anteriormente, pero existe lectura intermitente `PREPROD_GATEWAY_UNREACHABLE`. No inventar uptime/telemetría.
- **PARCIAL:** preguntas libres se encaminan a lectura determinista en Preview; chat general separado puede no estar disponible. NO es un agente omnisciente. Acciones pausar/reactivar/priorizar de la vista nueva son preflight, NO ejecutan operaciones reales.
- **POR AUDITAR:** inventario de identidades de agente/subagente/worker, concurrencia, procesos activos, relaciones `agent_id→engine_id→job_id`, gastos y SLA en GitHub privado Social, Cloudflare, Supabase, Vercel global, Hostinger, WordPress, Notion, Meta, LinkedIn y Trading aislado.
- **PROTEGIDO:** App, CRM, main, PROD, DNS, Trading y staging suspendida. Ninguna operación de este alcance modifica ni enciende esos sistemas. No crear nueva suscripción ni gasto adicional.

## 1. Contrato de observabilidad obligatoria
Cada identidad de motor/rol/agente/worker, aunque hoy no exista la conexión, debe poder resolver:
`company_id,engine_id,environment,version,agent_id,subagent_id,worker_id,provider,provider_resource_id,role,department,parent_id,job_id,run_id,desired_state,observed_state,health,source,observed_at,ttl_seconds,policy,permissions,cost_estimate,receipts,backup_ref,rollback_ref`.

**Nulabilidad por diseño:** ids y estados no verificados son `null/UNAVAILABLE`. Fichas de registro = **DEFINIDO**, fuente GET real = **OBSERVADO**, latido de runtime válido = **EJECUCIÓN VERIFICADA**, lectura cacheada = **CACHED**. Nunca inferir agente activo a partir de roles o jobs GitHub. Reloj vencido → `STALE`; fallos/red 401 → `UNAVAILABLE/DENIED` según causa, no cero.

**Fuente de verdad:** cada conector GET fijo/allowlisted, firmado/autenticado; pertenencia de empresa validada en servidor; sin credenciales en cliente. Estado por recurso y fecha de verificación visibles. La pregunta del chat debe invocar los mismos lectores, no contestar desde un catálogo histórico. Actualización visible tras mutación: invalida caché, GET físico del mismo recurso, correlaciona receipt y revision. Evitar promediar roles y trabajos.

## 2. Contrato de control
`PLAN → POLICY → CONFIRMACIÓN EXACTA → EXECUTE → RECIBO → READ-BACK → COMPARACIÓN → ROLLBACK`.
Inputs requeridos: tenant, environment, engine, provider, resource exacto, accion allowlisted, revision previa, idempotency_key, permiso, impacto previsto, coste incremental y reversibilidad.
Acciones objetivo: `PAUSE`, `RESUME`, `PRIORITIZE`, `CANCEL_JOB`, `RETRY_JOB` (cada una sólo si el proveedor tiene semántica propia y adaptador certificado). La aceleración significa cambio explícito de concurrencia/cola/presupuesto compatible con costes, no promesa vacía de rendimiento.
El recibo: actor, timestamp, hash/target, estado anterior/posterior, revision, operación física, verificación de estado remoto, error/código, idempotencia, origen de la prueba y rollback. Sin receipt o sin verificación final → `UNVERIFIED`, nunca éxito.

**HUMAN_REQUIRED:** LEGAL_REQUIRED, SIGNATURE_REQUIRED, LOW_CONFIDENCE, HIGH_RISK, POLICY_CONFLICT, SECURITY_INCIDENT, MONEY_LIMIT, CUSTOMER_HUMAN_REQUEST. La confirmación de LAB es específica para un target/acción/revision; no extiende derechos a PROD ni a otras empresas.

## 3. Primera capacidad real aislada
Crear `LAB-DEMO-001` como **worker determinista nuevo**, `fenix/LAB/0.1.0`, sin dependencias sobre servicios reales. Operaciones previstas:
- `GET state`: estado efectivo + revision + último receipt y work_units.
- `PAUSE / RESUME`: altera estado de **su propio** runtime LAB; POST idempotente bajo owner verificado, receipt durable y vuelta a leer el estado.
- `PRIORITIZE`: sólo prioridad interna 1..5 de dicho worker LAB, sin aumentar gastos ni afectar otros jobs.
- `TICK`: simula una unidad de trabajo determinista únicamente si está RUNNING; si PAUSED no procesa ninguna unidad. No publica, no hace peticiones externas, no cron, no coste de modelo.
Esta primera capacidad **no** significa control de SEO-001, Instagram, Facebook u otros motores. La extensión exige inventario y certificación de ejecutor por proveedor.

## 4. Mapa de dependencias
`Opera propietaria → Vercel Preview SSO → API Preview owner-gated → Supabase PREPROD Edge (owner PROD Gateway autenticado) → tabla PREPROD LAB privada + RPC atómica service_role → worker determinista LAB`.

- Reutilizar el verificador de propietario **SERVER-SIDE** con `fenix-app-gateway/session/context`, nunca `user_metadata`.
- PREPROD service role sólo en Edge; no usar credencial de Vercel, navegador ni GitHub.
- Nueva función/tabla con nombre propio, sin mutar `cerebro-operativa-command-executor-lab-v0`, JOB-001, cron, App/CRM, main, staging ni Social.
- Vercel Preview `target=null`, sin dominio público personalizado ni promoción automática.

## 5. Pruebas de aceptación y rollback
- Backup lógico: captura de esquema/objeto antes del cambio y migración SQL versionada; para objetos nuevos rollback `DROP` sólo si no hay recibos o luego de exportar y autorización de eliminación. No hacer ese DROP automáticamente.
- Contrato y pruebas locales antes de DDL/deploy; PREPROD sólo sobre recursos nuevos. GET anónimo → 401/403, actor no dueño → 403; nombre de motor distinto → DENIED; target `PROD/STAGING` → DENIED.
- Prueba física secuencial: inicial PAUSED, tick no ejecuta; RESUME con receipt, read-back RUNNING, TICK work_units +1; PAUSE, read-back PAUSED y tick no incrementa; PRIORITIZE sin cambio de consumo; replays idempotentes; expected_revision errónea da 409; audit sin secretos.
- Validar regresión existente y OLD vs NEW, accesibilidad móvil, rollback de Preview preservado. No promocionar a PROD hasta tribunal, política, aislamiento, incidentes, gastos y rollback físico certificados.

## 6. Siguiente incremento tras LAB
`provider registry → agent/subagent discovery → normalized heartbeat + job/run relation → provider action adapters → policy tribunal → evidence bus → event invalidation → autosupervisor`. Primera fuente ampliada: GitHub privado Social mediante backend autorizado sin publicar repos ni tokens. Segunda: Cloudflare Workers que se puedan observar sin habilitar endpoints públicos. Tercera: jobs de Supabase PREPROD ajenos a staging. Para cada una: snapshot, contrato actual, pruebas, PREPROD, rollback.

## 7. Changelog V1
2026-11-15: documentación inicial de contrato operativo real y fuente de verdad; aprobado solamente para PREVIEW/LAB. Cualquier avance se registra con SHA, migration_id, Edge version, run_id, Vercel deployment id y comprobación física, **no por intención**.
