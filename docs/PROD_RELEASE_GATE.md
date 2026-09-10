# Gate de promoción a PROD · Fénix Capital CEREBRO OS

## Estado actual
- Rama canónica de preparación: `prod-preparation`.
- Runtime APP: exclusivamente PROD; no conserva URL/key PRE-PROD, sufijos TEST ni namespace de sesión PRE-PROD.
- El workflow APP PRE-PROD ha sido retirado del flujo activo.
- `PROD Runtime Smoke` está validando gateway, fail-closed de identidad, CORS de Ana y disponibilidad del secreto Notion sin exponerlo.
- `PROD Preparation Build` valida credenciales, build aislado PROD y Browser QA sobre el SHA exacto.
- Supabase PROD está reconocido por GitHub Actions mediante `PROD_SUPABASE_URL` y `PROD_SUPABASE_PUBLISHABLE_KEY`.
- `NOTION_TOKEN` está disponible para las comprobaciones que lo requieren.
- `main` no se considera todavía una APP PROD activada: la promoción real sigue condicionada a todos los gates técnicos, de datos, migración y smoke.

## Regla operativa vigente de promoción
Ninguna versión pasa a PROD por automatismo: debe cumplir todos los gates técnicos, de datos, credenciales y smoke definidos en este documento. La orden explícita operativa vigente autoriza a proseguir sin confirmaciones repetitivas cuando esos gates estén efectivamente en verde; no autoriza a saltarse gates ni a promover con CI rojo.

Por tanto:
- no se pedirán confirmaciones repetitivas para pasos normales, reversibles y técnicamente validados de preparación, migración, cutover o lanzamiento;
- si un gate está verde, se continúa al siguiente paso seguro;
- si un gate está rojo, se diagnostica, corrige y revalida;
- solo se detendrá el flujo ante un bloqueo externo real: credenciales inaccesibles, coste/compra, riesgo destructivo irreversible, pérdida de datos o ambigüedad de negocio/datos sin evidencia suficiente;
- el CRM antiguo debe permanecer intacto y utilizable durante la estabilización, incluso después de activar la app nueva.

## Condiciones obligatorias antes de promover
1. HEAD exacto de `prod-preparation` identificado.
2. `PROD Preparation Build` del mismo SHA en `success`.
3. Build PROD aislado en `success`.
4. Browser QA PROD en `success` sin debilitar pruebas.
5. Informe/artefacto de validación generado y vinculado al mismo SHA.
6. `PROD Runtime Smoke` del mismo estado de release en `success`.
7. RBAC y rutas profundas siguen fallando cerrado.
8. Acciones sensibles conservan revisión/preview y confirmación explícita dentro del producto cuando corresponda.
9. El cliente APP no contiene dependencias runtime PRE-PROD, credenciales PRE-PROD, sufijos TEST ni fallback de actor QA.
10. Se dispone de punto de rollback reproducible anterior.
11. La configuración PROD, dominio/hosting, backend, secretos y almacenamiento están definidos de forma separada y verificable antes de cualquier activación real.
12. **Corte final de datos del CRM antiguo completado inmediatamente antes del lanzamiento**: expedientes, contactos, inmobiliarias y demás entidades operativas deben actualizarse con todos los cambios ocurridos desde la última reconciliación.
13. El corte final debe reconciliar altas nuevas, cambios de estado, nuevas relaciones, documentación, contactos, bajas/pausas/reactivaciones y cualquier modificación operativa producida en el CRM antiguo hasta el momento acordado de congelación.
14. Tras ese corte se debe generar un snapshot/manifiesto final de migración, ejecutar comprobaciones de duplicados, relaciones e idempotencia y confirmar que el CRM nuevo contiene la fotografía operativa vigente antes de abrir la app para uso real.
15. Durante el periodo de transición posterior al arranque, el CRM antiguo se conserva como respaldo/consulta hasta completar el periodo de convivencia acordado; no se borra ni se apaga como parte del lanzamiento inicial.

## Gate de corte final del CRM antiguo
La depuración realizada antes de PROD prepara la migración, pero **no sustituye al corte final**. Justo antes de activar la app se hará una última sincronización controlada desde el CRM antiguo hacia el nuevo sistema.

