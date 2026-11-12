# CEREBRO OS · Gateway v35 · Respuestas naturales prioritarias
**Fecha:** 12 noviembre 2026 · **Estado:** HECHO EN BACKEND · PRUEBA FÍSICA DE PROPIETARIO PENDIENTE

## Objetivo y resultado
Se prioriza que CEREBRO **responda con sentido** antes de invertir en mejoras visuales o en la voz aprobada de JARVIS. El backlog de interfaz queda aplazado en `docs/cerebro/OPERATIVA_UX_BACKLOG_POST_RESPUESTAS_20261112.md`.

**Servicio real:** Supabase `cluhljgonannaafpmblx`, Edge Function `cerebro-console-gateway-v0` **v35 ACTIVE**. Se mantiene el contrato y la URL del chat existente.

### Alcance estrictamente implementado
- Responder preguntas naturales sobre **qué información puede consultar**: distinguir App Fénix vía consultas específicas, programación social si disponible, documentación Notion y contexto acotado; sin afirmar acceso libre a Internet.
- Explicar **qué puede hacer y qué no**, sin fingir ejecución autónoma, pagos ni cambios de App/CRM.
- Recordar la **pregunta anterior** con los diez turnos de contexto proporcionados por el cliente; resúmenes extractivos muy limitados (no LLM).
- Entender **Concentración / Emergencia / Máximo** como **solicitudes recibidas, no ajustes aplicados**; no modificar el runtime real.
- Proponer planificación nocturna **sin ejecutar nada** cuando se solicite explícitamente.
- Aclarar ámbito de empresa Fénix y evitar atribuir acceso a AION/CAPTACASA.
- Responder a **cuántos trabajos avanzan/esperan, nombres, cola más antigua, último terminado, fallos visibles** leyendo una sola vez el `cerebro-console-activity-v0` con el **mismo JWT de propietario y clave pública** que ya utiliza la App; GET read-only, mismo repositorio y tenant Fénix, sello de tiempo menor de 20 minutos. No inventar causas de cola ni decisiones humanas.

### Lo que NO es
- **No es todavía una IA general ni un LLM**. El contrato conserva `direct_model_access:false`. Preguntas abiertas fuera del conocimiento documental o de los nuevos intents pueden seguir sin obtener una respuesta completa. Para lograr conversación realmente abierta hace falta un Model Router gobernado con proveedor/modelo de coste verificado **0 €**, seguridad, evaluación, cuota y rollback. No habilitar pagos o rutas públicas por iniciativa de un parche conversacional.
- No se ha modificado la voz genérica del navegador ni conectado JARVIS V2.
- No se han modificado App, CRM, SQL, DNS, Trading, WordPress ni frontend.

## Evidencia, seguridad y QA
- Gateway original v34 respaldado **byte a byte**: `cerebro/rollback/gateway-v34-20261112/index.ts` y `knowledge.ts`.
- Versión nueva: `cerebro/ops/gateway-v35-conversation/` con `index.ts`, `knowledge.ts` sin cambios y sidecars `conversation_intents.ts` y `activity_reader.ts`.
- Regresión Node 24: Actions `43268859200` **SUCCESS**. Contratos exactos v34 vs v35: el índice solo añadió los imports y dos hooks de respuesta, sin alterar `authorizedOwner` ni confirmaciones.
- Función paralela `cerebro-console-gateway-v35-lab`: v1 candidato, rollback físico a v34 en v2 y retorno a candidato v3; comprobados ambos códigos con Supabase, estado ACTIVE.
- Promoción controlada Gateway original a **v35 ACTIVE**. `verify_jwt=false` preservado porque ya era así; el código mantiene `withSupabase({auth:"user"})` y `authorizedOwner`. Ninguna función publica respuestas a anónimos por diseño.
- No se han instalado servicios de pago ni añadido suscripciones; coste adicional contratado 0 €.

## Pruebas pendientes
- Probar con JWT propietario desde la sesión real de Opera: «¿Puedes consultar información real o solo responder con información previamente guardada?», «¿Qué funciones tienes operativas?», «¿Cuál fue mi pregunta anterior?» y «¿Cuántos trabajos hay ahora en ejecución?».
- Verificar desde Opera que la respuesta actual incluye fuente, hora y límites y que un token sin permisos recibe 403.
- Controlar latencia del GET interno al servicio de actividad y si aparecen tiempos de espera. No afirmar éxito E2E físico sin esa evidencia.
- Probar después un router IA gratuito en LAB, separado del contrato de ejecución, antes de plantear conversación natural verdaderamente general.

## Rollback
Desplegar el índice y conocimiento respaldados exactamente como `cerebro-console-gateway-v0`, con `verify_jwt=false` preservado, comprobar `authorizedOwner`, `health` propietario y respuesta de chat. No tocar la App ni el alias Vercel.
