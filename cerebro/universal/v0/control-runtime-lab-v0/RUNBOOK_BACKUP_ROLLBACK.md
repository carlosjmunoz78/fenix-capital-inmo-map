# CEREBRO Operativa · RUNBOOK / BACKUP / ROLLBACK · LAB-DEMO-001
**Fecha:** 15 noviembre 2026. **Estado:** LAB aislado funcional para lectura real y lógica SQL; no controlador general de motores. Referencia: [manifest](manifest.json).

## Lo existente y lo nuevo
- BASELINE intacta: PR #66 DRAFT, App/CRM PROD, WordPress, SEO, FACT-001 179 registros, GitHub main, Trading, Cloudflare, staging bloqueada; ningún cron nuevo.
- Tablas PREPROD NUEVAS: `cerebro_lab_private.console_worker_control_v0` y `cerebro_lab_private.console_worker_audit_v0`.
- RPCs NUEVAS en `public` sólo ejecutables por `service_role`: `cerebro_operativa_lab_control_rpc_v0`, `cerebro_operativa_lab_observe_rpc_v0`; `anon` y `authenticated` sin EXECUTE.
- Edge NUEVA `cerebro-operativa-lab-runtime-v0` v1, `verify_jwt=false` **solo porque** el usuario usa JWT de otro proyecto y el cuerpo hace propia autenticación mediante sesión OWNER verificada en el gateway PROD. Endpoints GET /state y POST /control únicamente; no CORS concedido a orígenes externos ni SSRF.
- Vercel Preview API NUEVA `/api/cerebro-lab-worker-control`; revalida propietario en cada solicitud y llama a endpoint fijo de PREPROD con publishable key existente. Rechaza PROD, host distinto, scope, claves, versiones y acciones no permitidas.
- React/Operativa Control: estado, prioridad, revisión y work_units, confirmación exacta, idempotency_key, recibo, lectura posterior y comprobación de concordancia antes de mostrar VERIFICADO.

## Dependencias y límites
`owner session PROD → Vercel LAB Preview (SSO) → owner resolver → PREPROD Edge owner resolver → service_role (server only) → private tables + RPC atomica → estado de LAB-DEMO-001 → readback`.

- Fuente de permiso: `fenix-app-gateway/session/context`, actor `CARLOS-ADMIN`; no `user_metadata`.
- Cada acción fija `fenix/LAB-DEMO-001/LAB/0.1.0`. Sin motor real; `PAUSE`, `RESUME`, `PRIORITIZE`, `TICK` son actos reales **sobre el propio worker LAB**, no sobre SEO, Social ni jobs externos.
- `TICK` = una transición atómica de contador sin red externa ni cron. `PAUSE` impide que ese tick incremente work_units. `PRIORITIZE` cambia sólo `priority` 1..5; no aceleración del resto.
- Lecturas GitHub de otras fuentes no demuestran agent_count, subagent_count ni work in progress de cada motor.

## Estado y evidencia certificados
- Baseline: antes de migrar, los dos nombres de tabla y los dos RPC eran NULL. `apply_migration` completó con `success:true`.
- SQL: tabla control = 1 fila, estado inicial `PAUSED`, `revision=1`, `work_units=0`, `priority=3`; audit inicial = 0. `has_function_privilege` anon=false, authenticated=false, service_role=true.
- Test físico transaccional `BEGIN/SET LOCAL ROLE service_role/DO/ROLLBACK`: tick PAUSED=0, RESUME, tick RUNNING=1, PAUSE, tick PAUSED=0, PRIORITIZE a 5, replay idempotente sin segunda aplicación, revision conflict y read-back, sin persistir cambios. Tras ROLLBACK volvió a PAUSED/rev1/work0/priority3.
- Supabase Edge v1 ACTIVE (deploy tool). Opera propietaria leyó estado PAUSED rev1 con GET 200, comprobado en `function_edge_logs` a 09:43:30 UTC.
- Pendiente: **POST físico mediante interacción de propietario autenticado** (el conector Opera disponible solo permite leer/navegar). Los Playwright E2E simulan el POST contra backend interceptado; no equivalen a una acción física desde su sesión.
- GitHub check de aceptación: consultar SHA final del encabezado PR; los tests se disparan cada cambio. Nunca afirmar GREEN basándose en una corrida anterior.

## Operativa de dueño
1. Abrir el Preview protegido de Operativa, sección `Control`. Verificar la presencia de `LAB-DEMO-001`, PAUSED y hora de lectura.
2. Pulsar **Reanudar LAB**, leer propuesta exacta y **Confirmar una vez**. La consola genera idempotency_key único y envía expected_revision.
3. Verificar mensaje `CONTROL LAB VERIFICADO`, recibo y una lectura independiente con nuevo estado RUNNING. Si hay `CONFLICT`, recargar estado.
4. Pulsar **Ejecutar 1 paso LAB**, confirmar, comprobar work_units+1.
5. Pulsar **Pausar LAB**, confirmar, comprobar PAUSED. Un nuevo TICK en PAUSED debe registrar executed_work_units=0 sin incrementar work_units.
6. Cambiar prioridad LAB sólo dentro de 1..5, sin modificar política de presupuesto. No usar estos controles para motores empresariales.

## Rebuild reproducible
Migración fuente: `migration.sql`. Edge fuente: `edge.ts`. Proxy `api/cerebro-lab-worker-control.ts`. UI `src/CerebroLabWorkerControlPanel.tsx`. No subir secretos. Al reconstruir en entorno nuevo, comprobar ausencia de objetos, aplicar migración aditiva, desplegar Edge con verify_jwt=false + authenticación interna, confirmar permisos y repetir test SQL/anon/owner.

## Backup & rollback
- PREVIEW: deployment anterior `dpl_2HMbKGQDSyEdtS4dTFggpe4d8U8S` READY, reutilizable en caso de fallo de interfaz. **No probado rollback físico**; no reetiquetar como certificado.
- Backend: worker arranca PAUSED. Ante fallo, dejarlo PAUSED y retirar de la consola el acceso al proxy/función mediante nuevo deployment Preview; no tocar producción.
- Datos: conservar recibos `console_worker_audit_v0`. Eliminar tablas o RPC puede destruir auditoría; **prohibido DROP automático**. Snapshot/export y autorización humana específica antes de retirar objetos.
- Incompatibilidad: detener nuevas escrituras, mantener lectura visible si es segura, reconciliar revisión/idempotency y restaurar el último código comprobado. No reactivar staging ni cambiar cron.
- No migración a PROD hasta inventario multiempresa, permisos por recurso, evaluación/tribunal, OLD vs NEW, cargas, métricas reales de coste, rollback físico y confirmación de propietario.

## Escalado a otros motores
Fase siguiente: adaptadores específicos por provider con identidad `company_id+engine_id+environment+version`, `agent_id/subagent_id`, permiso real y acción positiva de pausa confirmada por el proveedor. Las fuentes sin credenciales operativas permanecerán `NO CONECTADO`; jamás mostrar `0` o `PAUSADO` por ausencia de dato. Mantener runtimes compartidos y no usar un servidor por motor.

## Control de cambios
2026-11-15: creó contrato y migración aditiva; Edge v1 activa; un worker PAUSED. Se hicieron pruebas SQL reales con rollback. UI y proxy preparadas, verificadas por pruebas de regresión. Sin tocar main, App/CRM, otros workers, SEO ni staging.
