# OPSCTRL-002 · CEREBRO OPERATIVA · Mandos reales de tres motores (LAB)

**Fecha:** 19/11/2026 · **Empresa:** `fenix` · **Entorno:** LAB · **Estado:** ejecución y estado de los mandos probados; PROD no promovida.

## Inventario y contratos preservados

- OPSCTRL-001 ya existente: controles `QA-001` cron #74 y `CERT-001` cron #77, `RUN_ONCE` / `PAUSE_SCHEDULE` / `RESUME_SCHEDULE`. Función original, recibos, firmas y auditoría sin modificar.
- CONSOLE-001 ya existente: `cerebro_lab.enqueue_console_repo_readonly_v1()` cron #82 (`17,47 * * * *`) y `cerebro_lab.collect_console_repo_readonly_v1()` cron #83 (`19,49 * * * *`). Capacidad estricta `repo.sandbox.public.readonly.v0`: GET fijo a commit público de `carlosjmunoz78/fenix-capital-inmo-map` rama `main`, sin ejecutar código, guardar clientes, publicar o alterar repositorios. Ambos cron activos.
- PROPÓSITO: permitir una orden real manual para CONSOLE sin hacerla pasar por ejecución general de agentes ni crear segundo runner.
- Otras identidades `FACT-001`, `UMS-001`, sociales, Trading y PROD: siguen sin permisos de mando desde la interfaz.

## Implementación conservadora y aditiva

- SQL migration `20261119114000_opsctrl002_console_readonly_runonce_lab.sql`: tabla nueva con RLS `cerebro_lab.operativa_console_command_v1`, `request_id uuid` idempotente, `engine_id=CONSOLE-001`, `company_id=fenix`, `environment=LAB`, `prod_execution_enabled=false`, `paid_execution=false`.
- `public.cerebro_lab_console_run_once_v1(uuid)` exige contratos literales exactos de ambos cron y ambos `active=true`. Solo llama a la función preexistente de lectura pública mediante `pg_net`; guarda `job_id`, retorna `QUEUED`, **no SUCCEEDED**. UUID repetido: `ALREADY_QUEUED`, no se encola otra vez. Límite de 60 segundos para peticiones nuevas.
- `public.cerebro_lab_console_control_state_v1()`: GET servidor de órdenes y estado correlacionado con la cola histórica real. El campo `signed_receipt_present` significa firma almacenada, **no verificación criptográfica individual**, marcada expresamente `signed_receipt_cryptographically_verified=false`.
- RPC SQL públicas denegadas para `anon`, `authenticated`; únicamente `service_role`. Las tablas privadas carecen de permisos de usuario normales.
- Supabase Edge LAB `cerebro-operativa-controls-lab-v1` v3 ACTIVE: valida el mismo JWT del propietario mediante GET del Gateway PROD, admite `CONSOLE-001` solo con `RUN_ONCE`, conserva todos los controles QA/CERT y deniega cualquier otro motor o acción.
- API Vercel `/api/cerebro-operativa-controls?company_id=fenix`: host Preview allowlist, propietario real, petición exactamente definida y respuesta `QUEUED/ALREADY_QUEUED` validada. No acepta URL o comando arbitrario.
- Cliente `cerebroOperativaControlsApi.ts` y panel `CerebroOperativaControlsLab.tsx`: tercer bloque `Solicitar lectura` sin Pause/Resume, indica recepción EN COLA; consulta el resultado y nunca deduce éxito antes del colector. Chat y voz permanecen HECHO · A MEJORAR.

## Ejecución física verificada

- `RUN_ONCE` SQL con UUID `20261119-1200-4000-8000-000000000010`: respondió `status=QUEUED`, `audit_persisted=true`, `engine_id=CONSOLE-001`, `job_id=db805d9f-40bc-453a-88f4-81a4cb1d9e46`. Segunda llamada con UUID idéntico devolvió `ALREADY_QUEUED`, mismo `job_id`, sin nuevo trabajo.
- Colector existente ejecutó la respuesta a las **10:19:02 UTC**: `state=SUCCEEDED`, `http_status=200`, `signed_receipt_present=true`. El campo `signed_receipt_cryptographically_verified=false` queda pendiente de verificación con HMAC de ese recibo individual. Esto es capacidad de lectura pública real, no autonomía universal de CONSOLE.
- `QA-001` y `CERT-001` permanecieron activos, así como cron #82/#83.
- Vercel Preview `dpl_6yrk2YgqxQC5f84EQ6yewJDoJHvn` READY, SHA `7d7077f60d10511585b064737a23344896b89ca0`, alias `fenix-capital-preprod-operativa.vercel.app`; Opera autenticado `op3_panel=motores` mostró botones activos QA/CERT y `Solicitar lectura` CONSOLE e historial de trabajo SUCCEEDED.
- Una mejora visual posterior cambió el icono del resultado EN COLA para no reutilizar un Check de QA previo. Requiere deployment posterior.

## GATES y rollback

- Controles disponibles: QA y CERT (ejecutar/pausar/reanudar), CONSOLE (solicitar lectura pública). No se puede controlar cualquier motor de la empresa; se muestran los no acreditados como bloqueados.
- Cualquier fallo de identidad del propietario o pérdida de cron #82/#83 => fail closed, sin nuevo trabajo.
- **Rollback SQL sin borrar información:** `revoke execute on function public.cerebro_lab_console_run_once_v1(uuid) from service_role;`; mantener el audit, los cron preexistentes y los recibos. Rollback de vista: reasignar alias LAB a `dpl_GHPs8reRymCnkBw2C9afuN5Brwmh` (versión de QA/CERT).
- PROD `app.fenixcapital.es`: este conector Vercel tiene acceso solo a proyectos LAB y devuelve 403 al buscar el proyecto/dominio PROD. Se conserva App/CRM sin cambios. No se promueve la PR #81 DRAFT, no cambia DNS.
- Falta positiva POST desde navegador (conector Opera permite navegación/lectura, no pulsaciones), tests E2E de interacción en proyecto PROD, backup y rollback físicos PROD, costes marginales medidos.
- **Coste de suscripción adicional: 0 €; uso marginal de servicios existentes sin cuantificar.**

**Estado final de esta fase:** tres motores con mandos acotados y ejecución real en LAB; ningún motor comercial activado; autonomía y promoción PROD en HOLD hasta completar sus gates.
