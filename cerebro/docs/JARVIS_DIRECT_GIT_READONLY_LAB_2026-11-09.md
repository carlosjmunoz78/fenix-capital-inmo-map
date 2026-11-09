# CEREBRO OS · JARVIS · Git directo solo lectura LAB v0
**Fecha:** 09/11/2026 · **Estado:** LAB VERDE; E2E de usuario real pendiente; **PROD BLOQUEADA**.

## Identidad, objetivo y compatibilidad

- `company_id=fenix`, `engine_id=CONSOLE-001`, `environment=LAB`, `version=v0`.
- Objetivo: evitar que los botones de JARVIS envíen trabajos a `git.safe.v1` mientras el consumidor Git histórico está desactivado por su ciclo automático. Añadir una alternativa de **consultas GitHub inmediatas, solo lectura y con resultado verificable**.
- No fusionar esta rama automáticamente con `main`. No se ha desplegado la nueva UI en `https://app.fenixcapital.es`.
- Rama exclusiva `cerebro/jarvis-git-direct-readonly-lab-20261109`, nacida del estado previamente verificado `fd0e0c69e2c0f1b135dbed51b0f2efc12c10d30e`.
- Backup del código previo `backup/20261109-jarvis-git-parity-before-direct-lab` al mismo SHA.
- Conservado el Inspector Git anterior; el nuevo se muestra **solo cuando `VITE_JARVIS_GIT_DIRECT_LAB=true` y `IS_PRODUCTION=false`**. Por defecto la nueva función NO se habilita en PROD.
- No existe App PREPROD desplegada. Las pruebas de frontend se hicieron como build efímero local en GitHub Actions, usando respuestas de sesión y Gateway simuladas.

## Backend nuevo, aislado de PROD

- Supabase existente: `hnqlnvakzaywtafeiybt`, región UE `eu-north-1`.
- Nueva función `jarvis-git-direct-readonly-lab-v0`, versión 1, **ACTIVE en LAB**. No se reemplazó ninguna función ni RPC preexistente.
- Fichero: `supabase/functions/jarvis-git-direct-readonly-lab-v0/index.ts`.
- La ruta `POST /inspect` permite únicamente `STATUS`, `DIFF`, `CI_READ`, `COMPARE`. Requiere SHA completo de la rama fija `cerebro/jarvis-work-codex-complete-20261102`.
- Usa solo GitHub REST público `GET`. `STATUS` verifica el HEAD remoto, **no** supone un árbol de trabajo local; `DIFF/COMPARE` muestran metadatos de comparación con `main`; `CI_READ` presenta recuentos observados y NO afirma que todos los checks hayan pasado sin evidencia.
- No encola jobs, no necesita consumidor ni cron, no tiene operaciones de Git write, `enqueue`, `lease`, `complete`, `cancel`, ni actualiza ninguna fila en la base.
- `verify_jwt=false` exclusivamente para esta función nueva porque **verifica manualmente un JWT de usuario Supabase** mediante `auth.getUser()`; realiza luego comprobación autorizada de `CARLOS-ADMIN` vía `fenix_prod_actor_context_by_auth_server`. No confundir con identidad técnica OIDC; **no** usa un token GitHub Actions para autenticar usuarios.
- Orígenes web admitidos únicamente `http://127.0.0.1:4173` y `http://localhost:4173`; origen público `https://app.fenixcapital.es` expresamente denegado en LAB.
- Los secretos de backend son exclusivamente del entorno Supabase; ninguno añadido a repositorios o logs. No se lee ni registra la sesión personal de nadie para QA.

## Cliente LAB

- `src/JarvisGitDirectReadonlyLab.tsx` aporta cuatro controles y verificación estricta de evidencia `JARVIS_GIT_DIRECT_READONLY_LAB`, `job_enqueued=false`, `git_writes=0`, `db_writes=0`, `prod_touched=false`.
- `src/jarvisWorkApi.ts` incorpora wrapper tipado que conserva cabeceras de sesión existentes y aplica flag.
- `src/CerebroJarvisWorkConsole.tsx` alterna entre Inspector Git antiguo y nuevo sin sustituir el resto de vistas.
- Si el Gateway devuelve HTTP 403/409/503, una rama diferente, `QUEUED` o resultados sin prueba, la UI **no declara éxito**.
- No se han alterado los motores de voz, App real, CRM, Supabase PROD, DNS, Trading o flujos antiguos.

## Pruebas reales y simuladas — distinguir expresamente

| Gate | Resultado | Evidencia |
| --- | --- | --- |
| Denegación HTTP real sin sesión, token inválido, origen PROD/no autorizado, GET y CORS | **7/7 VERDE** | [GitHub Actions 42571587067](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42571587067) |
| Build de frontend LAB con flag nueva activada | **VERDE** | Misma ejecución |
| Playwright con sesión **simulada**: cuatro operaciones sin `QUEUED`, bloqueo de rama distinta, respuesta sin evidencia y denegación 403 | **4/4 VERDE** | Misma ejecución |
| Build de frontend con feature flag desactivada y pruebas de interfaz anterior | **8/8 VERDE** | [GitHub Actions 42571752415](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42571752415) |
| Autenticación positiva con la **sesión real del propietario** en nueva Edge | **NO PROBADA** | Necesita aceptación controlada |
| Ejecución de un trabajo mediante **UI real → Git Gateway → OIDC worker** | **NO PROBADA** | Este LAB es lectura directa y **no ejecuta jobs** |
| Voz y micrófono físicos, rollback real, comparación OLD vs NEW completa | **PENDIENTE** | No se afirman operativos |

