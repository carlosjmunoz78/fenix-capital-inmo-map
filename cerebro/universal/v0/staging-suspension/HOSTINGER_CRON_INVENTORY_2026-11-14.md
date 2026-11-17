# CEREBRO OS · Hostinger Cron · inventario leído desde hPanel (14/11/2026)

**Fuente:** captura facilitada por el propietario y lectura del árbol de accesibilidad de la pestaña autenticada de Hostinger `/websites/fenixcapital.es/advanced/cron-jobs` desde Opera; NO se ejecutó ni editó tarea alguna. Sitio: `fenixcapital.es`.

## Inventario exacto de programación mostrado
| ID local de inventario | Expresión cron | Script PHP | Redirección |
| --- | --- | --- | --- |
| HOST-01 | `*/2 * * * *` | `cerebro/job001_wp_bridge_canary_FIXED.php` | `cerebro/job001_wp_bridge_canary.log 2>&1` |
| HOST-02 | `*/15 * * * *` | `cerebro/job001_wp_bridge_canary_FIXED.php` | `cerebro/job001_wp_bridge_canary.log 2>&1` |
| HOST-03 | `0,30 * * * *` | `cerebro/job001_wp_bridge_canary_FIXED.php` | `cerebro/job001_wp_bridge_canary.log 2>&1` |
| HOST-04 | `48 * * * *` | `cerebro/job001_wp_bridge_canary_FIXED.php` | `cerebro/job001_wp_bridge_canary.log 2>&1` |
| HOST-05 | `* * * * *` | `cerebro/job001_master_scheduler.php` | Sin redirección visible |

Todos usan `/usr/bin/php` con raíz de alojamiento `/home/<hosting-user>/domains/fenixcapital.es/`. Se ha omitido el identificador interno de alojamiento del repositorio por minimización de exposición. Los nombres de ID HOST-01 a HOST-05 son IDs del inventario, **no identificadores nativos de Hostinger**.

## Interpretación y decisión de seguridad
- Los cuatro cron `HOST-01` a `HOST-04` invocan el mismo archivo `job001_wp_bridge_canary_FIXED.php` con cuatro cadencias, por lo que existe un posible consumidor WP bridge fuera del alcance del corte de pg_cron y Edge. El **destino efectivo no puede afirmarse sin leer el código PHP actual en Hostinger**. La programación refleja 30+4+2+1 = 37 oportunidades de ejecución por hora, aunque algunas se solapan.
- `HOST-05` invoca un scheduler maestro cada minuto. El control `enabled=false` de las 15 tareas dependientes de staging se ha verificado en Supabase; **hay que comparar el código PHP vivo del maestro con el artefacto del Gateway** antes de declararlo seguro. No borrar ni deshabilitar por inferencia sin mapa de dependencias.
- El hPanel mostró acciones `Ver resultado` y `Borrar`, **sin interruptor Pausar visible** en esta vista. No se ha pulsado ninguna de ellas. `Borrar` elimina la programación y solo se usará si se demuestra necesaria la suspensión y existe copia de la expresión/comando y plan probado de restauración.
- Estado: `HOSTINGER_SCHEDULES_INVENTORIED`, `LIVE_PHP_CODE_NOT_YET_AUDITED`, `GLOBAL_STAGING_ISOLATION_NOT_VERIFIED`.

## Próxima comprobación SIN tocar staging
Desde hPanel, `Archivos → Administrador de archivos → domains/fenixcapital.es/cerebro/` abrir **solo para lectura** `job001_wp_bridge_canary_FIXED.php` y revisar las URL/llamadas a red, claves de job/guardas y dependencias. Redactar secretos de cualquier captura. Después inspeccionar `job001_master_scheduler.php`. NO pulsar Guardar ni ejecutar el script. Nunca visitar `staging.fenixcapital.es`.

## Regla permanente
Suspensión de staging por orden del propietario: **HASTA NUEVA ORDEN**. No modificar App/CRM/WordPress PROD, DNS ni rama main. Preservar contratos, snapshots y rollback antes de cualquier modificación; cambio solo en el recurso exacto imprescindible para proteger staging.


## Diagnóstico de código PHP vivo · Canary FIXED

**HECHO, 14/11/2026:** el propietario abrió en modo editor `cerebro/job001_wp_bridge_canary_FIXED.php` en el administrador de archivos Hostinger; se inspeccionó su contenido actual desde el árbol de accesibilidad de Opera, **sin pulsar Save ni ejecutar PHP**. El archivo contiene literalmente el endpoint `https://staging.fenixcapital.es/wp-json/fenix-guard/v1/cerebro/status` y un uso de `curl_init`. El propio comentario `READ_ONLY_CANARY · PREPROD` no convierte el chequeo en una operación autorizada mientras el propietario exige no contactar staging; además, el script puede registrar resultados en `job001_wp_bridge_canary.log`.

