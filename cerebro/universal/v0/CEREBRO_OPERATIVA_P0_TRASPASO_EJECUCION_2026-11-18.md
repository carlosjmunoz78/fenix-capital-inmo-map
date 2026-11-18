# CEREBRO OS · OPERATIVA P0 · TRASPASO CANÓNICO / CHAT NORMAL · 2026-11-18

> **META DEL PROPIETARIO:** terminar la integración REAL de OPERATIVA con runtimes de CEREBRO, compartida con JARVIS/NEURONAL/NAVEGADOR y futuras interfaces, con objetivo operativo de **60 minutos**, sin investigación circular, sin nuevas cuotas y sin dañar PROD. El plazo es un objetivo, **no una garantía**. Requiere capacidades reales en el chat de ejecución y gates completos.

## 0. Punto de entrada para otro chat
- Lee **ESTE DOCUMENTO COMPLETO** a través del conector GitHub. No pretendas haber leído los demás sin abrirlos.
- Repositorio: `carlosjmunoz78/fenix-capital-inmo-map`.
- Rama de referencia de este traspaso: `cerebro/operativa-runtime-p0-handoff-20261118` (contiene este documento; NO es rama de despliegue).
- Versión publicada OPERATIVA: SHA **`7163dccd962a19fbd5301b14fcacacf08b7245ea`**, Vercel deployment **`dpl_CQuh9UYH68JYHkTcaGcvXEq7fz5h`**, URL `https://app.fenixcapital.es/cerebro?section=operativa&visual_lab=cockpit-v3&op3_panel=agentes`. Publicación realizada y verificada con usuario propietario; PR #75 sigue DRAFT sin merge.
- Baseline anterior recuperable: SHA **`a51dd14eac11f02424dce5db426346b041c1824f`**, deployment **`dpl_6n6KMNTWNEqpUUDBwn3V4UccXjPJ`**. Proyecto Vercel `prj_4ElVl8e2KzrHS7r5yvBGBban1DXV` (nombre histórico `fenix-capital-preprod` **pero es la App LIVE**). Team slug `carlosjmunozcabeza-2582s-projects`. No alterar DNS ni App/CRM.
- Evidencia de promoción: Actions `44249940872`, comentario del PR #75 `https://github.com/carlosjmunoz78/fenix-capital-inmo-map/pull/75#issuecomment-6970820768`.
- QA de recuperación: PR #76 DRAFT, 7/7 source-gates PASS. Portabilidad Cloudflare: PR #77 DRAFT, tests de seguridad sintética/local PASS, **sin deploy Cloudflare**. No fusionarlos a la ligera.

## 1. Fallo REAL priorizado: pantalla desconectada de realidad
La API existente `api/cerebro-agent-directory.ts` asigna `runtime_verified:false` a **todos** los perfiles lógicos. Respuesta global fija `active_agents_verified:false`, `subagent_instances_verified:false`, `total_runtime_instances:null`. **No consulta estados de ejecución de motores ni workers por perfil**.

El cliente `src/cerebroAgentDirectoryApi.ts` exige `runtime_verified===false` al validar registros. La pantalla `src/CerebroRoleAgentRosterReadonly.tsx` renderiza 2.506 fichas y referencias a motores documentados, **no un inventario de 2.506 ejecutores activos**. Es imprescindible cambiar juntos API + contrato cliente + UI, con representación `DEFINIDO | PREPARADO | ACTIVO | INACTIVO | DEGRADADO | POR_VERIFICAR`, `last_seen`, `last_run`, `evidence/source`, `confidence`, `environment`, `company_id`, `engine_id`, `version`. No inferir actividad de una simple relación nominal.

## 2. Fuentes físicas verificadas hoy, no inventar equivalencias
- **Supabase PROD**, project ref `cluhljgonannaafpmblx`: `list_edge_functions` devolvió **117 funciones** en estado **ACTIVE** (= desplegadas/activas como servicio, NO 117 agentes ocupados). Ejemplos `fenix-app-gateway`, `cerebro-console-activity-v0`, `social-lead-ingest`, `jarvis-git-gateway-v1`, funciones FACT LAB.
- **Cloudflare** account `e39a57e1ac42650ca5a6d5307cf0ac8e`: consulta autenticada GET `/accounts/{account_id}/workers/scripts` devolvió **45 Workers desplegados** (muchos etiquetados `-lab` con actividad deliberadamente deshabilitada; no tratarlos automáticamente como activos).
- **Actividad real Supabase**: logs de últimas 24 h muestran 1.355 respuestas HTTP 200 en `fenix-app-gateway/session/context`, 659 HTTP 200 y **844 HTTP 503** en `cerebro-console-activity-v0/`. Puede haber multiplicidad por peticiones/reintentos, no son jobs distintos.
- `cerebro-console-activity-v0` versión 7, `status=ACTIVE`. Su código revisado en Supabase tiene `SNAPSHOT_MAX_AGE_MS=20*60_000`, `GITHUB_TOKEN_CONFIGURED` leído del entorno; si falta token, usa snapshot GitHub con fecha/caducidad. Si snapshot stale y no hay feed vigente, puede devolver HTTP 503.
- Fuente GitHub `carlosjmunoz78/fenix-capital-inmo-map`, rama `cerebro-activity-feed-v1`, archivo `activity.json`, último `generated_at` inspeccionado **2026-11-18T06:54:29.227Z**. A las ~09:10 Europe/Madrid ya había superado el TTL de 20 minutos. **Causa raíz de todos los 503 aún no certificada**; contrastar timestamps, `GITHUB_TOKEN_CONFIGURED` (solo booleano, NUNCA valor) y frescura/errores reales.
- Se observaron ejecuciones de GitHub Actions reales; no equivalen por sí solas a cada rol del catálogo.

