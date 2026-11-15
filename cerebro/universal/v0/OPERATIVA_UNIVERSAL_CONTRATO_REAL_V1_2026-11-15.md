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


## 8. CONTRATO AMPLIADO · DIAGNÓSTICO, CAPACIDADES, TIEMPOS, COSTES Y CONTROL UNIVERSAL

**Directiva del propietario · 15/11/2026.** Operativa debe funcionar como centro de mando conversacional y de control: el dashboard no delimita qué puede consultarse. REQUISITO DEFINIDO, NO IMPLEMENTADO POR ESTA MODIFICACIÓN. Preservar PR #66 DRAFT/LAB, sistemas existentes, gasto adicional 0 € por defecto.

### 8.1 Descubrimiento y diagnóstico consultables, incluso si no aparecen en pantalla

- **Qué agentes faltan**: comparar necesidades reales de cada empresa/proceso con capacidades, skills, motores, roles, workers y ejecutores existentes. Detectar gaps de cobertura, permisos, capacidades, integración, training, tribunal y observabilidad. No inventar agentes ni equiparar roles definidos con procesos activos.
- **Qué está fallando**: motor, agente, subagente, job, pipeline, recurso o dependencia; estado real, severidad, duración, último éxito, error concreto, causa confirmada frente a hipótesis, impacto, responsable y siguiente reparación verificable.
- **Qué hay que avanzar**: backlog priorizado con dependencias, bloqueo, acción próxima, tiempo, coste, impacto económico, ahorro y confianza de la recomendación. Priorizar capacidad existente y reutilización antes de fabricar o duplicar.
- **Qué puede hacer CEREBRO**: diferenciar capacidades operativas acreditadas, capacidades ensayadas sólo en LAB, definiciones/scaffolds y propuestas no construidas; indicar los prerequisitos para pasar de una categoría a otra.
- **Qué necesitaríamos que hiciera**: traducir cualquier objetivo de negocio en capacidades requeridas, análisis de carencias, opciones de implementación, riesgos, calidad, permisos y contratos, con coste/tiempo estimados o desconocidos.
- **Cuánto tarda y cuesta cada cosa**: duración histórica real, tiempo transcurrido, ETA con intervalo y base estadística, dependencias, posición de cola, coste real medido y coste incremental previsto separado por IA, infraestructura, servicios y recursos existentes. Incluir límites de free tiers y coste de acelerar.
- **Todo consultable aunque no se muestre**: búsqueda y respuesta por lenguaje natural, voz, ID, empresa, función o dependencia. Resolver mediante los mismos conectores autenticados de lectura de backend, no mediante una lista cerrada de tarjetas. Si un recurso es inaccesible, mostrar UNAVAILABLE/NOT_CONNECTED, no cero o inexistencia.

Ejemplos: «qué agentes faltan para SEO», «qué está fallando ahora», «qué tenemos que avanzar hoy», «qué hace realmente CEREBRO», «qué necesitaríamos para X», «cuánto cuesta y tarda Y», «qué lleva parado más de dos horas», «prioriza lo que genere antes ingresos sin gastar más».

### 8.2 Operaciones con control real por recurso

Acciones objetivo: consultar, planificar, priorizar, despriorizar, acelerar, ralentizar, pausar, reanudar, detener/cancelar, reintentar, reasignar, crear trabajo autorizado y supervisar. Cada opción sólo es visible/ejecutable cuando el proveedor implementa y certifica su semántica. Si no existe adaptador seguro: CAPABILITY_NOT_CONNECTED, con explicación y siguiente integración.

- **Priorizar** reordena colas conforme a dependencias, SLA, urgencia, ingresos, seguridad y coste; nunca equivale a «pasarse por delante» de locks o gates.
- **Acelerar** puede adelantar trabajos, utilizar concurrencia ociosa, paralelizar etapas compatibles o usar un runtime/modelo aprobado; siempre proyecta ETA anterior/nueva, impacto económico, capacidad libre, calidad y riesgo. No saltar tests, tribunal, controles legales ni activar pago sin MONEY_LIMIT.
- **Pausar** distingue detener admisión, suspender scheduler, suspender consumo, congelar trabajos nuevos o finalizar trabajos en vuelo. La pausa de un Worker no siempre pausa sus Queue consumers ni implica detener eventos externos. Explicar el alcance, asegurar consistencia y retención.
- **Reanudar** recupera exactamente versiones, binds y configuración respaldadas; nunca reactiva staging suspendida, autopublicación o PROD por inferencia.
- **Cancelar, reintentar y reasignar**: idempotencia transaccional, control de efectos, compensación, destinatario y recibo, según contrato particular del proveedor.
- **Voz, chat y paneles** comparten el mismo gateway, identidad server-side y políticas. Una frase no otorga permisos nuevos. Las operaciones ordinarias preautorizadas no deben requerir autorizaciones reiterativas, salvo confirmación exacta necesaria o HUMAN_REQUIRED canónico.

