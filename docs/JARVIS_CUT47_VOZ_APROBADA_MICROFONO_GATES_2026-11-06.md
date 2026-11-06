# JARVIS · CUT47 · Voz V2 aprobada, verificación local de micrófono y gates de despliegue
Fecha: 2026-11-06. Entorno: LAB. Estado: CANDIDATE_ONLY / NO-GO PROD.

## Contexto, fuentes y reutilización
El propietario quiere JARVIS operativo en JARVIS, Operativa, Neuronal, Navegador y V0 con lenguaje ejecutivo, dictado y voz natural. NO se debe recrear o borrar la voz original.

Fuentes confirmadas por lectura autorizada:
- Google Drive, carpeta `VOICE-001 · JARVIS 1 · MASTER Y BACKUP`, `JARVIS1_V2_APROBADA_GATE_FULL_2026-11-05.json`: preset **Más clara**, velocidad **1,10×**, ajuste de tono **+0,6 semitonos**, aprobación de preset pero **NO autorización de producción/pago**.
- `VOICE001_JARVIS1_VOICE_SURFACE_POLICY_2026-11-04.md`: JARVIS para interfaces CEREBRO de cualquier `company_id`; ANA solamente para pantallas estándar de App Fénix; desconocidas DENY.
- `ZEUS_JARVIS_ESTADO_Y_CONTINUIDAD_B5_VOZ_2026-11-05.md`: política de enrutamiento existente en PR #24 (rama `cerebro/jarvis-b10-voice-interface-lab-v0-20261105`), sintetizador dinámico NO integrado.
- vidIQ conectado: voz personalizada `JARVIS 1 - Victor Iturrioz - LAB candidato` encontrada mediante **listado gratis** de voces, sin generar audio. Conservar la voz V1 y otras voces; no reclonar.
- `VOICE001_JARVIS1_BACKUP_ROLLBACK_RUNBOOK_2026-11-04.md`: muestras conservadas y pesos del modelo NO exportables; alcance legal y licencia todavía por verificar.

## Código CUT47
1. **CONSERVAR → ENTENDER → ENVOLVER**: `src/jarvisVoiceSurfacePolicy.ts`, `src/CerebroJarvisVoiceLabStatus.tsx` y `zeus/jarvis/voice/JARVIS_V2_APPROVED_LAB_VOICE_SURFACE_MANIFEST.json` copiados sin cambios desde PR #24. No crear una política competidora ni modificar la voz ANA.
2. En `CerebroConsoleHost`, montar el estado de superficie JARVIS V2 **únicamente en Vite DEV con `VITE_CEREBRO_JARVIS_V2_LAB=1`**; OFF por defecto. El estado declara explícitamente «síntesis dinámica aún no conectada». NO se inyecta audio.
3. `src/jarvisAudioDeviceProbe.ts`: comprobación local y voluntaria de permiso/entrada del micrófono con `getUserMedia({audio:true,video:false})`. Detener **todas** las pistas inmediatamente tras la comprobación. Sin `MediaRecorder`, persistencia, subida, proveedor, Gateway ni llamadas IA.
4. `JarvisAudioDeviceCheck` en dock y Operativa, disponible aunque el Gateway esté desconectado. Solo pulsación física del propietario, disabled si hay dictado/conversación activos. Diagnóstico de API STT/TTS y número de voces en español **sin confundir APIs presentes con audio oído**.
5. Pruebas Node + Chromium escritorio/móvil: separación por superficie, prueba legal DENY, preservación ANA, permiso denegado, navegador sin micrófono, parada de tracks y ausencia de envío.
6. El fallback `speechSynthesis` de CUT44 sigue siendo **TTS DE NAVEGADOR PROVISIONAL**, no la voz clonada V2. Su pitch `0,98` no equivale a +0,6 semitonos del master; no afirmarlo.