## 3. Arquitectura OBLIGATORIA (reutilizable por todas las interfaces)
**Interfaz = cliente, no backend propio.** Conectar OPERATIVA + JARVIS + NEURONAL + NAVEGADOR + móviles/voz al **mismo Gateway/servicio de estado de motores**. Reutilizar los gateways y registros EXISTENTES antes de crear nuevos; consultar código y dependencias actuales antes de cambiar nada.
Contrato recomendado, ajustable a la evidencia real:
- `GET /cerebro/capabilities`, `GET /cerebro/engines/status`, `GET /cerebro/jobs` o rutas equivalentes existentes, **sin duplicar APIs**. No imponer rutas nuevas si ya hay un contrato funcional.
- La autoridad de estado está en el backend; cada interfaz consulta mismo `company_id`, `engine_id`, `environment`, `version`, `source`, `observed_at`, `status`, `job_id`, `last_run_result`, `error_code` y `evidence_url`.
- Registros de roles 2.506 y ejecutores (Workers, Edge Functions, GitHub jobs, workflows, automations, runtime) son conjuntos distintos. Asignar vínculos solo con identificadores/códigos/contratos deterministas. Ausencia de vínculo = DEFINIDO/POR_VERIFICAR, nunca INACTIVO inventado.
- Un endpoint de lectura unificado con auth real propietario y aislamiento multiempresa; sin secretos en frontend, sin secretos en logs/chat; ACL y política por acción.
- Acciones de control futuras (pausar/reintentar/priorizar) sólo después de autorización, idempotencia, política, auditoría, rollback y human exception para LEGAL_REQUIRED, SIGNATURE_REQUIRED, LOW_CONFIDENCE, HIGH_RISK, POLICY_CONFLICT, SECURITY_INCIDENT, MONEY_LIMIT, CUSTOMER_HUMAN_REQUEST.
- Prohibido fabricar 2.506 Workers, servicios separados, suscripciones, una segunda verdad o duplicar bridges por interfaz. Supabase core transaccional, telemetría pesada fuera si procede.

## 4. Ejecución P0 en 60 minutos (presupuesto orientativo, no excusa para bloquear)
**Min 0–10:** lectura focalizada del archivo GitHub, 3 archivos API/cliente/UI, del gateway de actividad Supabase y de catálogo de Workers. Verificar punto de enlace real; NO auditoría general ni rediseño. Almacenar evidencia mínima OLD.
**Min 10–25:** reparar origen del feed de actividad (actualización snapshot o fallback GitHub ya conectado) con causa raíz, sin borrar la vía existente ni exponer token. Tests de freshness/503 y HTTP lectura. Si token/permiso bloqueado, marcar HUMAN_REQUIRED y continuar resto.
**Min 25–40:** introducir **adaptador compartido central** de solo lectura para estado de ejecutores, deduplicado, con TTL y timestamp; vincular determinísticamente IDs reales a perfiles conocidos, estados/certidumbre por evidencia. Compatibilidad hacia atrás del contrato actual.
**Min 40–50:** conectar UI OPERATIVA y consumidores existentes vía mismo endpoint; no reescribir JARVIS/NEURONAL/NAVEGADOR si basta con reutilizar Gateway. Verificar lectura cross-interface en al menos dos consumidores si están accesibles; tests de tenant, owner, read-only y fail-closed.
**Min 50–60:** QA CI, pruebas OLD vs NEW, snapshot, endpoint privado, promoción SOLO de cambios verificados con rollback disponible. Smoke PROD: login owner, lectura real, anónimo denegado, dato real con `source/observed_at`, App/CRM intactos. Registrar informe y SHAs.

**Regla de tiempo:** al llegar a 60 minutos, si gates críticos no están verdes, entregar lo terminado y el bloqueo exacto, **no falsear éxito** ni promover código inseguro. No garantizar una hora sin comprobar dependencias y permisos.

