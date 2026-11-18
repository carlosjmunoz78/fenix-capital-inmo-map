# CEREBRO OS · Conexión universal de perfiles a todas las interfaces · V0 LAB

**OBJETIVO:** 2.506 perfiles permanecen en sus propios departamentos y jerarquías. Un ÚNICO contrato de lectura `CEREBRO_SHARED_STATE_V1` suministra al mismo tiempo los estados a JARVIS, OPERATIVA, NEURONAL, NAVEGADOR y V0, así como futuras interfaces mediante un adaptador autenticado al mismo Gateway. No hay 2.506 integraciones ni reinstalación de perfiles.

## EXISTENTE conservado
- Canonical 2.506 sourced roles en `api/cerebro-agent-directory.ts`; familias y `parent_id` originales.
- Actividad física GitHub → Supabase `cerebro-console-activity-v0` (se conserva ACTIVE sin cambio). `observeExecutors` exige coincidencia EXACTA de `entry.id` y `run.engine_id` para certificar ejecución.
- PRODUCTION actualmente desplegada por `dpl_HfPBticPdGX2fjhyqvvQrbYT8E4e`; rollback al Vercel previo `dpl_CQuh9UYH68JYHkTcaGcvXEq7fz5h`. Verificar alias antes de cambios.
- No se cambia App/CRM/Supabase Auth, Gateway original, Workers, WordPress, Trading ni producción mientras gates sean ROJOS.

## DEFINIDO e implementado en rama aislada
- `cerebro/universal/v0/cerebro-shared-state-core.mjs`: clasifica por evidencia firmemente atribuida, agrupa sin cambiar las familias: ACTIVO (ejecución presente exacta), PARCIAL (trabajo terminado con éxito sin pruebas de excelencia), FALLANDO (fracaso de ejecución exacta reciente), DEFINIDO (plantilla) y POR_VERIFICAR. El fallo de la FUENTE se marca DEGRADADO, sin fingir que todos los perfiles fallan.
- `api/cerebro-shared-state.ts`: propietario verificado vía `fenix-app-gateway/session/context`, GET/host/scope/origen/tenant estrictos; `mode=summary` para estadísticas globales, `mode=profiles` para lista paginada, conservar los IDs, familias, `parent_id`, y la lectura anterior como fallback. `company_id=fenix` único autorizado hasta onboarding verificado; contrato ya especifica company/environment/version para multiempresa posterior.
- `src/cerebroSharedState.tsx`: provider único + resumen visible en TODAS las interfaces, polling 30s + visibility + auth refresh. No se crea un feed por interfaz.
- `src/cerebroAgentDirectoryApi.ts`: consulta lista al mismo API universal y conserva fallback de directorio previo; `CerebroRoleAgentRosterReadonly.tsx` refresca automáticamente los registros visibles cada 30s sin edición humana.
- `.github/workflows/cerebro-shared-state-all-interfaces-qa.yml`: compilación, core tests, OLD vs NEW, tests de autoridad y frontend.

## CRITERIOS DE VERDE (no declarar antes)
1. 2.506 perfiles son lógicos con departamentos fuente intactos, 29 plantillas no instanciadas, 0 activos sin evidencia.
2. Propietario autentica 200; anónimo y técnica E2E 401/403, `company_id=aion` 400 y POST 405.
3. `mode=profiles` conserva página, filtros, jerarquías, motor declarado y fuente. Misma `observed_at`/estado global en JARVIS/OPERATIVA/NEURONAL/NAVEGADOR.
4. Falla feed → `DEGRADADO`, no 2.506 `FALLANDO`.
5. Dependencias, costes, backup, rollback y STAGE sin dominio comprobados. PROD solo si se certifican OLD/NEW y la salud de CRM.

## No confundir
**Conexión universal de estados ≠ 2.506 ejecutores individualmente instrumentados**. Los motores existentes que no publican `profile_id` seguirán POR_VERIFICAR; FACT-001 deberá exigir el contrato de evento `company_id,engine_id,profile_id,runtime_id,environment,version,observed_at,last_run,last_run_result,evidence` en los productores, sin modificar manualmente 2.506 fichas.