## Matriz de verdad
- Voz clonada aprobada y registrada en proveedor: **EXISTENTE**.
- Muestras físicas derivadas en Drive: **EXISTENTE**; no implican copia de los pesos del clon.
- Política de superficie JARVIS V2 / ANA: **HECHO EN CÓDIGO LAB**, runtimeEnable=false.
- Comprobación física de micrófono de cada dispositivo: **PENDIENTE DE PULSACIÓN REAL**.
- STT entendido en Opera/Chrome/Android, TTS audible y conversación bidireccional: **POR AUDITAR**.
- TTS dinámico clon vidIQ→VOICE-001 Adapter→Gateway con credencial server-side: **NO IMPLEMENTADO**.
- Acciones de negocios: Gateway actual, mismo contrato; **no nuevos permisos**.
- Consentimiento del intérprete/licencia contractual para uso productivo: **SIN VERIFICACIÓN DOCUMENTAL**.

## Snapshot real y rollback verificable antes de desplegar
El **6 de noviembre de 2026** se efectuó una comparación de archivos **solo lectura** entre el Edge Function desplegado en Supabase y la fuente de GitHub preservada en PR #27. Resultado:
- Función desplegada `cerebro-console-gateway-v0`, versión 33, `ACTIVE`.
- `index.ts`: **igual byte a byte** al blob GitHub SHA `44241c6abc3cb89560500336e332f0628219d0fc` (67.932 caracteres).
- `knowledge.ts`: **igual byte a byte** al blob SHA `e00bb09ba9a024772f26fbd81159a9e9a584cd42` (49.142 caracteres).
- La configuración `verify_jwt=false` está presente en la función desplegada (la verificación individual de usuario/actor se aplica dentro del propio código). El próximo despliegue no debe relajar ese control, y debe validar anónimos, usuarios no propietarios y revocación.
- La fuente anterior sigue recuperable desde la rama existente, **pero no se ha ejecutado una restauración real**. No equivale a rollback probado; `PROD_NO_GO` continúa.

Registro estructurado: `cerebro/registry/jarvis-voice-cut47.v1.json`. No copiar valores de secretos ni tokens al repositorio.

## Seguridad, coste, Gate
- Coste nuevo de este cambio: **0 € de suscripciones y 0 llamadas de generación** (el listado de voces no consume créditos).
- No se tocan `main`, App/CRM, Supabase real, DNS, Cloudflare, ANA, CUT30 ni Trading. No se copia JWT.
- Antes de activar una voz remota de producción: licencia confirmada, proveedor/política de privacidad, coste unitario real medido, límite por minuto/día, credenciales en Vault server-side, interrupciones, observabilidad, rollback físico, controles de identidad, tests de dos dispositivos, tribunal y promoción gradual.
- Bajo **cero coste** se puede usar el navegador como fallback, siempre que aparezca correctamente identificado, con permiso explícito del usuario y sin confundirlo con la voz aprobada.
- Política de retroceso: cerrar PR CUT47. Copia original PR #24 y ramas CUT46/CUT44/CUT45 intactas; ningún despliegue real que restaurar de este corte.

## Evidencia de CI verificada
- [Run #42299382971](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42299382971) **SUCCESS** en rama CUT47: compilación TypeScript/Vite correcta, **56 tests Node PASS / 0 FAIL**, **26 tests Playwright Chromium PASS / 0 FAIL** (desktop y móvil) y comprobación fail-closed de rutas e identidad.
- **Bloqueo E2E físico persistente**: `JARVIS_OWNER_JWT_FRESHNESS=EXPIRED_OR_NEAR_EXPIRY`; la prueba del Gateway real en GitHub Actions queda omitida, no simulada como éxito. Micrófono hardware real sigue pendiente de usuario.
- Último ensayo no reproduce el audio clonado dinámico ni confirma TTS del dispositivo. APP REAL y Gateway desplegado sin modificaciones.

## Dependencias siguientes
1. Terminar CI de CUT47.
2. Reparar/renovar de manera segura el JWT E2E **solo** mediante sesión legítima del propietario, sin mostrarlo ni persistirlo en chat.
3. Construir adaptador VOICE-001 aislado con proveedor disponible y términos verificados, sin pagos automáticos y sin integrar la voz remota en App hasta superar el gate.
4. Demo protegida separada de PROD y pruebas reales con micro/altavoces tras backup/rollback.
5. Combinar CUT43 de DeepSeek con evaluador de personalidad independiente, sin alterar entrenamientos activos.

