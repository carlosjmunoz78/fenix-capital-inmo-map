# CEREBRO OS · CUT39 · JARVIS, interlocutor universal

Fecha: 2026-11-06 · Estado: CÓDIGO LAB VERIFICADO, PROD NO PUBLICADO
Rama: `cerebro/jarvis-omnichannel-interlocutor-lab-20261106` · base: CUT38 PR #26 DRAFT

## Misión

Conservar un único JARVIS como interlocutor del propietario al alternar por JARVIS, OPERATIVA, NEURONAL y NAVEGADOR, pudiendo escribir, dictar, hablar y revisar la conversación sin conceder por la interfaz privilegios que no tenga el Gateway. No recrear App/CRM/CEREBRO, ni reemplazar Browser 1 o el chat antiguo.

## EXISTENTE confirmado por lectura de código

- `src/CerebroConsoleHost.tsx` tenía cuatro vistas, pero desmontaba el componente JARVIS al salir de su pestaña.
- `src/CerebroConsoleShell.tsx` utiliza sesión Supabase y exige `CARLOS-ADMIN`, Gateway HTTPS autenticado, sin conexión directa al proveedor IA ni escrituras PROD habilitadas desde la UI.
- El Gateway `supabase/functions/cerebro-console-gateway-v0/index.ts` implementa rutas de chat deterministas, lectura de expedientes e inmobiliarias, memoria conversacional v2 mediante RPC del servidor y propuestas gobernadas de email/SEO. La existencia de código no prueba que cada ruta de producción esté desplegada y funcional.
- `cerebro/registry/engine-registry.v1.json` enumera 179 motores. Esto es catálogo, NO prueba de 179 motores operativos.
- `cerebro/registry/company-domain-knowledge-packs.v1.json` y `fenix-app-crm-knowledge-pack.v1.json` son fuentes históricas/de PREPROD, no conocimientos verificados automáticamente en PROD.
- DeepSeek CUT37 genera evaluaciones sintéticas en LAB. No hay evidencia de incorporación de esas evaluaciones a JARVIS PROD ni de entrenamiento de pesos.

## HECHO en esta rama

- Host mantiene `CerebroJarvisWorkConsole` **montado una única vez** mientras se cambia de pestaña; su DOM se oculta de manera efectiva fuera de la vista JARVIS. No se sustituye la interfaz Operativa ni los controles de Browser 1.
- `JarvisOmniDock.tsx` presenta una entrada fija y voluntaria a la conversación compartida en las vistas Operativa, Neuronal y Navegador; permite escritura, dictado cuando lo admite el navegador y voz cuando el Gateway está autorizado.
- `jarvisOmniSession.ts` publica únicamente los últimos 24 turnos en memoria del proceso web. Cambiar vista no cambia la identidad del agente. La sesión requiere que el componente principal siga autorizado; al salir de la cuenta se limpia la proyección.
- No hay nueva API de IA, clave en frontend, servicio permanente, servidor por motor ni suscripción.
- La voz nunca arranca al abrir la pantalla; requiere gesto explícito y permiso real del navegador.
- Mejora de rendimiento: el observador del compositor se restringe al árbol JARVIS cuando está montado, en lugar de reaccionar a cada mutación de Browser 1.
- Registry overlay `cerebro/registry/jarvis-universal-interlocutor-cut39.v1.json` establece qué conocimiento y qué facultades están conectados, cuáles son fuentes históricas y qué falta por auditar.

## PRIVACIDAD, PODERES Y LÍMITES

Los eventos de conversación son de presentación en la misma pestaña. NO son capacidades de administración ni pruebas de ejecución física. El Gateway conserva la autoridad de autorización, contratos, propuesta exacta, evidencia, supervisión, auditoría y excepciones humanas. HUMAN_REQUIRED únicamente: LEGAL_REQUIRED, SIGNATURE_REQUIRED, LOW_CONFIDENCE, HIGH_RISK, POLICY_CONFLICT, SECURITY_INCIDENT, MONEY_LIMIT y CUSTOMER_HUMAN_REQUEST. El propietario decide cuando corresponda, sin eliminar obligaciones legales ni restricciones de seguridad.

El contexto de la interfaz y el proyecto se registra como pista UI no confiable; **el Gateway desplegado todavía no consume ese campo como contrato canónico**. No afirmar que JARVIS entiende automáticamente todos los datos de la pantalla ni que puede operar cualquier interfaz. La memoria visual de 24 turnos tampoco equivale a toda la historia de ChatGPT/Notion/CRM/documentos.

## Pruebas y aceptación

