# CEREBRO OPERATIVA · CERT HOLD SOURCE · 18/11/2026

## Estado probado
- Supabase LAB `hnqlnvakzaywtafeiybt`: funcion nueva `public.cerebro_lab_creative_hold_gates_v1()` en modo **SOLO LECTURA**; cuenta trabajos por estado/codigo de bloqueo y no accede a payloads de clientes.
- **FACT-001:** 17 trabajos historicos, 7 SUCCEEDED, 10 HOLD. Los HOLD tienen causas exactas: `OPENAI_PAID_WORKER_AND_SECURITY_GATE_PENDING` (9) y `BLOCKED_EXECUTOR_PAID_LANE_NOT_DEPLOYED` (1). No se ha ejecutado ninguna tarea de pago.
- **UMS-001:** 1 trabajo HOLD, causa `CREATIVE_REJECTED_BY_OWNER`. Se conserva rechazo del propietario; no se reanuda.
- **CONSOLE-001:** existe capacidad LAB `repo.sandbox.public.readonly.v0`, con 3 peticiones GitHub API GET terminadas y firmadas; `cerebro-console-readonly-enqueue-lab-v1` #82 y colector #83, periodicidad de 30 min, ambas pruebas de cron SUCCESS. Acredita solo lectura publica de repositorio, no autonom ia del navegador, ni rol agente individual. **NO duplicar** esos workers ni confundirlos con jobs historicos.
- Edge LAB `cerebro-creative-hold-gates-lab-v1` v1 con GET propietario, verificacion de Gate en PRODUCCION en lectura y DB LAB; no expone JWT ni service key, devuelve estados anonimos denegados.
- Adaptador `api/cerebro-executor-coverage.ts` y UI del directorio prueban identidad, empresa y estado. Proveedor individual `creative_hold_gates` reporta siempre `safe_to_resume=false`, `all_certified=false`, `paid_generation_enabled=false`, `owner_rejection_override=false`.
- Tests con fixtures cubren conteos, bloqueo de pago y rechazo propietario, no sustituyen prueba fisica.
- Preview Vercel READY `dpl_AWtP8UeQNaXipGhkJLkmdRuWWeyq`, alias estable LAB `fenix-capital-preprod-operativa.vercel.app` actualizado. Comprobado en Opera con sesion de propietario: muestra 17/10/7 y UMS HOLD sin reactivar.

## Permisos, rollback y coste
- RPC EXECUTE: anon=false, authenticated=false, service_role=true; no grant a usuarios normales.
- Ninguna tabla o fila histórica actualizada; rollback de la fuente aislada tras exportar evidencias: `drop function public.cerebro_lab_creative_hold_gates_v1();` y version previa del alias Vercel LAB; no tocar sistemas PROD.
- Nuevas suscripciones = 0. Coste marginal de DB/Edge = no medido.
- `FACT-001` no se considera autonoma por 7 jobs historicos, `CONSOLE-001` no se considera browser funcional por lectura GitHub, `UMS-001` permanece HOLD.
- PR #81 DRAFT, no fusion ni promocion. Avance real: ahora el supervisor identifica y bloquea causas concretas de no certificacion y muestra la capacidad real de CONSOLE.
