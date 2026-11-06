# CEREBRO OS · JARVIS · DEEPSEEK EXIT + VOICE-001 REUSE CONTRACT
**Fecha:** 2026-11-06 · **Estado:** DEFINIDO / POR AUDITAR · **NO DEPLOY / NO COSTES NUEVOS**

## 1. Decisiones del propietario registradas
- **Objetivo final obligatorio:** JARVIS debe funcionar sin una dependencia permanente de la **API de DeepSeek**. Los 50 € de saldo que el usuario declara disponibles son un *presupuesto temporal opcional*, no un compromiso de consumo. Ningún proceso de autorrecarga, suscripción o inferencia indefinida queda autorizado.
- **Primera prioridad efectiva:** identidad del propietario en Cloudflare Access → sesión B2 → permiso B3 de consulta → Gateway JARVIS LAB cloud protegido → dos dispositivos → B10/rollback → promoción gradual a operaciones reales.
- **VOICE-001 se integra CUANDO CORRESPONDA**, tras B2/B3/Gateway autorizados. No reiniciar clonación ni reemplazar la voz existente, y nunca modificar ANA de las pantallas ordinarias de App Fénix.
- La App Fénix PREPROD está cancelada. LAB es aislamiento de pruebas; PREPROD es gate de evaluación de motores, sin otra App; PROD es el servicio real aprobado. No confundir CI verde con funcionalidad instalada.

