# Gate de promoción a PROD · Fénix Capital CEREBRO OS

## Estado actual
- `preprod-app-phase1` es el entorno de trabajo y validación.
- El HEAD PRE-PROD validado antes de este documento es `443b6c20cd9e7066f96c463b43a1fe80215923b3`.
- Su workflow PUSH `33267019422` / #2724 terminó en `success` con Build, Browser QA, artefactos, GitHub Pages y publicación de snapshot en verde.
- Snapshot `gh-pages`: `4dac3d7f364a09e7c44419cc359bfc6efd62851e`, mensaje exacto `deploy: PRE-PROD Pages snapshot 443b6c20cd9e7066f96c463b43a1fe80215923b3`.
- `main` no se considera actualmente una APP PROD preparada. No se debe asumir que existe una promoción segura simplemente por fusionar código.

## Regla de promoción
Ninguna versión pasa a PROD por automatismo. La promoción requiere una orden explícita de Carlos y un gate completo en verde.

## Condiciones obligatorias antes de promover
1. HEAD exacto de `preprod-app-phase1` identificado.
2. Workflow PUSH del mismo SHA en `success`.
3. Build en `success`.
4. Browser QA en `success` sin debilitar pruebas.
5. Artefactos `dist` y Playwright generados y vinculados al mismo SHA.
6. Snapshot PRE-PROD publicado con mensaje exacto correspondiente al SHA.
7. GitHub Pages del snapshot confirmado en `success` cuando aplique.
8. RBAC y rutas profundas siguen fallando cerrado.
9. Acciones sensibles conservan revisión/preview y confirmación explícita.
10. No existen llamadas directas desde PRE-PROD a funciones PROD ni funciones `fenix-*` sin sufijo `-test` dentro del cliente PRE-PROD.
11. Se dispone de punto de rollback reproducible anterior.
12. La configuración PROD, dominio/hosting, backend, secretos y almacenamiento están definidos de forma separada de PRE-PROD antes de cualquier activación real.
13. **Corte final de datos del CRM antiguo completado inmediatamente antes del lanzamiento**: expedientes, contactos, inmobiliarias y demás entidades operativas deben actualizarse con todos los cambios ocurridos desde la última reconciliación.
14. El corte final debe reconciliar altas nuevas, cambios de estado, nuevas relaciones, documentación, contactos, bajas/pausas/reactivaciones y cualquier modificación operativa producida en el CRM antiguo hasta el momento acordado de congelación.
15. Tras ese corte se debe generar un snapshot/manifiesto final de migración, ejecutar comprobaciones de duplicados, relaciones e idempotencia y confirmar que el CRM nuevo contiene la fotografía operativa vigente antes de abrir la app para uso real.
16. Durante el periodo de transición posterior al arranque, el CRM antiguo se conserva como respaldo/consulta hasta completar el periodo de convivencia acordado; no se borra ni se apaga como parte del lanzamiento inicial.

## Gate de corte final del CRM antiguo
La depuración que se está realizando durante PRE-PROD prepara la migración, pero **no sustituye al corte final**. Justo antes de activar la app se hará una última sincronización controlada desde el CRM antiguo hacia el nuevo sistema.

Secuencia obligatoria:
1. Definir una hora de corte.
2. Leer el estado más reciente del CRM antiguo.
3. Comparar contra el último manifiesto reconciliado.
4. Incorporar únicamente deltas reales y validados: expedientes nuevos/cambiados, contactos, inmobiliarias, relaciones, estados y documentación necesaria.
5. Excluir QA/TEST/DEMO y plantillas estructurales.
6. Reejecutar deduplicación e integridad referencial.
7. Ejecutar dry-run idempotente y comprobar conteos origen→destino.
8. Generar manifiesto final firmado por SHA/fecha de corte.
9. Validar smoke funcional sobre el CRM nuevo con esa fotografía final.
10. Solo entonces abrir la app a Dirección/Belén y comenzar la convivencia controlada con el CRM antiguo como respaldo.

## Lo que NO constituye una promoción válida
- Fusionar PR #2 por sí sola.
- Copiar el código PRE-PROD a `main` sin preparar el entorno PROD.
- Reutilizar credenciales, almacenamiento de sesión o Edge Functions PRE-PROD en PROD.
- Considerar válido un CI verde de otro SHA.
- Promover con Browser QA rojo, cancelado o sin ejecutar.
- Saltarse confirmaciones de acciones sensibles para acelerar un release.
- Lanzar la app con una fotografía de datos desactualizada respecto al CRM antiguo.

## Secuencia futura de PROD
Cuando Carlos ordene expresamente preparar/activar PROD:
1. Congelar un SHA PRE-PROD candidato.
2. Revalidar CI y snapshot exactos.
3. Crear/configurar el entorno PROD separado sin alterar PRE-PROD.
4. Configurar endpoints, auth storage, backend y secretos propios de PROD.
5. Ejecutar el **corte final del CRM antiguo** y generar el manifiesto definitivo de datos.
6. Ejecutar smoke test y QA sobre PROD con datos controlados y después validar la fotografía real migrada, sin importar fixtures DEMO como datos reales.
7. Activar inicialmente el alcance acordado para Dirección/Belén.
8. Mantener rollback inmediato al release anterior.
9. Mantener el CRM antiguo como respaldo/consulta durante la convivencia operativa acordada y registrar cualquier delta excepcional.
10. Solo después del arranque real registrar fricción y priorizar mejoras derivadas del uso.

## Capacidades posteriores al uso real
Quedan fuera del gate de lanzamiento inicial y se priorizarán después de que la app empiece a utilizarse, salvo orden expresa en contrario:
- OCR transversal.
- Audio → texto transversal.
- Chat interno CEREBRO completo.
- Evolución de notificaciones accionables y búsqueda/comandos universales.
- Nuevas automatizaciones derivadas de fricción real.
- Activación progresiva de nuevos roles.
- Capas visuales, carruseles, efectos y microinteracciones no necesarias para la operativa inicial.

## Seguridad
- No tocar `main`, PROD, WordPress ni Supabase PROD desde trabajos PRE-PROD sin orden explícita.
- No fusionar PR #2 sin orden explícita.
- No copiar secretos a documentación ni repositorio.
- No inventar endpoints, tablas, permisos o reglas de negocio para completar una promoción.

## Criterio de cierre
Este documento deja preparado el procedimiento; no declara que PROD exista ni autoriza su activación. La promoción real sigue pendiente de una orden explícita, de la creación/verificación del entorno PROD separado y del corte final actualizado del CRM antiguo.