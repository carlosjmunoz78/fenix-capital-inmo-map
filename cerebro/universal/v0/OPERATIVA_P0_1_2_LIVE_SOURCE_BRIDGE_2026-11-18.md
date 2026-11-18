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


## Bloque 2 + 3 + 4 · 18/11/2026 · Estado y gates
**P2 Identidad**: el emisor WebCrypto/HMAC y el proyector por IDs ya existían en LAB. Se añadió agent-github-run-attestor-v1.mjs, que SOLO puede atribuir la capacidad QA-001 al perfil ENG-QA cuando la API oficial de GitHub demuestra el workflow ID 422902482, repositorio y rama exactos, un job evidence-bridge finalizado con éxito y los pasos de tests/build aprobados. El nuevo trabajo declara explícitamente CEREBRO_AGENT_ROLE_ID=ENG-QA y CEREBRO_ENGINE_ID=QA-001. Ni inventarios de Cloudflare ni jobs históricos sin IDs sirven como acreditación. Un job finalizado se considera HISTÓRICO, nunca autónomo activo.

**P3 Supervisor**: agent-supervisor-v1.mjs con marca de proyección verificada en el mismo proceso; estados NOT_VERIFIED / RUNNING_VERIFIED / FAILED_VERIFIED / EXECUTED_NOT_RUNNING / HISTORICAL_FAILURE / HISTORICAL_EVIDENCE / TEMPLATE_NOT_INSTALLED. Un SUCCEEDED o FAILED revoca el RUNNING de su mismo job; varios jobs se observan separadamente. Excelencia = 0 hasta tener contratos, permisos, QA, evaluación, tribunal, coste, backup, rebuild y rollback con pruebas individuales. API Preview expone estado de conexiones y un único registro de QA solo si la lectura oficial de GitHub lo confirma; los datos del navegador no pueden acreditarlo.

**P4 Renovación de JWT**: scripts/cerebro-e2e-ephemeral-session.sh obtiene JWT nuevo por CI desde /auth/v1/token usando **credenciales de una cuenta técnica de pruebas** almacenadas en secretos de GitHub, sin publicar ni reciclar JWT fijo, y con issuer/aud/exp validados. Los workflows cerebro-session-context-auth-e2e.yml y jarvis-authenticated-orchestrator-e2e.yml han sido adaptados. Si CEREBRO_E2E_TEST_EMAIL y CEREBRO_E2E_TEST_PASSWORD no están configurados el flujo BLOQUEA con código 42, nunca afirma GREEN. IAM-001 auditor de referencias actualizado a estas nuevas credenciales. No modificar perfiles ni usar contraseña personal de propietario.

**Pruebas**: CI del commit 651def029688364235b91920eede56aa37d83eb0: puente OPERATIVA, IAM-001 y Governed Main Integration completaron SUCCESS. El commit posterior b637506401c5d8d3a3b851d9cbae247c8246a834 añade identidad explícita del job QA y la lectura de presencia de secretos, pendiente de certificación exact-HEAD al escribir este registro.

**PREVIEW**: dpl_94Eb1tXQ9QJ7ckF7rutGu6SdCsTn, https://fenix-capital-preprod-ori2eqt8n.vercel.app, READY, sin alias de producción. La comprobación física anónima del endpoint nuevo devolvió 401 OWNER_SESSION_REQUIRED, no 500. Falta prueba positiva de lectura GitHub de este Preview, pues el hostname nuevo no hereda sesión del anterior.

**No terminado**: conectar emitters a Cloudflare/Supabase reales mediante hooks de runtimes compartidos, observar eventos firmados verdaderos de esos ejecutores, supervisar calidad completa por cada motor y demostrar la renovación de sesión en un workflow real con cuenta de pruebas autorizada. No declarar los puntos 2-4 cerrados por tests sintéticos o por catálogos. Todos siguen PARCIAL, con avances LAB verificables. No cambiar App/CRM/DNS/Supabase PROD/Worker ni fusionar PR #81 hasta gates PREPROD/OLD-vs-NEW/rollback/coste.

**Gates siguientes, mínimos**: GitHub QA real leído desde Vercel con propietario -> registrar una sola prueba de ejecución verificada; emitters compartidos en LAB (no por perfil) -> E2E firma y readback durable -> supervisor salud/tribunal sobre prueba real -> credenciales de test técnico ya existentes o explicitamente aprobadas -> E2E JWT fresco. No inventar contraseña, no resetear identidad del propietario.


## Cierre físico adicional · Comprobación del 18/11/2026
- El run CI #44375295136 de \`CEREBRO Operativa verified evidence bridge LAB\` pasó; integración gobernada, IAM-001 y Enterprise Acceleration también estaban SUCCESS en ese HEAD.
- **Bloqueo real IAM-004 confirmado por logs GitHub Actions**: \`CEREBRO_E2E_TEST_EMAIL\` NO está configurado; \`CEREBRO_E2E_TEST_PASSWORD\` sí aparece como presente. No crear una cuenta admin ni usar credenciales de propietario como sustitución sin prueba de identidad técnica y permisos. El flujo \`cerebro-e2e-ephemeral-session.sh\` debe bloquear si falta correo. Ausencia de correo explica falta de prueba positiva JWT rotado, no atribuir fallo al sistema de refresh sin ensayarlo.
- LAB Supabase: consulta agregada auth.users con condición nombre de email parecido a cerebro/e2e devolvió cero cuentas reconocibles entre seis; **eso no prueba que no exista ninguna cuenta de pruebas con otro nombre**. No se expusieron identidades, correos ni contraseñas.
- Preview Vercel genera hostnames inmutables; intento de reutilizar el hostname de Preview anterior para conservar su sesión autenticada rechazado por Vercel con \`400 alias_in_use\` (URL de deployment, no alias configurable). No se realizaron cambios de alias ni DNS.
- Quedan por certificar físicamente: un emisor de eventos de ejecución en cada runtime compartido y el supervisor alimentado por esos eventos, más un run CI real de JWT temporal con cuenta técnica autenticada. **P2/P3/P4 siguen PARCIAL**; pruebas unitarias verdes y despliegue privado listo no satisfacen la promoción.
- Siguiente gate mínimo IAM: designar una identidad técnica de pruebas ya existente y guardar su correo en \`CEREBRO_E2E_TEST_EMAIL\` por almacén cifrado de GitHub; verificar que la contraseña configurada corresponde a ella, sin revelar valores en chat. No hacer login de prueba contra cuentas personales por aproximación.
