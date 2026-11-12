# CEREBRO OS · Operativa · cierre de publicación · 12-11-2026

## Estado físico y fuentes de verdad
- Interfaz real: `https://app.fenixcapital.es/cerebro?section=operativa`
- Vercel project ID: `prj_4ElVl8e2KzrHS7r5yvBGBban1DXV` (nombre heredado `fenix-capital-preprod`, **dominio real PROD**).
- Alias de dominio verificado: `app.fenixcapital.es` → `dpl_7UN5uQemxyjndWdRwWyeBu2WfYr5`.
- Source SHA del despliegue activo: `bb9aed7ffa3dd9a6f8d38670ebb3eaee514b2542` en `release/cerebro-operativa-vercel-targeted-20261112`.
- QA del source activo: GitHub Actions run `43240647964`, PASS (contrato, browser sintético, regresiones).
- El Gateway `cerebro-console-gateway-v0` permanece existente; el compositor Operativa apunta al Gateway con JWT autenticado, no directamente a modelos. Sin voz clonada.
- `cerebro-console-activity-v0` Supabase PROD (`cluhljgonannaafpmblx`) versión **6 ACTIVE**, `verify_jwt=true`, registro actualizado a las `2026-11-12T15:13:56.815Z`.
- Actividad: se observaron HTTP 503 intermitentes y GET 200 a las 15:10-15:13 UTC. **Pendiente medir estabilidad posterior al despliegue v6.**
- GitHub Pages `gh-pages` fue restaurado al commit `879df50e64ecb280c9f1cbedf2fbbdcee027cc7f`; no es el hosting del dominio.

## Cambios permitidos
- Operativa: nuevo envío mediante React y Gateway propietario, respuestas en el propio panel, Historial visible, controles accesibles, voz STT/TTS genérica del navegador, tabs inferiores en Opera/escritorio/móvil.
- La selección de AION y CAPTACASA se mantiene **bloqueada**, puesto que no hay validación de tenant efectiva desde servidor para esas empresas. Sólo Fénix.
- Los archivos adjuntos no se anuncian como funcionales; quedan deshabilitados.
- Voz JARVIS V2 aprobada NO conectada (decisión expresa del propietario).
- No se ha editado código de Expedientes, CRM, JARVIS original, Trading, DNS ni rama main.

## Operativa Backend · estabilización
- Versión 4 respaldada de forma exacta en `cerebro/rollback/operativa-activity-v4-20261112/index.ts`.
- Versión 5 respaldada de forma exacta en `cerebro/rollback/operativa-activity-v5-20261112/index.ts`.
- Versión 6 incluye exclusivamente reducción del ritmo de llamadas, límite de detalle y preservación de fecha real del caché.
- Políticas: con GITHUB_TOKEN presente TTL 90 s / máx. 4 consultas de detalle; sin token TTL 600 s / sin consultas detalladas; 1 página de activos por estado; el total físico procede de `total_count`.
- Se mantienen `withSupabase({auth:"user"})`, `authorizedOwner`, CORS y denegación de escrituras.
- Contrato Node, reconstrucción exacta de backups v4→v5→v6 y chequeo de sintaxis: GitHub Actions `43245436969` SUCCESS.
- No se han contratado servicios nuevos ni modificado límites económicos.

## Recuperación
- Rollback de backend: desplegar exactamente el archivo v5 o v4 indicado arriba como `cerebro-console-activity-v0` con `verify_jwt=true`; verificar lectura autenticada y CORS.
- Rollback de frontend: Vercel `request_rollback` al despliegue anterior `dpl_37gd5X8DN23HaC7QouVbFvKN5y2e`, siempre tras comprobar que el alias no ha sido cambiado por otro actor.
- NO promover el artefacto alternativo `dpl_HQhfFfjDuBJZZABUA5J9XaUr4n9W`, que era un candidato sin dominio; la versión activa tiene mejoras de CSS adicionales.

## Evidencia pendiente / HUMAN_REQUIRED sólo si procede
- Opera Browser Connector no responde (timeout): falta realizar prueba física de pulsar/enviar un mensaje y conceder permiso de micrófono, escuchar TTS y volver a dictar.
- Faltan persistencia interdispositivo de historial, permisos tenant desde backend y funcionalidad de adjuntos. No presentar como operativos.
- Verificar GET 200 de actividad tras la versión 6 y monitorizar 503/429 de GitHub en un intervalo posterior; si hay nuevas incidencias, diagnosticar el ratio y autorización de GitHub sin revelar tokens.
