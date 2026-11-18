# CEREBRO OPERATIVA · P0 Puntos 1 y 2 · Continuidad técnica 18/11/2026

## BASELINE - NO REINICIAR
- Interfaz real publicada; inventario de 2.506 entradas, de las que 2.477 son roles acreditables y 29 son plantillas sin instancia.
- 179 motores y 82 departamentos documentados. Producción muestra por separado inventario de Cloudflare y Supabase.
- PR #75, #76 y #77 intactas. Esta intervención vive en PR #81 DRAFT, basada sobre #75.

## HECHO EN LAB, VERIFICADO
1. Evidencia por ID del agente/subagente: agent-evidence-bridge-v1.mjs y agent-receipt-attestor-v1.mjs. HMAC-SHA256, prueba de fuente/empresa/jerarquía/caducidad, sin acreditar inventarios como trabajo real.
2. Cloudflare: token limitado a Workers Metadata Read-Only, único account e39a57e1ac42650ca5a6d5307cf0ac8e, ID no secreto 86270861da2b8d0945f1af52ccdf33b9, activo hasta 2027-02-18. Se guardó cifrado como CEREBRO_CF_READ_TOKEN_PREVIEW en Vercel LAB exclusivamente Preview. No mostrar valor del token.
3. Supabase: reutilizada la Edge Function existente cerebro-operativa-job-telemetry-lab-v0 y la clave publishable LAB ya vinculada; muestra resúmenes históricos de JARVIS, BROWSER y CREATIVE, no trabajadores activos. Eliminada necesidad de PAT administrativa.
4. GET propietario y solo lectura api/cerebro-executor-coverage.ts, con control CARLOS-ADMIN, validación empresa, host privado, origin y scopes. UI lee cobertura cada 30 segundos y diferencia Workers inventariados de registros históricos de jobs.
5. CI GREEN sobre código SHA 88cad06ba650609013f4b2825ca1366f9a0f1b3e: workflow CEREBRO Operativa verified evidence bridge LAB y Governed Main Integration V0. Regresiones HMAC y npm run build.
6. Vercel PREVIEW privado READY: dpl_GFZuPsjg5PmdveW2qfyRh6sGLBtp, https://fenix-capital-preprod-oc51s798v.vercel.app, target null, sin alias PROD.
7. E2E físico en Opera sin token: endpoint privado devuelve OWNER_SESSION_REQUIRED con executed false y no devuelve 500. Fallo previo de importación ESM localizado y corregido.
8. SQL real de Supabase LAB: 0 de 6 trabajos JARVIS y 0 de 201 trabajos Browser poseen agent_role_id/subagent_role_id en los campos inspeccionados. No se ha realizado ninguna escritura.

## QUEDA ABIERTO, NO DECLARAR CERRADO
- P0-1: Candidato LAB conectado a Cloudflare y telemetría Supabase mediante credenciales de lectura. Falta E2E positivo con sesión CARLOS-ADMIN dentro de PREVIEW para confirmar fuente LIVE en Vercel. El inventario de infraestructura NO significa ejecución de motores.
- P0-2: Receptor/proyector de recibos firmados probado, pero no se ha instrumentado ningún emisor real. No existen identidades por trabajo en los 207 jobs inspeccionados: **0 roles acreditados de 2.477; 29 plantillas excluidas**.
- PROD_PROMOTION=HOLD. App/CRM/WordPress/Supabase PROD/Cloudflare Workers/DNS/main sin modificaciones.
- Coste: ninguna suscripción nueva, coste marginal de builds/runtime no acreditado como cero.