- CUT38 previo: GitHub Actions #42263901130; build+10/10 pruebas E2E sintéticas.
- CUT39: build TypeScript/Vite, pruebas de política y estado, Playwright desktop+mobile con Gateway/voz sintéticos. La evidencia debe referenciarse por run final, no por una captura o un estado inferido.
- Antes de PROD: JWT propietario E2E real, contrato del Gateway desplegado, micrófono y TTS reales, secuencia JARVIS → OPERATIVA → NEURONAL → NAVEGADOR, pruebas negativas de otro usuario, presupuesto, regresión App/CRM, snapshot, rollback probado y comparación OLD vs NEW.
- App PREPROD antigua cancelada: pruebas en rama y arnés local, no activar URL pública alternativa ni tocar main/gh-pages/DNS.

## Paso siguiente sin fingir completitud

1. Resolutor de conocimientos por fuente con permiso, procedencia, vigencia y `company_id`, no ingestión masiva ciega.
2. Consolidación de memoria longitudinal mediante el contrato servidor existente; historial de toda la empresa y de ChatGPT/Notion no está conectado por defecto.
3. Resolver y enrutar intenciones a motores realmente habilitados, con evidencias y tribunal; jamás permisos ilimitados por una frase del usuario.
4. E2E real autenticado, pruebas de voz y rollback antes de activar en App Fénix.

## Rollback

No se han modificado main, gh-pages, App/CRM real, Supabase PROD, DNS, Trading, CUT30 ni los secretos. Para descartar esta mejora, cerrar la PR DRAFT o abandonar la rama; la instalación actual queda intacta. No hay efectos externos de esta fase LAB.


## CUT40 · Auditoría de memoria y Gateway real · 2026-11-06

**HECHO (solo lectura)**:
- Supabase proyecto `cluhljgonannaafpmblx`: función `cerebro-console-gateway-v0` desplegada con estado `ACTIVE`, versión 33. Su código combina `withSupabase({auth:"user"})` y comprobación de propietario. El indicador administrativo `verify_jwt=false` no concede por sí mismo acceso público; la autorización debe comprobarse en los endpoints reales.
- Las RPC `fenix_prod_cerebro_memory_search_server`, `fenix_prod_cerebro_memory_observe_v2_server`, `fenix_prod_cerebro_memory_supersede_server` y `fenix_prod_cerebro_memory_forget_server` existen. Su mera presencia no demuestra que todo el historial esté indexado.
- El Gateway publicado contiene `knowledge.ts`: combina memoria conversacional autorizada, consultas operativas, fuentes documentales canónicas Notion y comprobaciones de vigencia. La presencia del código **no** confirma que el token Notion esté disponible ni que todos los documentos estén recuperables.
- El conector Notion encontró metadatos de páginas Base Estratégica CEREBRO, Centro de Decisión, Belén Motor Financiero, JARVIS Fénix Capital y FAQ Fénix. No se importaron contenidos ni documentos privados en GitHub.
- Detectado y eliminado en LAB el segundo montaje de `CerebroConsoleShell` en Operativa; desde CUT40, Operativa utiliza el núcleo JARVIS persistente mediante el mismo puente autenticado. Sin modificación de PROD.

**VALIDACIÓN OFFLINE**:
- Workflow GitHub Actions [42279112598](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42279112598) `SUCCESS`: compilación, contratos, tests offline de lectura segura y **20/20** Playwright sintéticos en escritorio y móvil.
- El smoke físico propietario realiza exclusivamente GET en `health`, `contract` y `engines`, y prueba que la vía anónima esté denegada. Nunca POST, never Model API, no datos CRM.
- El workflow revisa que el JWT cifrado de GitHub esté vigente **antes** de llamar a Supabase. Diagnóstico real `JARVIS_OWNER_JWT_FRESHNESS=EXPIRED_OR_NEAR_EXPIRY`. Por tanto la comprobación real con JWT está **BLOQUEADA/SKIPPED**, no verde. Un intento anterior [42278561640](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42278561640) recibió HTTP 401 y no efectuó cambios.
- Prohibido actualizar la credencial desde una clave de servicio, modificar políticas, saltarse JWT, copiar claves en chat o afirmar E2E usuario mientras esté bloqueado.

**PENDIENTE PARA PROMOCIÓN**: renovar de forma segura la prueba de sesión del propietario cuando haya mecanismo autorizado de sesión humana; ejecutar OLD vs NEW, micrófono y síntesis reales, comparar historial y ejecución mediante Gateway, comprobar backup/rollback físico y promover gradualmente si todo verde.

**NO TOCADO**: main, PROD, App/CRM, DNS, Supabase esquema y datos, CUT30, Trading. Coste de suscripción adicional: 0 €.