**Conclusión:** las cuatro tareas HOST-01 a HOST-04 son consumidores externos de una ruta expresamente suspendida y deben quedar **pausadas/deshabilitadas**, manteniendo íntegro el archivo PHP y su registro. hPanel en la vista observada mostraba `Borrar`, sin interruptor de pausa; si no hay opción de desactivar, se puede retirar la programación de esas cuatro tareas, **solo después de conservar el inventario completo arriba**, con restauración exacta de cron y comando únicamente tras nueva orden explícita. No borrar ni editar `job001_master_scheduler.php`: se inspeccionará por separado.

**Estado de intervención:** `BLOCKER_FOUND_HOSTINGER_CANARY`; **cron de Hostinger todavía no verificados como detenidos** en este punto. Se requiere comprobación en hPanel después de la acción humana. No declarar aislamiento global hasta verificar cese de estas cuatro programaciones y revisar el PHP maestro.


## Cierre físico HOST-01 a HOST-04

**HECHO · 14 de noviembre de 2026 · Hostinger hPanel leído con Opera tras confirmación del propietario.**

El propietario indicó que retiró las cuatro tareas. Se volvió a leer en tiempo real el árbol de accesibilidad de la pestaña autenticada de hPanel `/websites/fenixcapital.es/advanced/cron-jobs` (página 1/1). En la sección `Lista de Cron jobs` figura **una sola** tarea:

- `* * * * *` — `/usr/bin/php /home/<hosting-user>/domains/fenixcapital.es/cerebro/job001_master_scheduler.php`.

El listado **ya no contiene** `job001_wp_bridge_canary_FIXED.php`. Por comparación con el inventario previo se acredita que HOST-01, HOST-02, HOST-03 y HOST-04 han sido retiradas y HOST-05 sigue configurada. **No se eliminó el archivo PHP ni se alteró el programador maestro en esta intervención**; la acción de borrado la completó el propietario desde hPanel.

**GATE ACTUAL:** `HOSTINGER_CANARY_CRONS_PAUSED_VERIFIED` · `MASTER_CRON_PRESERVED` · `MASTER_SCRIPT_PENDING_SOURCE_AUDIT`. No afirmar aún que todo Hostinger carece de vías hacia staging hasta inspeccionar en solo lectura el archivo PHP maestro y sus inclusiones/destinos. No consultar staging ni reactivar cron canary sin nueva orden expresa.


## JOB-001 Master PHP · inspección parcial del archivo vivo

**14/11/2026 · Solo lectura del editor vivo de Hostinger**: el propietario abrió `cerebro/job001_master_scheduler.php` en la pestaña Opera File Browser. Las primeras líneas accesibles del archivo muestran:
- `COMPANY_ID='FENIX_CAPITAL'`, `ENGINE_ID='SEO-001'`, `ENVIRONMENT='PREPROD'`
- `GATEWAY_URL='https://hnqlnvakzaywtafeiybt.supabase.co/functions/v1/cerebro-job001-gateway-preprod'`
- lista de `$jobs` con ID y cron PREPROD, incluyendo JOB-001/13 `seo001-wp-bridge-probe`.
- El texto mostrado no contiene ninguna URL directa de staging, **pero el editor de Hostinger virtualiza el archivo y solo expuso el tramo inicial hasta el job 17**. No confundir esta lectura con inspección física completa del PHP en Hostinger.

**Contrato del servidor remoto contrastado por separado:** la Edge PREPROD `cerebro-job001-gateway-preprod` v11 exige secreto de gateway, lee `cerebro_job001_control_preprod.enabled` y devuelve `SKIPPED_DISABLED` antes del despacho cuando `enabled=false`. El mismo día se volvió a verificar que las 15 tareas dependientes de staging `[5,7,8,9,10,11,13,14,15,16,18,20,21,22,23]` siguen deshabilitadas y solo `[2,6,12,17,19]` están habilitadas.

**Referencia del código esperado, NO prueba de identidad del vivo:** la misma Edge v11 conserva una copia `MASTER_ARTIFACT` de 196 líneas, con destino fijo al gateway PREPROD, configuración de jobs en fichero local `job001_enabled_jobs.json`, secreto almacenado fuera del PHP y llamadas cURL al Gateway con `CURLOPT_FOLLOWLOCATION=false`. La copia no contiene `staging.fenixcapital.es`, pero debe contrastarse el final del editor vivo antes de certificar el master.

**Pendiente:** que el propietario desplace el editor a su final para completar lectura del código realmente instalado, sin pulsar Guardar, ejecutar script ni abrir staging.


## JOB-001 Master PHP · final del archivo vivo revisado