## 2. Voz: hechos documentados en Drive, PR independiente
**EXISTENTE / PARCIAL** en carpeta Drive [VOICE-001 · JARVIS 1 · MASTER Y BACKUP](https://drive.google.com/drive/folders/1h-I5hElE9LSiZBz0yyhTmCmWHoO9gUOh):
- Voz aprobada **JARVIS 1 V2 «Más clara»**, velocidad **1,10×**, ajuste de tono **+0,6 semitonos**, conservando V1 maestra; dos muestras MP3 de aproximadamente 14,4 y 29,52 segundos y presets/manifiestos.
- Clon de síntesis guardado en proveedor externo **vidIQ**, `voice_id=cfkJwJs7cjrVgVLm3yvM`; guardar audios/identificador NO equivale a tener el modelo exportado ni los pesos de voz.
- La **PR #24 DRAFT**, rama `cerebro/jarvis-b10-voice-interface-lab-v0-20261105`, conserva la política por interfaz: CEREBRO (Jarvis, Operativa, Neuronal, Navegador y Console V0) debe usar JARVIS V2 cuando esté autorizado; **ANA** permanece en superficies de App Fénix fuera de CEREBRO. Fall-back de navegador `es-ES` está preparado en LAB, pero **no equivale al clon**.
- Existe salida de audio LAB en PR #24 y rutas candidatas `POST /voice/v2/synthesize` y `POST /voice/v2/audio`; no montadas ni verificadas con el clon en un Gateway remoto. Evitar copiar/reescribir ese trabajo en PR #25.
- **Límite real:** Cloudflare puede hospedar la UI, Workers, audios privados autorizados y (si se elige) un TTS/STT alternativo, **pero no puede reproducir automáticamente la identidad del clon de vidIQ si no se obtiene exportación compatible o contrato/API de síntesis con licencia y condiciones confirmadas**. No sustituir sin permiso la voz aprobada por una voz genérica.
- Deben verificarse derechos/licencia del intérprete y permiso para alojar/procesar sus grabaciones en Cloudflare y cualquier proveedor; jurisdicción EU de D1 no implica que todo el audio/LLM se procese en UE.

**FUENTES Drive (no editadas):**
- [Política por superficies](https://drive.google.com/file/d/1xd7hHVMWRdkNs0h1Z94wJVlZ4i1AMt0g/view)
- [Estado voz CUT02](https://drive.google.com/file/d/1VbRJj5RDFAaHhteEYzVORnjHJryqgIVC/view)
- [Continuidad, permisos y voz temporal](https://drive.google.com/file/d/1nyXapCA8NngE6ZoK6EO5u9hJl4l4e7sc/view)
- [Backup y rollback VOICE-001](https://drive.google.com/file/d/1NVhuL7aA9qLXXGSKzFnfeeNq0Ic07BuK/view)

## 3. Fase futura de diálogo y salida de DeepSeek
**DEFINIDO, NO ACTIVADO:**
1. Modelo Router B5 existente — NO crear un runtime paralelo: elegir por tarea entre reglas/SQL, inferencia gratuita local/Cloudflare, y **DeepSeek solo cuando aporte mejora medible** dentro de presupuesto.
2. Conocimiento propio CEREBRO separado de modelo/servicio; almacenar fuentes, procedencia, consentimiento, caducidad, versión, `company_id`, `engine_id`, `environment`; evaluaciones y correcciones antes de promover. Sin meter logs pesados ni audio bruto en Supabase transaccional.
3. Aprendizaje evaluado y finito: **propuesta → crítica si merece el coste → árbitro/test automático → tribunal → conocimiento aprobado**. Prohibidas conversaciones de IA infinitas o «aprender» directamente de respuestas no verificadas.
4. Puntos de medición: comprensión de español natural y dictado, continuidad conversacional multisesión, latencia, calidad, seguridad, coste por interacción, recuperación y no filtración de datos.
5. **Desactivación de DeepSeek:** construir un candidato alternativo **que NO use la API DeepSeek** (p. ej. modelo abierto servido por Cloudflare Workers AI u otra infraestructura cloud ya disponible), comparar el mismo conjunto de tareas y casos reales anonimizados con los requisitos de seguridad. No promover hasta superar los gates de calidad, coste, privacidad y rollback. La voz y la memoria NO crean por sí solas capacidades de razonamiento equivalentes a un LLM.
6. Solo entonces deshabilitar por defecto el adaptador DeepSeek en el Router, comprobar error/fallback y 7 días de observabilidad, retirar el token activo **sin borrar historial, conocimientos ni artefactos**. Eliminar la dependencia contractual/operativa, no un proveedor a costa de perder capacidades. Infraestructura cloud alternativa puede seguir teniendo coste de inferencia.
7. Control de gasto DeepSeek mientras exista: coste acumulado máximo autorizado **50 €** incluyendo conversiones/cargos, **sin recarga automática**, alerta preventiva, fail closed al alcanzar el límite o no poder verificar el saldo. Ningún pago nuevo ni llamada API en este corte.

## 4. Órdenes y dependencias, no duplicar labor
**PR #25 DRAFT:** identidad, D1 europea, Gateway, Access canary LAB, B2/B3 y seguridad.
**PR #24 DRAFT:** voz y superficies existentes; preservar V1/V2, audios, fallback, fuentes y manuales sin fusionar automáticamente.
**D1 europea:** `cerebro-jarvis-lab-eu` UUID `988b11e1-21aa-4cf9-8b9d-110319df7ccc`, CUT29 esquema vacío restaurado independientemente; no datos reales.
**NEXT:** completar Cloudflare Zero Trust Free (pantalla de elección de plan pendiente), Access aislado **solo para el nuevo Worker**, verificación física del usuario, B2/B3 + Vault. Voice-001 se conecta tras los gates de identidad y permiso; DeepSeek se sustituye después de pruebas comparativas.
**Coste actual de esta decisión:** 0 €; sin despliegue ni cambios App/CRM/PROD/main/ANA/Trading/DNS/Supabase/Workers antiguos.

## 5. Criterios de aceptación / HUMAN_REQUIRED
- Access Free activado sin cambiar políticas de otros Workers, autenticación real del propietario probada, denegación a extraños, worker OFF/rollback.
- Voz con fuente autorizada, muestras aprobadas y acceso entre dispositivos, STT/TTS funcional, latencia aceptable, prueba de interrupción, fallback y no reemplazar ANA.
- DeepSeek OFF solo si otro motor puede razonar con calidad demostrable y límites económicos suficientes.
- Escalar solo LEGAL_REQUIRED, SIGNATURE_REQUIRED, LOW_CONFIDENCE, HIGH_RISK, POLICY_CONFLICT, SECURITY_INCIDENT, MONEY_LIMIT o CUSTOMER_HUMAN_REQUEST.

**Rollback:** código/documentación nuevo vive exclusivamente en PR #25 DRAFT; PR #24 y Drive fuente se conservan.
