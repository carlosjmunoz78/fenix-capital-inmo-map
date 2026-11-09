# CEREBRO OS · JARVIS · OIDC Job Observer LAB v0 · 9 noviembre 2026

**Estado: HECHO en laboratorio para observación de cola real. No hay motor de ejecución nuevo ni promoción a PROD.**

## Identidad, entorno y código

- `company_id=fenix` / `engine_id=CONSOLE-001` / `environment=LAB` / `version=v0`.
- Repositorio: `carlosjmunoz78/fenix-capital-inmo-map`. Rama **exclusiva**: `cerebro/jarvis-oidc-job-observer-lab-v0-20261109`, nacida de `main@3600942775fbc19b47560e6f798caca107cd7473`.
- Función **nueva** `jarvis-oidc-job-observer-lab-v0`, Supabase existente `hnqlnvakzaywtafeiybt`, región UE `eu-north-1`, versión desplegada 1. No se reemplazó ninguna función previa, ni se modificaron tablas, RPC, RLS, el frontend o pipelines protegidos.
- Código respaldado: `supabase/functions/jarvis-oidc-job-observer-lab-v0/index.ts`; workflow `.github/workflows/cerebro-jarvis-oidc-job-observer-lab-once.yml`; manifest `cerebro/registry/jarvis-oidc-job-observer-lab-v0.manifest.json`.
- `verify_jwt=false` se aplica **únicamente a esta función nueva** porque el endpoint verifica GitHub OIDC firmado internamente. No significa acceso anónimo a datos: sin JWT GitHub válido devuelve HTTP 403.

## Contrato de autenticación y permisos

1. GitHub Actions recibe una identidad técnica efímera mediante OIDC (sin contraseñas personales ni `CEREBRO_E2E_USER_JWT`).
2. Verificación de firma con JWKS oficial GitHub; `issuer`, `audience`, `repository`, `ref`, `workflow_ref`, `event_name=push`, SHA, `run_id`, ventanas `iat/exp` y algoritmo RS256.
3. `sub` personalizado se admite sin desactivar la validación firmada del resto de claims.
4. Solo `POST /functions/v1/jarvis-oidc-job-observer-lab-v0/status`; otras rutas/métodos 404. El endpoint responde 403 si el proyecto o la identidad no corresponden al contrato.
5. Solo ejecuta un `SELECT name,status` acotado a `company_id=fenix`, `engine_id=CONSOLE-001`, `environment=PREPROD` y dos nombres de trabajo; devuelve únicamente **recuentos agrupados** y nunca IDs, payload, datos de clientes, tokens o errores internos.
6. Cero rutas `enqueue/lease/complete/fail/cancel`, cero `INSERT/UPDATE/DELETE` y cero acceso a PROD, Trading, App o CRM. `SUPABASE_SERVICE_ROLE_KEY` permanece exclusivamente en el servidor; nunca se devuelve ni se registra. Si no hay configuración o falla la lectura, fail-closed.
7. Sin cron, autorrearme ni otros workflows. Permisos GitHub `contents: read` e `id-token: write` **solo para acuñar la identidad OIDC**, no para modificar repositorios.

## Prueba física real

[GitHub Actions run #42541902387](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42541902387): `completed/success`.

Evidencia: `OIDC_TO_REAL_JARVIS_PREPROD_QUEUE=GREEN`. Se realizaron verificaciones de rechazo (sin JWT, JWT falso, método incorrecto, ruta no permitida, audiencia distinta y firma alterada) y aceptación de token legítimo firmado. No se imprimió el token.

Resultado de la cola *real*, comprobado por GitHub OIDC y una consulta SQL independiente de Supabase:

| Trabajo | Estado | Recuento |
| --- | --- | ---: |
| `git.safe.v1` | `SUCCEEDED` | 1 |
| `git.safe.v1` | `DEAD_LETTER` | 1 |
| `repo.sandbox.public.readonly.v0` | `SUCCEEDED` | 2 |
| **Total** | **3 éxitos · 1 error terminal · 0 pendientes** | **4** |

El caso `DEAD_LETTER` presenta `error_code=GIT_SAFE_WORKER_FAILED`, `attempts=1`, `max_attempts=1`. **No se ha reintentado ni reprocesado**. La prueba de lectura no resuelve ese error histórico ni demuestra ejecución de un trabajo nuevo.

## Dependencias, backup, rollback y reconstrucción

- Lecturas autorizadas: JWKS público de GitHub y tabla `public.jarvis_work_job_v1` **solo en proyecto PREPROD**.
- Dependencias NO utilizadas: App, CRM, PROD transaccional, DNS, `gh-pages`, `main`, WordPress, Trading, planes nuevos, IA de pago.
- **Backup funcional**: fuente exacta y contrato de despliegue en esta rama técnica. `main` y `gh-pages` protegidos; antes de cualquier nueva versión comprobar HEAD y hacer snapshot del código desplegado con `get_edge_function`.
- **Rebuild**: redeplegar exclusivamente `jarvis-oidc-job-observer-lab-v0` desde `index.ts` en el mismo proyecto. Configuración: `entrypoint=index.ts`, `verify_jwt=false` (custom RS256), sin añadir secretos. Repetir seis negativas y positiva desde workflow autorizado.
- **Rollback**: para deshabilitar, desplegar una versión de esta **misma función** que solo responda HTTP 403, o eliminarla previa comprobación de dependencias y backup. No ejecutar rollback sobre funciones previas ni proyectos de producción.
- **Observabilidad**: exit code de Actions, estado/códigos HTTP y conteos agregados, evitando imprimir tokens o payload. No se ha configurado un sistema de logs pesados adicional.
- **Coste**: 0 € en nuevas contrataciones; consumo marginal de invocaciones de cuota existente no cuantificado. No usar nueva suscripción.
- **Autonomía**: `READONLY_LAB_ONESHOT`; cualquier paso a worker real exige contratos específicos, pruebas de arrendamiento/lease y rollback en un entorno separado.

## Gate siguiente: qué NO se ha demostrado

- Ejecución física de un trabajo Git encolado mediante `UI → Git Gateway → worker OIDC`, porque el consumidor histórico permanece desactivado por auto-rearm.
- Autenticación permanente **de usuario** de JARVIS: esta identidad técnica no es `CARLOS-ADMIN` ni `DIR-TEST` de Supabase Auth.
- Voz bidireccional/micrófono reales, OLD vs NEW de servicios, rollback real del dominio y tribunal completo.
- Promoción PROD sigue **BLOQUEADA**. No habilitar worker histórico sin eliminar bucle, probar OIDC y limitarlo a una única operación segura.

## Historial

- `09-11-2026`: nuevo branch de `main` verificado, función aislada creada y desplegada por primera vez, prueba real de consulta firmada pasada, manifest y runbook generados.

**Regla invariable: CONSERVAR → ENTENDER → ENVOLVER → PROBAR → MEJORAR → MIGRAR.**