Secuencia obligatoria:
1. Fijar automáticamente la hora efectiva de corte cuando el resto de gates esté listo.
2. Leer el estado más reciente del CRM antiguo.
3. Comparar contra el último manifiesto reconciliado.
4. Incorporar únicamente deltas reales y validados: expedientes nuevos/cambiados, contactos, inmobiliarias, relaciones, estados y documentación necesaria.
5. Excluir QA/TEST/DEMO y plantillas estructurales.
6. Reejecutar deduplicación e integridad referencial.
7. Ejecutar dry-run idempotente y comprobar conteos origen→destino.
8. Generar manifiesto final firmado por SHA/fecha de corte.
9. Validar smoke funcional sobre el CRM nuevo con esa fotografía final.
10. Si todo queda verde, abrir la app a Dirección/Belén y comenzar la convivencia controlada con el CRM antiguo como respaldo, sin pedir una nueva confirmación de microgestión.

## Lo que NO constituye una promoción válida
- Fusionar un PR por sí solo sin cumplir los gates técnicos y de datos.
- Copiar código a `main` sin preparar el entorno PROD.
- Reutilizar credenciales, almacenamiento de sesión, funciones TEST o cualquier dependencia PRE-PROD en PROD.
- Considerar válido un CI verde de otro SHA.
- Promover con Browser QA rojo, cancelado o sin ejecutar.
- Saltarse confirmaciones de acciones sensibles dentro del producto para acelerar un release.
- Lanzar la app con una fotografía de datos desactualizada respecto al CRM antiguo.
- Borrar, apagar o inutilizar el CRM antiguo durante el lanzamiento inicial.

## Secuencia de PROD
1. Congelar un SHA candidato en `prod-preparation`.
2. Revalidar `PROD Preparation Build` y `PROD Runtime Smoke` sobre el SHA/estado de release correspondiente.
3. Confirmar configuración PROD, endpoints, auth storage, backend y secretos propios de PROD.
4. Ejecutar el **corte final del CRM antiguo** y generar el manifiesto definitivo de datos.
5. Ejecutar smoke y QA con datos controlados y después validar la fotografía real migrada, sin importar fixtures DEMO como datos reales.
6. Activar inicialmente Dirección/Belén cuando todos los gates estén verdes.
7. Mantener rollback inmediato al release anterior.
8. Mantener el CRM antiguo como respaldo/consulta durante la convivencia operativa y registrar cualquier delta excepcional.
9. Solo después del arranque real registrar fricción y priorizar mejoras derivadas del uso.

## Capacidades posteriores al uso real
Quedan fuera del gate de lanzamiento inicial y se priorizarán después de que la app empiece a utilizarse, salvo que sean necesarias para resolver una fricción crítica:
- OCR transversal.
- Audio → texto transversal.
- Evolución del chat interno CEREBRO.
- Evolución de notificaciones accionables y búsqueda/comandos universales.
- Nuevas automatizaciones derivadas de fricción real.
- Activación progresiva de nuevos roles.
- Capas visuales, carruseles, efectos y microinteracciones no necesarias para la operativa inicial.

## Seguridad
- No tocar `main`, WordPress ni ejecutar cambios destructivos en Supabase PROD mientras un gate de promoción esté rojo.
- No promover con CI rojo ni debilitar pruebas para conseguir un verde artificial.
- No copiar secretos a documentación ni repositorio.
- No inventar endpoints, tablas, permisos o reglas de negocio para completar una promoción.
- No ejecutar borrados o desactivaciones irreversibles del CRM antiguo como parte del cutover.
- Ante credenciales realmente inaccesibles o coste obligatorio, señalar el bloqueo concreto y seguir avanzando en todo lo demás.
- Los manifiestos y planes generados durante migraciones deben quedar fuera del repositorio mediante `.gitignore`; nunca se versionan URLs firmadas temporales, credenciales ni artefactos generados con metadatos sensibles.

## Criterio de cierre
Este documento define un flujo de avance continuo: **verde → prosigue; rojo → corrige y revalida**. La orden explícita operativa vigente permite avanzar sin convertir a Carlos en un gate manual para cada paso. La activación real solo queda condicionada a que los gates técnicos, de datos, credenciales y smoke estén efectivamente en verde y a mantener el CRM antiguo intacto como respaldo.
