# CEREBRO OS · Gateway v36 · seguimiento de conversación y respuestas útiles
**Fecha:** 2026-11-12 · **Estado:** HECHO BACKEND / PENDIENTE E2E EN OPERA

## Problema acreditado por la prueba del propietario
1. Ante «¿Cuál fue mi pregunta anterior?» el Gateway inicialmente informó de que no tenía contexto y luego recordó una pregunta cuando sí recibió turnos previos. El frontend envía solo los 10 últimos turnos **en memoria del componente**, por lo que puede perder contexto tras recarga o nueva sesión. No se ha reparado persistencia intersesión ni creado almacenamiento de mensajes sensibles.
2. «¿Puedes explicarme tu respuesta anterior de una forma más sencilla?» devolvía el fallback genérico. La expresión determinista v35 reconocía «Explícame lo anterior», pero no «puedes explicarme tu respuesta anterior».
3. «¿Qué puedes hacer por mí ahora mismo que sea útil para Fénix Capital?» devolvía una lista de limitaciones, no acciones concretas.
4. La respuesta de trabajos mostraba gramática «1 ejecuciones en curso».

## Solución v36
- Archivo `conversation_intents.ts`: reconoce preguntas de seguimiento naturales con variantes «puedes explicarme», «resumir mi respuesta anterior» y otras, utilizando la última respuesta realmente transmitida por el cliente, sin reconstruir hechos inexistentes.
- Para solicitudes de utilidad comercial de Fénix, propone cuatro consultas permitidas y verificables: expedientes activos, directorio de inmobiliarias por localidad, trabajos GitHub con fecha y próxima publicación social si fuente disponible. No ejecuta tareas al ofrecer esas alternativas.
- Si falta contexto, explica el límite de la sesión sin afirmar que tenga memoria persistente.
- Archivo `activity_reader.ts`: singular/plural correcto para trabajos en ejecución/cola y marcado de resultados **visibles**.
- `index.ts` y `knowledge.ts` **idénticos byte a byte** a v35. No se alteran autorización, rutas de acción, credenciales, base de datos, App/CRM, voz genérica ni voz aprobada de JARVIS.

## Evidencia
- GitHub Actions [43272303185](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/43272303185): SUCCESS. Pruebas con las frases exactas observadas, múltiples variaciones, contexto ausente, solicitudes peligrosas no interceptadas, cálculo gramatical y seguridad owner-only.
- Backend PROD `cluhljgonannaafpmblx` / función `cerebro-console-gateway-v0` v36 ACTIVE. Fuente de los 4 archivos comprobada contra la rama `fix/cerebro-operativa-followups-v36-20261112`.
- Copia exacta de v35: `cerebro/rollback/gateway-v35-20261112/{index.ts,knowledge.ts,conversation_intents.ts,activity_reader.ts}`.
- Prueba de rollback en LAB independiente `cerebro-console-gateway-v36-followups-lab`: candidata v1, restauración exacta v35 (v2), candidata v36 restaurada y comprobada (v3).
- Config de autorización original preservada: `verify_jwt=false`, porque el control real de propietario se efectúa por código (`withSupabase({auth:"user"})` y `authorizedOwner`); no dar la función por pública/anónima a partir de ese flag.
- Sin contratación adicional ni cambios en la cuota de modelos; `direct_model_access=false`.

## E2E pendiente
- Probar tras actualización en Opera: «¿Puedes explicarme tu respuesta anterior de una forma más sencilla?» y «¿Qué puedes hacer por mí ahora mismo que sea útil para Fénix Capital?».
- Validar un mensaje anterior tras una recarga. **La persistencia entre recargas no está implementada y no debe prometerse.** Considerar solución con autorización y protección de datos como proyecto separado.
- No se ha convertido el Gateway en un LLM libre; las preguntas fuera del contrato/knowledge pueden seguir devolviendo fallback.

## Rollback PROD
Desplegar exactamente los cuatro archivos de `cerebro/rollback/gateway-v35-20261112/` sobre `cerebro-console-gateway-v0` con la misma configuración de autenticación, verificar versión nueva ACTIVE, owner-only y rutas `/health` y `/chat`. La actualización de Operativa Vercel y los datos de actividad no requieren modificación para rollback.
