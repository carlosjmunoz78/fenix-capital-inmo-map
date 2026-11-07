# VOICE-001 · JARVIS V2 · VOZ PROPIA Y UNIVERSAL · CONTRATO DEL PROPIETARIO
**Fecha:** 2026-11-06 · **Estado:** REQUISITO APROBADO / IMPLEMENTACIÓN POR AUDITAR · **NO DEPLOY / PROD NO-GO**

## Decisión irrevocable hasta nuevo mandato del propietario
1. La identidad vocal **única de JARVIS** debe ser la V2 aprobada **«Más clara»**, basada en JARVIS 1 V2, con referencia conocida 1,10× y +0,6 semitonos. **V1 es el respaldo** y se conservarán los originales y audios autorizados en Drive. No confundir el nombre de identidad `JARVIS` con un proveedor TTS.
2. Su voz sonará **siempre que JARVIS responda por audio**, sin importar empresa ni interfaz: CEREBRO Console, chat/voz web, escritorio, móvil, tablet, paneles, supervisión y futuras superficies. La regla de voz depende de `surface`, no exclusivamente de `company_id`.
3. La **App Fénix Capital ordinaria sigue con ANA**. ANA es otro motor vocal y se desarrollará después, separado. En las vistas CEREBRO embebidas dentro de la App, la política JARVIS V2 se mantiene **solo si la superficie se identifica inequívocamente como CEREBRO**. En toda otra superficie de App, ANA; nunca sustituir sus rutas ni síntesis existente automáticamente.
4. **NO contratación de TTS de pago por frase, carácter o llamada** como dependencia permanente de la voz JARVIS. Se construirá un sintetizador con **pesos abiertos desplegables por CEREBRO**, perfil de hablante propio autorizado, caché de audio y coste de infraestructura medido. No depender de tokens de vidIQ/otro SaaS para hablar.
5. El uso de infraestructura de cómputo en la nube puede tener **coste por tiempo de CPU/GPU o inferencia**; no presentar «voz propia» como «cómputo ilimitado gratuito». Para cumplir la condición económica se requiere medir la carga real y demostrar presupuesto predecible; no activar cargos variables sin control.
6. El objetivo final de eliminar la dependencia DeepSeek se aplica al **razonamiento**, separado del **TTS** y **ASR**. Una voz propia no convierte el modelo de razonamiento en propio ni concede permisos adicionales.

## Inventario REAL ya existente
- Drive carpeta VOICE-001 MASTER Y BACKUP: https://drive.google.com/drive/folders/1h-I5hElE9LSiZBz0yyhTmCmWHoO9gUOh
- PR #24 DRAFT `cerebro/jarvis-b10-voice-interface-lab-v0-20261105` contiene policy por superficies, ejemplos, fallback navegador español `es-ES`, puerto de audio y rutas LAB candidatas. Conservar.
- Voz aprobada V2 «Más clara» con dos MP3 de referencia; V1 maestra preservada.
- El clon dinámico se encuentra en vidIQ, id `cfkJwJs7cjrVgVLm3yvM`. **No se han obtenido sus pesos ni exportación; no asumir que el modelo existe fuera del proveedor.**
- Ningún sintetizador propio clonado y certificado está todavía alojado en Cloudflare.

## Rutas técnicas candidatas a evaluar, NO seleccionadas ni desplegadas
| Opción | Condición |
|---|---|
| **Chatterbox Multilingual / es-ES** (Resemble AI) | Modelo de pesos abiertos con licencia MIT indicada en su modelo base; verificar licencia exacta de la variante es-ES y derechos de la muestra. Comparar similitud con V2, entonación, interrupción y latencia |
| **Qwen3-TTS Base** | Clonación a partir de muestra autorizada, español soportado; revisar licencia de los pesos usados, GPU y costes |
| Servicio propio TTS en runtime cloud ya contratado | Solo si soporta el modelo aprobado sin tarifas por frase ni cuotas injustificadas. Cloudflare Workers estándar como Gateway/UI; **no asumir que Workers AI aloja automáticamente pesos custom**. Evaluar backend GPU/CPU compartido compatible |
| **Fallback voz de navegador es-ES** | Sin cuota TTS por frase, pero **no equivale a JARVIS V2**. Usar únicamente para continuidad temporal con aviso, nunca afirmar identidad vocal idéntica |

No utilizar F5-TTS/XTTS v2 con pesos no comerciales para explotación comercial sin una licencia apropiada. Verificar licencia del motor **y** de sus pesos, derechos del intérprete, consentimiento, almacenamiento y procesamiento jurisdiccional.

## Gates de aceptación de VOICE-001
1. Inventario de audio aprobado con original intacto, checksum, derechos del intérprete y autorización para clonación y procesamiento cloud.
2. Prototipo aislado con dos o más modelos de pesos utilizables comercialmente, sin subir los audios privados a servicios públicos no autorizados; comparación objetiva con la voz V2 «Más clara» y aprobación de identidad vocal por el propietario.
3. Almacenamiento cifrado de referencias/adaptadores, autorización por superficie, `company_id`, `engine_id=VOICE-001`, `environment`, `version`; cache con TTL y borrado controlado, sin logs de audio bruto.
4. Perfil JARVIS V2 único para **todas las superficies de CEREBRO** y prueba de excepción ANA App; prueba E2E móvil/PC/tablet, micrófono, STT, TTS, latencia, reproducción, interrupción y sesiones.
5. FinOps: no cargo por frase ni API de clon TTS, medición de CPU/GPU/red/almacenamiento y límite mensual; demostrar que la operación no depende de PC del propietario encendido. Si surge dinero variable, MONEY_LIMIT antes de activar.
6. Tests de seguridad, evaluación independiente B10, observabilidad, backup/rebuild y rollback; desplegar gradual **sin modificar ni reemplazar ANA**.

## Orden en proyecto
**AHORA:** Cloudflare Zero Trust Free → Access solo JARVIS → identidad real OWNER_ROOT → B2/B3/Gateway autónomo seguro → dos dispositivos → B10.
**DESPUÉS:** auditar PR #24 y reutilizarla, elegir y aprobar motor TTS propio con voz V2, integrar STT/TTS en el Gateway y superficie universal CEREBRO, comprobar fallback. Solo a continuación optimizar conversación/aprendizaje y sustituir DeepSeek por modelo probado.
**No cambiar main, App/CRM PROD, ANA, DNS, Supabase, Trading, ni los Workers existentes por este registro.**

Fuentes técnicas candidatas:
- https://github.com/resemble-ai/chatterbox
- https://huggingface.co/ResembleAI/Chatterbox-Multilingual-es-es
- https://github.com/QwenLM/Qwen3-TTS

**Rollback:** retirar únicamente este contrato documental de la PR #25 DRAFT; PR #24, Drive, audio V1/V2 y sistemas reales intactos.
