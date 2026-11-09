# CEREBRO OS · JARVIS · Ejecución OIDC ONE SHOT · 2026-11-09

Estado: **HECHO en LAB, ejecución física real una sola vez, ejecutor cerrado fail-closed**. **NO PROMOVIDO A PROD**.

## Identificación y alcance
- Empresa: `fenix`; motor: `CONSOLE-001`; entorno de operaciones: `PREPROD` **de la cola técnica Supabase**, no una App PREPROD pública; versión del experimento: `v0`.
- Repositorio: `carlosjmunoz78/fenix-capital-inmo-map`.
- Rama exclusiva: `cerebro/jarvis-oidc-execute-once-lab-v0-20261109`, basada en `main@3600942775fbc19b47560e6f798caca107cd7473`.
- Proyecto Supabase existente en UE: `hnqlnvakzaywtafeiybt`.
- Función nueva única: `jarvis-oidc-execute-once-lab-v0` (v1 ejecutora, **v2 desactivada con HTTP 403**).
- Fichero ejecutor completo: `supabase/functions/jarvis-oidc-execute-once-lab-v0/index.ts`; fichero OFF: `supabase/functions/jarvis-oidc-execute-once-lab-v0/disabled.ts`.
- Workflow one-shot: `.github/workflows/cerebro-jarvis-oidc-execute-once-lab-v0.yml`, push exclusivo al cambiar este fichero; sin cron, sin `workflow_dispatch`, sin autorrearme, `timeout-minutes:4`, GitHub `contents:read` e `id-token:write`.
- No se cambió `main`, `gh-pages`, App, CRM, DNS, Trading, ni consumidores antiguos.

## Una tarea concreta, previamente aislada
- Nombre exclusivo: `jarvis.oidc.repohead.oneshot.lab.v0`.
- ID exacto de tarea: `006df2c9-282f-48d0-8ce8-6af8d3d6b5ae`.
- Clave idempotente: `jarvis-oidc-one-readonly-20261109-v0`.
- Número máximo de intentos: **1**; timeout asignado: **90 segundos**; estado inicial `QUEUED`, 0 intentos.
- Operación permitida: `READ_GITHUB_BRANCH_HEAD` con objetivo `cerebro/jarvis-work-codex-complete-20261102` y SHA fijado `39bc098f322c6981d0d703c5813a7234a5742e8f`.
- Estado final verificado mediante SELECT independiente: **`SUCCEEDED`**, `attempts=1`, `max_attempts=1`, `error_code=NULL`, `lease_id=NULL`.
- Evidencia de resultado: `JARVIS_OIDC_ONESHOT_GIT_READ_LAB_GREEN`, `head_sha=39bc098f322c6981d0d703c5813a7234a5742e8f`, `oidc_verified=true`, `prod_touched=false`, `git_writes=0`.
- El único acceso de modificación fue la creación del nuevo registro y las transiciones de estado del **mismo registro** `QUEUED → RUNNING → SUCCEEDED` mediante los RPC existentes. No se modificaron otros trabajos.

## Autenticación y controles
- Identidad firmada GitHub Actions OIDC; emisor oficial `https://token.actions.githubusercontent.com`, firma `RS256` con JWKS, audiencia `jarvis-oidc-execute-once-lab-v0`.
- Restricción firmada de `repository`, `ref`, `workflow_ref`, evento `push`, SHA válido, `run_id`, `run_attempt=1`, `iat` y `exp`.
- `verify_jwt=false` solo en la función nueva: autenticación GitHub OIDC propia obligatoria. No emplea JWT personal `CEREBRO_E2E_USER_JWT` ni secretos almacenados en el repo.
- Antes del lease, exige **una única fila** del nombre exclusivo, su UUID, empresa, motor, versión, ambiente, estado, `max_attempts`, idempotencia y contenido de operación fijados.
- RPC existente `jarvis_work_lease_named_v1` adquiere solamente ese nombre en `PREPROD`; `jarvis_work_complete_v1` registra prueba de éxito. Cualquier fallo de lectura debe pasar a `DEAD_LETTER` sin reintento.
- El workflow comprobó rechazos HTTP de token ausente, token falso, método no autorizado, audiencia errónea y firma alterada. **Tras el éxito el replay del mismo JWT devolvió `409 BLOCKED`**.
- No se concedió capacidad Git de escritura ni permiso a `main` o `gh-pages`.

## Evidencias de ejecución
- [GitHub Actions run 42542865116](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42542865116): job `one-readonly-job` **completed/success**.
- Log: `JARVIS_OIDC_ONE_READONLY_JOB=GREEN`, `job_id=006df2c9-282f-48d0-8ce8-6af8d3d6b5ae`, `attempts=1`, `auth=GITHUB_OIDC`, `negative_checks=5`, `replay_blocked=true`, `prod_touched=false`.
- SQL de lectura independiente confirmó `SUCCEEDED`, exit físico reflejado en el job y SHA; es diferente de un mero `QUEUED`.
- **Cierre de acceso:** después de terminar se contrastó la versión desplegada del ejecutor con su código GitHub (coincidencia exacta) y se desplegó **únicamente la versión 2 de esa misma función** usando `disabled.ts`: todo intento responde HTTP 403, sin dependencias de credenciales ni base de datos. Se conserva el código original por reconstrucción.
- La función figura `ACTIVE` técnicamente en Supabase porque está desplegada, pero funcionalmente está **OFF/fail-closed**. No afirmar que se mantiene un trabajador activo.

## Inventario y dependencias
- Código en rama LAB, función exclusiva y fila exclusiva de `public.jarvis_work_job_v1` en Supabase de pruebas.
- RPC preexistentes reutilizados, **sin alterar definición, tablas, contratos ni políticas RLS**.
- Dependencias externas durante ejecución: JWKS público de GitHub, un único `GET` al GitHub REST de la rama fijada, base de datos del propio Supabase de pruebas.
- Los consumidores `jarvis-git-safe-preprod-worker.yml` históricos permanecen desactivados; no se han creado cron ni tareas repetitivas.
- Coste adicional contratado: **0 €**. El consumo real de invocaciones Supabase y minutos CI no se ha medido; no afirmar coste marginal exacto 0 €.

## Rollback / rebuild
- Backup de origen: los dos archivos `index.ts` (ejecutor) y `disabled.ts` (OFF) de esta rama, más la evidencia del run 42542865116.
- Estado seguro **actual**: función v2 OFF. No volver a desplegar v1 sin una tarea nueva, contrato, nombre e ID exclusivos, revisión de alcance y gates completos.
- La fila del trabajo completado se conserva como evidencia; **no eliminar, resetear o reencolar**.
- Para reconstruir evidencia, repetir consultas `SELECT` sobre UUID de tarea y comprobar el run; no ejecutar la operación otra vez.
- Cambios futuros a producción exigen backup, comparación OLD vs NEW, aislamiento, tribunal y ensayo de rollback.

## Pendiente y NO promovido
1. Integración `UI real de JARVIS → Git Gateway → worker OIDC` con la sesión de usuario de la App y controles de autorización, sin autorrearme.
2. Autenticación de usuario renovable y principio de mínimos privilegios.
3. Micrófono, voz bidireccional y aceptación física en el PC.
4. Restauración física en superficie segura, OLD vs NEW completo, observabilidad y tribunal.
5. **Ninguna promoción PROD** hasta todos los gates en verde.

Regla: CONSERVAR → ENTENDER → ENVOLVER → PROBAR → MEJORAR → MIGRAR.