Los 19 controles corresponden a **siete negativas HTTP reales y doce pruebas Playwright simuladas**; NO equivalen a 19 pruebas E2E con identidad real.

## Coste, riesgos y fail-closed

- Nueva contratación: **0 €**. Se reutiliza Supabase existente y GitHub Actions ya habilitado. Consumo real de cuotas **sin medir**.
- La función LAB es una ruta adicional en el mismo proyecto de pruebas; sin tareas programadas ni workers persistentes.
- Los accesos con datos reales requieren `CARLOS-ADMIN`, SHA exacto y origen permitido. Como el origen PROD no está permitido, la UI no debe fusionarse en producción sin revisión y gates.
- GitHub público limita/puede denegar solicitudes anónimas por cuota; la API debe mostrar `UNAVAILABLE`, nunca inventar éxito. No se añadieron tokens GitHub ni nuevos planes.
- Dependencias: Supabase Auth, RPC actor context existente y GitHub REST público. El servicio de pruebas puede consumir invocaciones sin incrementar contratos.

## Backup, rollback y rebuild

- **Conservar** la rama backup y los SHA iniciales. Para revertir la nueva interfaz en una rama futura, apagar el flag `VITE_JARVIS_GIT_DIRECT_LAB`; `main` y `gh-pages` no contienen estos cambios.
- Backup físico de código nuevo: repositorio, commit de esta rama y fichero de la función; antes de una revisión, guardar instantánea de la función desplegada con `get_edge_function`.
- Rollback de Edge: después de auditoría de dependencias, desplegar exclusivamente `jarvis-git-direct-readonly-lab-v0` con implementación 403 fail-closed (o deshabilitarla administrativamente). Nunca reemplazar funciones preexistentes.
- Rebuild: código `index.ts` mismo slug, proyecto `hnqlnvakzaywtafeiybt`, `verify_jwt=false` más comprobación propia Auth, repetir los siete HTTP negativos y las cuatro pruebas Playwright. No reconstruir App PROD.

## Gate de promoción

`REAL_USER_SESSION_AUTH` → `APP_UI_REAL_E2E` → `OLD_VS_NEW_PARITY` → `PHYSICAL_VOICE` → `RESTORE_REVERSAL` → `TRIBUNAL` → `PROD`.

**No se ha promovido JARVIS a PROD.** CONSERVAR → ENTENDER → ENVOLVER → PROBAR → MEJORAR → MIGRAR.

## Cierre adicional · Contrato real de usuario y reversión HTTP (09-11-2026)

### Diagnóstico real de identidad PREPROD

Se ha detectado que el backend nuevo del LAB utilizaba por error `fenix_prod_actor_context_by_auth_server`, que **no existe en el proyecto Supabase PREPROD** `hnqlnvakzaywtafeiybt`. Por tanto las pruebas HTTP negativas de v1 eran válidas, pero la autorización **positiva** del usuario no era viable y las pruebas Playwright de éxito estaban simuladas.

Inventario PREPROD, sin leer credenciales: `preprod_test.actors` contiene siete actores, seis vinculados a Supabase Auth. `CARLOS-ADMIN` está activo y vinculado; `DIR-TEST` también existe en **PREPROD**. Esto no contradice la ausencia de `DIR-TEST` previamente observada en PROD: son proyectos separados. Las funciones originales `preprod_test.current_actor_code` y `current_actor_role` leen `auth.uid()`, pero no pueden invocarse en el contexto del service role sin un usuario JWT propagado.

Se ha creado **solo en PREPROD** la función nueva `public.jarvis_lab_actor_context_by_auth_server_v0(uuid)` mediante migración `supabase/migrations/20261109071500_jarvis_lab_actor_context_by_auth_server_v0.sql`, sin alterar tablas, usuarios ni RPC existentes. Contrato:
- Invocación exclusiva `service_role`; permisos `anon=false`, `authenticated=false`, `service_role=true` verificados mediante `has_function_privilege`.
- SECURITY DEFINER y `search_path=''`, SQL parametrizado, consulta únicamente `preprod_test.actors` por el UUID obtenido de `auth.getUser()` en Edge.
- Permite solo actor activo `CARLOS-ADMIN` con rol `Direccion`. Deniega `DIR-TEST`, `FIN-A`, UUID nulo y demás perfiles. SELECT SQL verificó respuestas positivas/negativas; **NO es una prueba HTTP positiva de sesión**.
- Edge `jarvis-git-direct-readonly-lab-v0` actualizada **solo esa función**, a versión **2**, para utilizar la nueva RPC del LAB. La versión anterior fue contrastada byte a byte con el fichero de GitHub antes de actualizar. Versión previa preservada en historial Git (blob `3c5976ec407c97a0882e2d3e7d52289fd3c0354f`).
- La Edge v2 conserva `auth.getUser()`, restricción de origen y operaciones de Git exclusivamente GET, sin filas encoladas ni escrituras. `verify_jwt=false` solo en esta función con autenticación propia obligatoria.
- Se ha repetido el CI después del cambio: [GitHub Actions run 42573836930](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42573836930), **completed/success**, gate de fuente de autorización VERDE, **7/7 negativas HTTP reales** y **4/4 pruebas de interfaz con identidad simulada**. El E2E positivo con token auténtico PREPROD de `CARLOS-ADMIN` sigue pendiente y NO se ha intentado extraer una sesión personal.