## 5. Gates antes de PROD y alcance
- No romper: inventario delta, mapa dependencias, rollback de artefacto, backup/snapshot, OLD vs NEW, tests, observabilidad, coste sin nuevas cuotas, control acceso owner, PREPROD o stage aislado (la antigua App PREPROD fue cancelada; usar deployment privado sin alias).
- No cambiar schema de PROD por comodidad. No tocar CRM, Supabase Auth, WordPress, DNS, Trading, cloudflare otros LAB; sin nuevas cuotas.
- Conservar `app.fenixcapital.es` en el deployment publicado salvo promoción exacta con pruebas concluyentes.
- Si algo es ejecutable hoy, hacer; si falla, dos intentos como máximo y pasar a otra vía o bloquear con razón exacta. Prohibidas horas de ramas para informes sin conexión real.

## 6. Documentación accesible entre chats: Single Source of Truth
La documentación **persistente** está en GitHub, **no en la memoria del chat**. Cada cambio debe actualizar:
- **este traspaso** o un nuevo registro de cierre enlazado desde aquí;
- PR específico de integración con commits SHA y workflow runs;
- Engine Registry + mapa `agent_role_id -> engine_id -> provider_runtime_id` + estado verificado, con fuente/fecha por vínculo;
- contrato API compartido + versión + compatibilidad;
- dependencia App/CRM + snapshot/rollback + observabilidad + costes + incidentes.

Recursos de arranque:
- PR #75 (operativa producción): https://github.com/carlosjmunoz78/fenix-capital-inmo-map/pull/75
- PR #76 (QA recovery): https://github.com/carlosjmunoz78/fenix-capital-inmo-map/pull/76
- PR #77 (portabilidad Cloudflare no desplegada): https://github.com/carlosjmunoz78/fenix-capital-inmo-map/pull/77
- GitHub Actions promoción (run): https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/44249940872
- Runtime catalog: `api/cerebro-agent-directory.ts`
- Client: `src/cerebroAgentDirectoryApi.ts`
- UI: `src/CerebroRoleAgentRosterReadonly.tsx`
- Activity Function: `cerebro-console-activity-v0` en Supabase `cluhljgonannaafpmblx`
- Activity snapshot: rama `cerebro-activity-feed-v1`, `activity.json`
- Publicación: `https://app.fenixcapital.es/cerebro?section=operativa&visual_lab=cockpit-v3&op3_panel=agentes`

## 7. Formato obligatorio del informe de ejecución
**HECHO:** fuente + ruta + commit/deployment + prueba; **PARCIAL:** parte ejecutada, riesgo; **BLOQUEADO:** causa concreta, herramienta, gate, humano requerido; **POR AUDITAR:** no afirmar.
Mostrar: `PROFILE_COUNT`, `RUNTIME_DISCOVERED_BY_PROVIDER`, `LINKED_VERIFIED_COUNT`, `ACTIVE_CONFIRMED`, `DEGRADED_CONFIRMED`, `UNLINKED`, `FEED_FRESHNESS`, `SHARED_GATEWAY`, `PROD_DEPLOYMENT`, `ROLLBACK_READY`, `ADDITIONAL_SPEND`.
**El criterio de éxito es prueba física de lectura compartida desde dos interfaces y evidencia por agente, NO tener más PRs.**


## 8. Actualización verificada 18/11/2026 · Operativa P0 continuación
**Documentación canónica de continuidad:** [OPERATIVA_P0_CIERRE_PARCIAL_20261118.md](OPERATIVA_P0_CIERRE_PARCIAL_20261118.md).
**Inventario de ejecutores observado:** [operativa-runtime-evidence-20261118.v1.json](../../registry/operativa-runtime-evidence-20261118.v1.json).
PR #78 DRAFT `cerebro/operativa-runtime-p0-fix-20261118` (HEAD último verificado `184e5ad6bdcb7291660ea96847f95cbf0f96e7ee`). Vercel preview READY `dpl_HosSkpwg9czo4jQ5QEB6suSmNB5Q` sin alias a PROD. Supabase Activity v7 PROD intacta; fallback solo candidato. Consultar estado CI general y smoke owner antes de promoción. No afirmar cierre.


### Estado actualizado del incidente de actividad (18/11/2026)
Supabase Activity `cerebro-console-activity-v0` promovida solo de v7 a **v8** con fallback público GitHub cuando el snapshot de 20 minutos caduca. Ver reporte enlazado `OPERATIVA_P0_CIERRE_PARCIAL_20261118.md` para SHA exactos, 9 respuestas 200/1 401 y copia de recuperación. App permanece en deployment original, PR #78 sin promover; gate de auth preview owner positivo pendiente.
