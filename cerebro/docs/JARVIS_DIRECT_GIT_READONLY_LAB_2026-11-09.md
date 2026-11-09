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
