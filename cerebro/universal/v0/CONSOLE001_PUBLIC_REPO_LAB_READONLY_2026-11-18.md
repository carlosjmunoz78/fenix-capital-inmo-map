# CEREBRO OS · CONSOLE-001 · Recuperación paralela de lectura pública de GitHub
**Fecha:** 18/11/2026 · **Entorno:** Fénix LAB · **Versión:** 1.0.0 · **Código original protegido**.

## Función y límite
Recuperar una parte real de la capacidad existente `repo.sandbox.public.readonly.v0` de CONSOLE-001 durante el bloqueo de GitHub Actions. Los dos trabajos históricos de esa capacidad se completaron en PREPROD el 2/11/2026 con objetivo `https://github.com/carlosjmunoz78/fenix-capital-inmo-map`. El repositorio actual está confirmado como **público**, lo que permite una lectura GET sin credenciales.

**Importante:** esta implementación es un ejecutor SQL paralelo que consulta el commit HEAD de `main` mediante la API pública de GitHub. No clona, inspecciona todo el árbol, edita, despliega, ejecuta código arbitrario, altera el Git o lleva adelante los jobs antiguos. **Es una subcapacidad real de lectura**, NO la totalidad del trabajo histórico ni todo CONSOLE-001.

## Arquitectura y registro
- Proyecto Supabase LAB ya existente `hnqlnvakzaywtafeiybt`, extensiones instaladas `pg_net`, `pgcrypto`, `pg_cron`.
- Migración aditiva `supabase/migrations/20261118222000_cerebro_console_public_repo_lab_v1.sql`: tablas privadas `cerebro_lab.console_repo_signer_v1` y `console_repo_readonly_v1`, clave aleatoria de 32 bytes, RLS, privilegios cerrados y HMAC-SHA256 `CEREBRO_CONSOLE_PUBLIC_REPO_V1`.
- `cerebro_lab.enqueue_console_repo_readonly_v1()`: solo solicita la URL literal fija `https://api.github.com/repos/carlosjmunoz78/fenix-capital-inmo-map/commits/main`; cabeceras `user-agent` y `accept`, SIN token. Genera `job_id` UUID propio, separado de cualquier legacy queue.
- `cerebro_lab.collect_console_repo_readonly_v1()`: obtiene respuesta de `net._http_response`, comprueba HTTP 200 + SHA hexadecimal de 40 caracteres, genera evidencia criptográfica y sella estado `SUCCEEDED` o `FAILED`, nunca un falso éxito sin respuesta.
- `public.cerebro_lab_console_repo_observe_v1()`: sólo `service_role`, verifica HMAC y devuelve estado, `job_id`, hash público, id de petición, tiempo y total; no expone la clave.
- Edge aislada `cerebro-console-readonly-lab-v1` v1: GET owner-only mediante `CARLOS-ADMIN` del Gateway original, lectura RPC validada y ningún POST.
- Vercel `api/cerebro-executor-coverage.ts` y frontend `CerebroRoleAgentRosterReadonly.tsx`: muestra resultado firmado pero mantiene `agent_role_identity_verified=false`, `legacy_worker_executed=false`, `full_engine_certified=false`.

## Evidencia física comprobada
- GET `pg_net` previo al nuevo runtime, API pública respondió HTTP 200, commit SHA `902022f5d4dcc4aab29e6d35411a63c38fe438e7`.
- Trabajo real creado: `997567e9-77d1-49e0-832c-e4695c25e18d`.
- `enqueue` → QUEUED; `net._http_response` recibió respuesta; `collect` → 1 de 1 SUCCEEDED.
- `select public.cerebro_lab_console_repo_observe_v1()` → `status=OK`, `signed=true`, `specific_capability_evidenced=true`, mismo `job_id`, `observed_commit_sha` y `legacy_worker_executed=false`.
- Programaciones nuevas: #82 `cerebro-console-readonly-enqueue-lab-v1` cada hora en minutos 17 y 47; #83 `cerebro-console-readonly-collect-lab-v1` en minutos 19 y 49.
- El cron #82 ejecutó autónomamente con resultado `succeeded` a 21:17 UTC. El colector #83 y segundo recibo pendiente de acreditación cuando se redactó esta sección.
- Preview Vercel compilado READY `dpl_6oD1Qomf92fjv6bqfZgQmM3XwqG1`, alias solo LAB `https://fenix-capital-preprod-operativa.vercel.app`; la vista de propietario en Opera muestra el trabajo real y su firma, sin atribuir agente personal.
- Ruta Vercel sin sesión y Edge nueva sin sesión rechazadas, sin ampliar permisos de App/CRM/PROD.

## Protección, límites y costes
- Las URLs, repositorio, rama, motor, entorno y capacidad están fijados con CHECK y literales: ninguna URL arbitraria / SSRF ni Github write access.
- `agent_role_id` = NULL: **no se inventa identidad de agente**. Trabajo de capacidad lógica `CONSOLE-001`, no una persona autónoma.
- Ni OIDC de los dispatchers antiguos ni sus credenciales fueron modificados o sorteados: el nuevo runtime es un ejecutor aislado que usa exclusivamente metadatos públicos.
- Ninguna suscripción, token de GitHub, modelo de IA de pago, cambio de App/CRM, DNS, WordPress, Cloudflare Worker, Trading o PROD.
- Coste adicional de suscripciones 0 €, consumo marginal de red/CPU **no medido**. Dos llamadas GET a GitHub por hora.
- Calidad del trabajo evaluada solo por HTTP y firma; falta tribunal completo por motor, coste, backup independiente, rollback integral, comparación OLD-vs-NEW y promoción gradual. **PROD PROMOTION = HOLD**.

## Observabilidad, rollback y rebuild
```sql
select public.cerebro_lab_console_repo_observe_v1() as proof;
select jobid,jobname,schedule,active from cron.job where jobid in (82,83);
select state,count(*) from cerebro_lab.console_repo_readonly_v1 group by state;
-- Pausa/rollback solo de la nueva capacidad:
select cron.unschedule('cerebro-console-readonly-enqueue-lab-v1');
select cron.unschedule('cerebro-console-readonly-collect-lab-v1');
-- Reinstalación controlada, NO ejecutarla si ya existe el job:
select cron.schedule('cerebro-console-readonly-enqueue-lab-v1','17,47 * * * *','select cerebro_lab.enqueue_console_repo_readonly_v1();');
select cron.schedule('cerebro-console-readonly-collect-lab-v1','19,49 * * * *','select cerebro_lab.collect_console_repo_readonly_v1();');
```
Antes de eliminar tabla o reconstruir, exportar los recibos y respaldar el secreto cifrado. Los procedimientos de desprogramación no se ejecutaron sobre estos jobs y deben quedar como gate pendiente, aunque la reversibilidad de trabajos pg_cron ya se probó en el JOB temporal #76.

## Siguientes puertas de certificación
1. Demostrar segundo `SUCCEEDED` automático por #83, recibo verificado y que se muestra en la consola.
2. Añadir al ejecutor paralelo de CONSOLE únicamente capacidades deterministas y públicas con contratos individuales, no ejecutar comandos arbitrarios o tareas de navegador sin OIDC/puente autorizado.
3. Fact Factory y UMS siguen necesitando ejecutores físicos, permisos, QA, tribunal y separación de recursos antes de promoción. UMS HOLD no tocar.
