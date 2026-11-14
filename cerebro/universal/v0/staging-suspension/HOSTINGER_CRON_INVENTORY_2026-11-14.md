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
