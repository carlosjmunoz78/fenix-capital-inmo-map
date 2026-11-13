# Operativa V4 · STOP Voice y catálogo maestro de 179 motores

## Estado y límites (13/11/2026)
- Rama de laboratorio: `cerebro/operativa-stop-and-engine-catalog-20261113`, base física App PROD `29dbcc47ae016ee6c86ca018326ffe77b9acbbcc`.
- Catálogo descriptivo derivado de especificación maestra de 07/09/2026 (177 motores), más extensión V1.1 de 10/10/2026 (2 motores); no es medición live.
- Algunos motores incluyen `historical_status=OPERATIVO` como cita histórica del documento V2: **no indica que estén operativos hoy**.
- 179 IDs válidos. Para LAB-TRD/SEO/MKT/AI/AUT se recuperaron las descripciones exactas de la base maestra. HCI-001 y MOTION-001 siguen sin una ficha funcional completa en el documento V2 y deben revisarse en sus contratos posteriores.
- Estado real consultado: owner-universe LAB, GitHub Activities, binding map; las cifras de fuentes distintas no se suman. El catálogo nunca concede autorización de ejecución.
- Voz: botón visible «Parar voz ahora» durante conversación o playback manual, Escape, interceptación de «para» cuando el reconocedor escucha. Mientras TTS habla se prueba un segundo reconocimiento de interrupciones, sin enviar órdenes. **Esta última función requiere aceptación física en Chrome; puede ser incompatible con algunos dispositivos o proveedores.**
- Si falla el barge-in, el botón/Escape siempre deben cancelar `speechSynthesis` y cerrar la sesión de escucha.
- La voz natural, streaming y control universal de motores se consideran **PENDIENTES**. Este cambio no crea un router universal ni nuevas credenciales.

## OLD vs NEW
OLD: V3 con voz no interrumpible por comando, botón de finalización de sesión, lista parcial FACT/Gateway/actividad.
NEW: STOP accesible, interceptación de voz, catálogo 179 con búsquedas y fichas, fuentes actuales separadas de diseño histórico.

## QA y seguridad
1. Run de GitHub Actions con tests de contratos, build y Chromium.
2. PREVIEW Vercel sin alias PROD ni routes públicas adicionales.
3. Validación autenticada de escritorio, móvil y STOP físico antes de dar «parar por voz» como aceptado.
4. No crear acceso a motor, actor, tenant ni credencial a partir del selector.
5. No desplegar migraciones backend. No tocar WordPress, App/CRM internos, Supabase ni trading.

## Rollback
Deployment anterior `dpl_GJkH4EXFgf5pNVqVqd1oLrq1M27B`, SHA `29dbcc47ae016ee6c86ca018326ffe77b9acbbcc`. El PR de V4 puede descartarse sin modificar producción. Si se promoviera más adelante y fallara, request_rollback al deployment anterior y comprobar la ruta owner.

## Changelog
- V4.0 LAB: catálogo maestro histórico, fichas documentadas, filtro y buscador; botón de stop, voz/escape y detección de «para».
- Sin nuevos costes, permisos, rutas a sistemas críticos ni cambios de runtime del Gateway.
