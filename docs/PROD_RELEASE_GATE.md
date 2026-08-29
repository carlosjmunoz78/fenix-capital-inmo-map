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

## Lo que NO constituye una promoción válida
- Fusionar PR #2 por sí sola.
- Copiar el código PRE-PROD a `main` sin preparar el entorno PROD.
- Reutilizar credenciales, almacenamiento de sesión o Edge Functions PRE-PROD en PROD.
- Considerar válido un CI verde de otro SHA.
- Promover con Browser QA rojo, cancelado o sin ejecutar.
- Saltarse confirmaciones de acciones sensibles para acelerar un release.

## Secuencia futura de PROD
Cuando Carlos ordene expresamente preparar/activar PROD:
1. Congelar un SHA PRE-PROD candidato.
2. Revalidar CI y snapshot exactos.
3. Crear/configurar el entorno PROD separado sin alterar PRE-PROD.
4. Configurar endpoints, auth storage, backend y secretos propios de PROD.
5. Ejecutar smoke test y QA sobre PROD con datos controlados, sin importar fixtures DEMO como datos reales.
6. Activar inicialmente el alcance acordado para Dirección/Belén.
7. Mantener rollback inmediato al release anterior.
8. Solo después del arranque real registrar fricción y priorizar mejoras derivadas del uso.

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
Este documento deja preparado el procedimiento; no declara que PROD exista ni autoriza su activación. La promoción real sigue pendiente de una orden explícita y de la creación/verificación del entorno PROD separado.