Pipeline obligatorio: DISCOVER → PLAN → ESTIMAR IMPACTO/TIEMPO/COSTE/RIESGO → POLICY → CONFIRMAR CUANDO PROCEDA → EXECUTE → RECEIPT → READBACK FÍSICO → OBSERVABILITY → ROLLBACK.

### 8.3 Modelo de datos y medidas

Identidad mínima vinculable: company_id, engine_id, environment, version, department_id, role_id, agent_id, subagent_id, provider, provider_resource_id, capability_id, job_id, run_id, owner, dependencies, desired_state, observed_state, health, blocker_code, last_heartbeat, last_success, last_error, source, observed_at, ttl_seconds, queue_position, priority, elapsed_seconds, eta_low_seconds, eta_high_seconds, eta_basis, confidence, cost_actual_eur, cost_estimate_low_eur, cost_estimate_high_eur, cost_incremental_eur, quota_remaining, permissions, allowed_actions, receipt_id, backup_ref, rollback_ref, next_block.

No observado = null + causa + fuente. Separar DEFINIDO, OBSERVADO, EJECUCIÓN_VERIFICADA, ESTIMADO, PROPUESTO, CACHED, STALE, DENIED y UNAVAILABLE.

Medición: derivar ETA de tiempos reales históricos por tarea/etapa, percentiles cuando haya muestras suficientes, cola, capacidad y dependencias. Si falta evidencia: SIN_BASE_SUFICIENTE / NO_MEDIDO, sin cifras ni promesas inventadas. En coste separar suscripción incremental (puede ser 0 €), consumo marginal y factura real no auditada; medir hard-stop para impedir gastos no aprobados.

### 8.4 Criterios obligatorios de aceptación

1. Consulta libre de motor/agente NO VISIBLE en el panel, resuelta por fuente autenticada y validación de empresa; sin accesos cruzados.
2. «Agentes que faltan» explica gap por contrato/capacidad necesaria, distingue inexistencia de falta de observabilidad.
3. «Agentes fallando» devuelve error, último éxito, responsable y dependencia; no confunde PAUSED, BLOCKED, UNAVAILABLE y ERROR.
4. «Qué puede hacer CEREBRO» separa demostración física de definiciones, roles y propuestas.
5. «Qué hay que avanzar» ofrece dependencias, prioridades justificadas, siguiente acción, riesgo y efecto económico.
6. Cada duración/coste muestra fuente, medición/estimación/ausencia, banda de incertidumbre y variación al acelerar.
7. Al menos un ejecutor LAB aislado prueba PRIORITIZE, ACCELERATE cuando sea viable, PAUSE, RESUME y readback, o bloqueo explícito por capacidad; recibos durables, no duplicados y rollback físico.
8. Equivalencia de consultas/acciones por chat, voz y panel; historial auditable, responsive, seguridad server-side.
9. Tests negativos: desconexión/frescura, cross-company, conflicto de versión, carrera concurrente, cuota agotada, gasto prohibido, credencial caducada y rollback.
10. «100 % DE LA CONSOLA» exige funcionamiento y E2E completo para los proveedores declarados conectados. No significa que los 179 motores, 529 roles o todos los proveedores externos estén operativos. Otros se muestran con su estado y camino pendiente sin ocultarlos.

### 8.5 Estado en esta revisión

**HECHO DOCUMENTAL**: requisitos capturados y versionados; sin código de ejecutor nuevo, despliegues, suscripciones, tokens, políticas relajadas ni modificaciones de Social, Cloudflare, Supabase, App, CRM, SEO, staging o PROD. **PARCIAL OPERATIVO**: lecturas y controles LAB ya documentados en la PR. **SIGUIENTE BLOQUE TÉCNICO**: discovery/health/gaps desde fuentes privadas autorizadas → medición de ETA/FinOps → planificación/priorización/aceleración LAB → adaptadores de control con readback/rollback → E2E/tribunal.


## 9. Evidencia de implementación LAB · diagnóstico conversacional seguro