## NEXT_BLOCK UNICO
1. En el Preview privado exacto, iniciar sesión de propietario y comprobar Cloudflare LIVE y Supabase LAB LIVE, OLD vs NEW de la pantalla, rollback de un despliegue privado y coste observado. No compartir tokens en el chat.
2. Añadir un solo hook compartido en los ejecutores reales, no 2.477 conexiones. Cada recibo necesita company_id, engine_id, environment, version, executor_id, job_id, receipt_id, agent_role_id, subagent_role_id opcional, event, emitted_at y firma verificable en servidor.
3. Una ejecución física firmada debe acreditar el agente ID correcto, su subagente si procede y pasar a ACTIVE_RECENT solo con evento auténtico de los últimos 120 segundos. No extrapolar al resto de perfiles.
4. Reutilizar el contrato común en JARVIS, OPERATIVA y NEURONAL solo después de verificaciones de seguridad, integridad, dependencias y rollback.

Regla: CONSERVAR - ENTENDER - ENVOLVER - PROBAR - MEJORAR - MIGRAR.


## 18/11/2026 · Verificación tras inicio de sesión y corrección visual
- **OPERATIVA V3 recuperada físicamente en sesión Opera existente** al visitar /cerebro?section=operativa&op3_panel=agentes&visual_lab=cockpit-v3 en el Preview anterior. Árbol de accesibilidad confirma menú JARVIS/OPERATIVA/NEURONAL, directorio paginado de 2.506 y paneles reales. El enlace sin visual_lab mostraba el inicio genérico, que el propietario describió como "se ve mal".
- **Causa adicional** de cobertura no visible: regexp doblemente escapada en src/CerebroRoleAgentRosterReadonly.tsx impedía activar el polling de /api/cerebro-executor-coverage incluso con autenticación válida. Reparada la regexp y agregada regresión.
- **Ruta privada mejorada:** src/CerebroConsoleHost.tsx ahora sirve V3 por defecto en /cerebro de la familia de despliegues privados verificados, sin necesitar visual_lab; acceso propietario continúa fail-closed mediante /api/cerebro-preview-owner. No cambia la App real.
- **Emisor genérico añadido:** agent-receipt-emitter-v1.mjs (WebCrypto, servidor, LAB únicamente), probado en interoperabilidad con verificador Node; envío sin acuse durable sigue SUBMITTED_UNVERIFIED, nunca acredita ejecución.
- **Precisión de estado:** la proyección ya no deja ACTIVE_RECENT en un job cuyo último evento es SUCCEEDED o FAILED; admite otro job concurrente que siga vivo y rechaza reactivación por recibos desordenados.
- **CI del código** SHA d650cf06dfe7f248f0779f531e17f596228a3ccc: CEREBRO Operativa verified evidence bridge LAB = SUCCESS; CEREBRO Governed Main Integration V0 = SUCCESS. Incluye pruebas de acceso, rutas, firma, emisor, caducidad y estado terminal, más build.
- **Último Preview REAL READY:** dpl_52p3U33HziPQmatHq5rx2ZbCCqdx, https://fenix-capital-preprod-553npv93c.vercel.app, target=null. GET anónimo en /api/cerebro-executor-coverage?company_id=fenix devuelve 401 OWNER_SESSION_REQUIRED, executed:false; no 500.
- **Límite E2E:** cada despliegue privado tiene un hostname nuevo y la sesión Supabase del Preview anterior no se comparte automáticamente. La sesión propietaria positiva se verificó en Preview anterior, pero falta prueba positiva LIVE de Cloudflare/Supabase en este último despliegue. No inventar que ambas lecturas están verificadas en Vercel. Los emitters reales de Cloudflare/Supabase/JARVIS aún no invocan automáticamente el nuevo hook de firma.

## Gates actuales
- Catálogo y UI V3 protegida: HECHO LAB y verificado con propietario en Preview anterior; nueva ruta automática comprobada en CI.
- Cloudflare / Supabase fuente: API y credenciales preparadas, falta owner positive E2E del último build.
- Emisor genérico HMAC: HECHO LAB (código y tests); suscripción por runtimes reales: PARCIAL.
- Acreditación live por ID: NO VERIFICADA; no extrapolar test de QA al censo 2.477.
- PROD: HOLD; sin modificación de aliases reales, App/CRM, WordPress, Supabase PROD, Workers, DNS ni trading.
