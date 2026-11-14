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