Fecha: 15/11/2026. Commit funcional ensayado: 14411506b5345a9b54a9b1be0b9f8a35d292e62b (PR #66 DRAFT).

### HECHO · Código LAB, sin I/O nuevo
- src/cerebroOperativaDiagnostics.ts: respuestas de carencias, fallos, capacidades, próximos pasos, duración/ETA y coste medido/desconocido desde el lector owner actual; sin fabricar números ni agentes activos.
- src/CerebroOperativeCockpitV3Bridge.tsx: preguntas del chat principal consultan el mismo lector propietario autenticado, incluso sobre elementos fuera de panel, sin ejecutar órdenes.
- src/cerebroFleetObserveApi.ts: ACCELERATE, SLOW_DOWN, CANCEL, RETRY y REASSIGN no se confunden con PRIORITIZE; acciones no acreditadas no ejecutan. Las preguntas de orientación siguen siendo lectura.
- cerebro/universal/v0/operator-diagnostics.test.mjs y tests/cerebro-operativa-owner-quickreads-lab.spec.ts: pruebas de clasificación, información desconocida, frescura, guardas y E2E de conversación en navegador sintético.

### Evidencia de aceptación del commit funcional
- GitHub Actions CEREBRO Universal Gateway V0 LAB contract CI: run 43753380853 SUCCESS (unit tests, TypeScript/build, navegador sintético, denegación anónima y PROD).
- GitHub Actions CEREBRO Governed Main Integration V0: run 43753380788 SUCCESS.
- GitHub Actions CEREBRO Enterprise Acceleration V0: run 43753380783 SUCCESS.
- Las pruebas sintéticas interceptan solicitudes externas. NO acreditan nueva versión desplegada ni E2E físico con el propietario.

### Estado y recuperación
- Estado: IMPLEMENTADO EN RAMA LAB + CI GREEN; PREVIEW FÍSICO PENDIENTE; PROD BLOQUEADO.
- Backup / rollback: conservar última versión de Preview existente; reversión del commit aislado de diagnóstico si hace falta, no hay migración SQL nueva ni estado real que borrar.
- No se han desplegado motores, cambiado flags, generado cron, contratado servicios ni alterado App/CRM, Social PR #8/#9, Cloudflare, staging suspendida, producción o main.
- Coste marginal de minutos de GitHub CI no medido en euros; no declarar un coste total verificado de cero.

### next_block
1. Desplegar exclusivamente Preview aislado del SHA aceptado, sólo mediante ruta autorizada con coste adicional comprobado.
2. Probar las cinco familias de consultas con sesión propietaria real, negativas, OLD vs NEW, observabilidad y rollback físico del Preview.
3. Conectar fuentes privadas y latidos agent_id/subagent_id/job_id/run_id; medir ETA/FinOps con recibos; control provider específico con readback, permisos y tribunal.
4. No promover producción ni reactivar staging sin gates de seguridad y orden expresa.


## 10. ACTUALIZACIÓN DE CONTINUIDAD · CIERRE 15/11/2026

**IMPORTANTE:** Las fotografías de estado de las secciones previas (especialmente 8.5 y 9) describen hitos ANTERIORES. El registro de continuación actual, pruebas, rollout, bloqueos y tareas pendientes por orden de prioridad está íntegro en:
- [TRASPASO MAESTRO A CHAT NORMAL](./CEREBRO_OPERATIVA_TRASPASO_CHAT_NORMAL_2026-11-15.md)
- [PROMPT DE CONTINUACIÓN SIN WORK](./PROMPT_CONTINUAR_OPERATIVA_CHAT_NORMAL_2026-11-15.md)

Último SHA FUNCIONAL comprobado: 986eed50a47dcf519d52dfbb0dfc2c12a3c2fee2, PR #66 DRAFT (sin merge), GitHub 3/3 SUCCESS (43768086907 / 43768086914 / 43768086899). Vercel Preview protegido READY dpl_GUsDv7y88Vnf3ugBfurbmQM1DU8x. Lector Supabase LAB de dispositivos ACTIVE v1 y lector Supabase LAB de trabajos JARVIS/navegador/productora ACTIVE v1. Lectura REAL de ambos paneles observada en Opera; chat LIVE probado sintéticamente, no envío manual desde Opera.

**Distinción obligatoria:** los datos PREPROD son etiquetas históricas dentro de BD LAB; no existe autorización para reactivar App PREPROD. Estado almacenado ONLINE y jobs históricos NO prueban agentes activos. El gasto incremental 0,0000 EUR en 60 muestras no acredita coste total 0. Edge verify_jwt=false es excepción técnica con owner verificado server-side; faltan pruebas negativas y rollback físicos. Cloudflare Vercel sin token de lectura; NO recrear tokens bloqueados. Operativa aún NO habilita control empresarial autónomo. Ver nuevas prioridades P0/P1/P2 en handoff.

Seguir conservando main, PROD, App/CRM, DNS, Social, staging suspendida y Trading aislado; no promover esta PR ni desplegar en PROD sin gates completos y autorización independiente.
