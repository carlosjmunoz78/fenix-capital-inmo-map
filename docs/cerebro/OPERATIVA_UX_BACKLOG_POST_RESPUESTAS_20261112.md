# CEREBRO OS · Operativa · Mejoras de interfaz reservadas para después
**Fecha:** 12-11-2026 · **Estado:** PLANIFICADO · NO desplegar todavía

## Prioridad inmediata, antes de UX
**P0: que CEREBRO responda con sentido** a preguntas en lenguaje natural, mantenga contexto, diferencie datos en vivo/documentos, confirme acciones reales y no conteste "No te he entendido" a consultas claras. Esta prioridad la ha fijado expresamente el propietario. **No confundir con instalar la voz definitiva ni con dictado.** La voz de navegador sigue provisional; JARVIS V2 NO conectada.

## Backlog de UX aplazado
1. **P0 después de respuestas:** conversación como centro de la consola; impedir que las cinco pestañas inferiores o el menú flotante tapen mensajes; reservar zona segura y poder maximizar el chat. Validar desktop, ventana estrecha y móvil.
2. **P0 después de respuestas:** botones Concentración, Esta noche, Emergencia y Suave/Normal/Alto/Máximo con contrato y 3 estados observables: SOLICITADO, APLICADO, RECHAZADO. No afirmar "aplicado" sin evidencia backend. Mantener protección y coste 0€.
3. **P1:** panel de trabajo con filtros empresa/motor/estado/prioridad/antigüedad, avisos de colas prolongadas, último paso y enlace al resultado; no inventar progreso.
4. **P1:** transformar "Para ti" en bandeja de decisiones verificadas: motivo, impacto, coste, riesgo, autorizaciones, aprobar/rechazar si existe acción realmente permitida.
5. **P1:** historial persistente entre sesiones/dispositivos con autorización propietaria y borrado seguro, sin guardar datos sensibles sin base legal.
6. **P1:** semáforo separado para chat, Gateway, GitHub/actividad y motores, con hora real de última observación.
7. **P1:** dictado STT y lectura TTS navegador con indicadores escucha/silencio, permisos y prueba física Opera; no implementar JARVIS V2 hasta superagente posterior.
8. **P1:** multiempresa real con permisos tenant `company_id`, aislamiento Fénix/AION/CAPTACASA, sin habilitar selector de empresas que aún no admite backend.
9. **P1:** trazabilidad de cada orden, ID, estado, resultado, fecha y evidencia, con selector `engine_id`, `environment`, `version`.

## Gates no negociables para la futura ejecución
Conservar → entender → envolver → probar → mejorar → migrar. Inventario, dependencias, snapshot y contrato; rama LAB, pruebas Playwright y de seguridad, producción actual como base, PREPROD paralelo sin modificar App/CRM, comparación OLD/NEW, rollback, Vercel promoción controlada y prueba de Opera. Sin suscripciones ni IA de pago. Nunca alterar JARVIS V2, DNS, Trading, CRM o App ajenas al cambio.

## Criterio de cierre de P0 conversacional
- No devolver fallback genérico si existe una intención clara y autorizada.
- Distinguir consulta documental, consulta actual verificada, simulación, propuesta y ejecución con su resultado.
- Preguntas de ejemplo: "¿Puedes consultar información real o solo datos guardados?", "¿Qué funciones tienes operativas?", "¿Cuál fue mi pregunta anterior?", "¿Qué significa Concentración?", "Prepara el trabajo de esta noche sin ejecutar", "No puedes modificar producción sin autorización, ¿verdad?".
- Respuestas verificables, contexto limitado, no prometer ejecución, fuentes cuando estén disponibles; tests negativos para impedir alucinaciones y eludir permisos.
- Modelo IA opcional solo vía router gobernado, con cuota gratis y coste demostrable 0€, pruebas de privacidad y de políticas. No confundir más reglas con inteligencia general.
