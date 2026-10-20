# CEREBRO OPERATIVA · P0 voz, historial y diagnóstico de procesos

Fecha: 2026-10-20
Estado: PREPROD CANDIDATE · NO PROD

## Objetivo
Cerrar, en este orden, tres incidencias/usabilidades observadas físicamente en CEREBRO OPERATIVA sin reescribir Gateway ni tocar PROD directamente.

## 1. Voz: primeras palabras audibles

Problema observado: el texto de respuesta era completo, pero el audio podía empezar por la tercera o cuarta palabra.

Cambio mínimo:
- se conserva Web Speech/TTS actual;
- se añade `SPEECH_AUDIO_LEAD_IN_MS=320` tras preparar la ruta de audio/VAD y antes del primer `speechSynthesis.speak`;
- el temporizador se cancela en finish, pause, end, discard y unmount;
- se añade regresión `tests/cerebro-voice-audio-leadin.spec.ts`.

Aceptación pendiente: prueba física con varias respuestas reales. No se declara cerrado solo por CI.

## 2. Historial de conversaciones

Se añade un drawer lateral colapsable estilo historial de chat con:
- nueva conversación;
- selección/reanudación de conversaciones anteriores;
- nombre automático por primera intervención del usuario;
- edición manual del nombre;
- persistencia local en el navegador;
- hasta 50 conversaciones y 80 líneas por conversación.

Persistencia V1: LOCAL por dispositivo mediante `localStorage`, coste adicional 0 € y sin ampliar carga de Supabase. No se presenta como sincronización multi-dispositivo.

No cambia el contrato de Gateway. Al cambiar de conversación se limpian acciones pendientes/contextos transitorios para evitar ejecutar una confirmación heredada desde otro hilo.

## 3. Diagnóstico de procesos

El inspector pasa de texto genérico a información operativa:
- propósito más legible para workflows conocidos;
- run ID, entorno, resultado y versión observada;
- inicio;
- finalización;
- duración;
- estado actual/siguiente/ETA cuando está en curso;
- si falla: resumen real, job afectado, paso afectado y pasos con conclusión no satisfactoria;
- enlace a evidencia completa.

`cerebro-console-activity-v0` conserva el listado existente y añade una lectura bajo demanda `?run_id=`. Solo cuando el usuario abre un proceso se consultan run + jobs de GitHub. Si la causa no puede demostrarse, la interfaz lo indica y no la inventa.

## Seguridad y compatibilidad

- PROD: NO TOCADO.
- Gateway conversacional: NO REESCRITO.
- Trading: NO TOCADO.
- Sin migración de base de datos.
- Sin nueva suscripción.
- El historial local degrada de forma segura si storage no está disponible.
- El detalle de proceso degrada de forma segura si la función todavía no ha sido desplegada: conserva resumen + enlace de evidencia.

## Rollback

Revertir los commits de este candidato. No requiere rollback de datos ni migraciones.

## Gates antes de promoción

1. Build y tests automáticos verdes.
2. Comparación OLD vs NEW en PREPROD/candidate.
3. Prueba física de primeras palabras TTS.
4. Prueba crear/renombrar/cambiar/refrescar conversación.
5. Prueba de inspector con al menos un run OK y, si existe disponible, uno no OK.
6. Solo después valorar promoción gobernada.