**14/11/2026 · revisión física del final del editor de Hostinger (sin ejecutar ni guardar):**
- Tras desplazarse el propietario con Ctrl+Fin, el árbol del editor Hostinger muestra las líneas finales del archivo `job001_master_scheduler.php`. Se revisó estructura y comportamiento sin divulgar los valores de credenciales.
- Confirma la carga de secreto local mediante `file_get_contents` y el rechazo de secreto vacío; bucle `foreach ($due as $id)`, clave `$minuteKey . ':' . $id`, salto `SKIP_ALREADY_DONE`, invocación de `dispatchJob($id,...)`, registro de `DISPATCHED` / `DISPATCH_FAILED`, persistencia de `$stateFile` mediante `file_put_contents(..., LOCK_EX)` y liberación de bloqueo mediante `flock(..., LOCK_UN)` y `fclose`.
- No se observó ninguna URL de staging en los fragmentos inicial y final accesibles. **No se ha leído íntegramente el tramo central virtualizado del editor**, por lo que no se certifica igualdad byte a byte con el `MASTER_ARTIFACT` embebido en la Edge PREPROD.
- Se revalidó simultáneamente la tabla `public.cerebro_job001_control_preprod`: 15 jobs dependientes de staging `enabled=false`; los 5 jobs `[2,6,12,17,19]` siguen `enabled=true`. La Edge Gateway tiene control `enabled` previo al dispatch.
- **Próximo control más eficiente:** abrir para lectura `cerebro/job001_enabled_jobs.json` desde Hostinger y comparar sus IDs habilitados contra el estado real de Supabase. No abrir `job001_master_secret` ni otro archivo de credenciales, no pulsar Guardar, no ejecutar scripts. La mera presencia de IDs en JSON no prueba despacho si la Edge los bloquea, pero puede señalar configuraciones por depurar.

**Estado:** `MASTER_DISPATCH_PATH_PARTIALLY_VERIFIED`, `HOSTINGER_CANARY_CRONS_REMOVED_VERIFIED`, `GLOBAL_ISOLATION_NOT_YET_CERTIFIED`. Preservar el cron maestro de 1 minuto.


## HOSTINGER JSON · discrepancia de 20 frente a 5 trabajos

**Verificación física, 14/11/2026:** el propietario abrió `cerebro/job001_enabled_jobs.json` en el editor del Administrador de archivos de Hostinger. Se leyó íntegramente en modo solo lectura a través del árbol de accesibilidad de Opera: `{"enabled_job_ids":[2,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23]}` (20 IDs).

**Comprobación actual SQL PREPROD:** `cerebro_job001_control_preprod`, empresa `FENIX_CAPITAL`, motor `SEO-001`, entorno `PREPROD` devuelve solo cinco `enabled=true`: `[2,6,12,17,19]`, y 15 `enabled=false`: `[5,7,8,9,10,11,13,14,15,16,18,20,21,22,23]`.

**Diagnóstico:** el fichero Hostinger de scheduling sigue enumerando 20 candidatos, aunque la Edge `cerebro-job001-gateway-preprod` rechaza los 15 deshabilitados mediante `SKIPPED_DISABLED`. Corregir el archivo local para enumerar **solo** `[2,6,12,17,19]` reduciría despachos innecesarios hacia el Gateway y reforzaría la suspensión a nivel de origen, sin cambiar el PHP maestro.

**Plan reversible pendiente de ejecución humana:** (1) duplicar/descargar `job001_enabled_jobs.json` bajo nombre de copia fechada en alojamiento, sin ejecutar script; (2) sustituir únicamente contenido JSON por `{"enabled_job_ids":[2,6,12,17,19]}`; (3) guardar una sola vez, inspeccionar JSON leído otra vez desde el editor y confirmar cinco IDs; (4) validar cinco controles habilitados y 15 deshabilitados en Supabase. Nunca borrar el PHP maestro ni tocar secretos o staging. Hasta completar y verificar, estado `HOSTINGER_JSON_MISMATCH_PENDING_HUMAN_EDIT`.

## Hostinger JSON · alineación verificada después de guardar

**HECHO · 14/11/2026.** El propietario cambió el fichero `cerebro/job001_enabled_jobs.json` según el plan anterior. Se comprobó el editor abierto y después **se volvió a abrir la misma URL en una pestaña nueva independiente de Opera**, para descartar cambios pendientes de guardar. La lectura nueva confirmó que el JSON persistido es exactamente `{"enabled_job_ids":[2,6,12,17,19]}` y ya no incluye los otros quince IDs previamente enumerados.

**Estado de la ruta origen:** cuatro cron canary con destino directo staging retirados (verificación física previa); un cron `job001_master_scheduler.php` conservado con ejecución de 1 minuto; JSON maestro reducido a 5 IDs; Supabase Gateway `cerebro_job001_control_preprod` mantiene `enabled=true` solo para `[2,6,12,17,19]` y `enabled=false` para quince trabajos de staging. No se reactivó ni contactó con staging.

**Límite:** bloqueos de canary y configuración de scheduler verificados, pero la certificación de aislamiento global de cualquier integración Hostinger/tercero sigue pendiente de una auditoría exhaustiva de consumidores no inventariados. No recuperar ni reprogramar cron canary mientras staging permanezca suspendida.