### Reversión física de contenido HTTP aislado

- Ejecución one-shot [GitHub Actions 42574105503](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42574105503): **GREEN**.
- Baseline exacto público desplegado: `gh-pages@01650c6fb728aa9d41dc4877dd4bee243372be68`; candidate offline: `main@3600942775fbc19b47560e6f798caca107cd7473`.
- Dos checkouts inmutables, `npm ci`, `vite build` de candidato, servidor `python -m http.server` exclusivamente en `127.0.0.1:18761`.
- Switch por intercambio atómico de enlace simbólico `OLD → NEW → OLD`, comprobación real por `curl` y comparación exacta de hashes del contenido HTTP servido frente a disco. Hash OLD: `d9d316607bb947191b035165ee1960eb7ab456d533f43d2c536ebe71b8fead3b`; NEW: `42e9f499a8321c97d9a03c45e989dd33643bb208e995e2a615fe3a53f33ac2e5`.
- Verificación de `CNAME=app.fenixcapital.es` en backup y SHA de refs antes y después. No se escribió en GitHub branch protegido, no se publicó ni cambió DNS.
- **Acredita rollback físico aislado HTTP de los archivos, NO rollback real del dominio, sesión, API ni persistencia del CRM.** El gate de recuperación integral PROD continúa pendiente.

### Runbook de reversión

1. Para desactivar la nueva pantalla: dejar `VITE_JARVIS_GIT_DIRECT_LAB=false` en builds de LAB; `main` y `gh-pages` nunca han incorporado la pantalla.
2. Para desactivar Edge v2: comprobar dependencias y snapshot del código desplegado, luego sustituir exclusivamente `jarvis-git-direct-readonly-lab-v0` por respuesta 403 fail-closed. No modificar otras funciones.
3. Solo después de deshabilitar cualquier consumidor, revertir la RPC nueva exclusivamente en PREPROD si se determina que no la utiliza nadie (no se ha efectuado DROP).
4. Rebuild: recuperar los ficheros de esta rama, recrear únicamente la función de autorización de LAB con permisos limitados, desplegar solo la Edge LAB y repetir HTTP negativos, pruebas visuales y el E2E positivo cuando exista una sesión de pruebas legítima.

### Estado de promoción

`LAB_AUTHZ_DB_CONTRACT=GREEN`; `LAB_EDGE_HTTP_NEGATIVES=GREEN`; `LAB_UI_MOCK=GREEN`; `ISOLATED_HTTP_REVERSAL=GREEN`.

Persisten `REAL_OWNER_AUTH_HTTP_POSITIVE=PENDIENTE`, `PHYSICAL_VOICE=PENDIENTE`, `PUBLIC_DOMAIN_ROLLBACK=PENDIENTE`, `COMPLETE_OLD_NEW_PARITY=PENDIENTE`, `TRIBUNAL=PENDIENTE`.

**Sin cambio a PROD.** No se han contratado planes nuevos; consumo de cuotas existentes sin medir.

### Verificación de continuidad posterior

Durante la comprobación final, `main` avanzó **por cambios independientes de este laboratorio** desde `3600942775fbc19b47560e6f798caca107cd7473` hasta `4cf90f47b56300ce70fa30d097713d1e199e5b30`. La comparación GitHub encontró únicamente cambios en `cerebro/registry/skill-dynamic-adoption-v1.json`, sin archivos de JARVIS o frontend. `gh-pages` permanece en `01650c6fb728aa9d41dc4877dd4bee243372be68` y el backup `backup/20261109-jarvis-git-parity-before-direct-lab` permanece en `fd0e0c69e2c0f1b135dbed51b0f2efc12c10d30e`. El ensayo HTTP reproducible sigue fijado a los SHA antiguos y **no demuestra la compilación del nuevo `main` posterior**; repetir gates contra el HEAD vigente antes de cualquier promoción.

La inspección de sesiones de navegador mediante conectores no devolvió acceso utilizable; **no se verificó autorización HTTP positiva con token real**. No extraer ni trasladar tokens personales entre proyectos. El progreso físico se limita a SQL de permisos/roles, HTTP negativos y pruebas frontend simuladas.
