# CEREBRO OS · OPERATIVA UNIVERSAL · TRASPASO MAESTRO A CHAT NORMAL
Fecha de corte: 2026-11-15 (Europe/Madrid) · Estado: DOCUMENTO DE CONTINUIDAD · Proyecto CEREBRO OS · ENGINE FACTORY & MULTIEMPRESA

## 0. Uso obligatorio del traspaso
Este documento es la fuente de CONTINUIDAD del último bloque de Operativa. No sustituye el contrato histórico: cerebro/universal/v0/OPERATIVA_UNIVERSAL_CONTRATO_REAL_V1_2026-11-15.md. El contrato contiene objetivos originales y fotografías de estados anteriores; cuando difieran, para el estado de este bloque prevalece la evidencia fechada más reciente de este documento y los recibos físicos de la PR #66. Antes de cambios, verificar de manera ACOTADA que el SHA y los permisos continúan siendo los mismos.

**Modo de continuación solicitado:** ChatGPT NORMAL dentro del mismo proyecto, NO ChatGPT Work. Usar conectores ya conectados GitHub, Supabase, Vercel LAB, Cloudflare para lecturas permitidas y Opera para lectura/navegación cuando estén disponibles. No prometer Computer Use, escritura en browser, trabajos de fondo ni herramientas que no estén accesibles en Chat normal. Si una acción requiere Work exclusivamente, registrar el gate y seguir por APIs de Chat o el siguiente trabajo posible.

**Regla de trabajo:** CONSERVAR → ENTENDER → ENVOLVER → PROBAR → MEJORAR → MIGRAR. No repetir inventarios, investigaciones generales, reconstrucciones, documentación redundante, creación de recursos duplicados ni regresiones de versiones ya certificadas. Una comprobación acotada de SHA/estado/permiso antes de una escritura no cuenta como rehacer auditorías.

## 1. Anclas exactas, comprobadas al cierre
- Repositorio de Operativa: carlosjmunoz78/fenix-capital-inmo-map.
- PR #66: https://github.com/carlosjmunoz78/fenix-capital-inmo-map/pull/66 ; OPEN, DRAFT, NO MERGED.
- Rama exclusiva: cerebro/universal-control-plane-lab-v0-20261113.
- HEAD funcional con aceptación: 986eed50a47dcf519d52dfbb0dfc2c12a3c2fee2. Los commits posteriores de documentación NO alteran ese SHА funcional, pero serán el nuevo HEAD documental.
- GitHub Actions para SHA funcional, todos SUCCESS:
  * CEREBRO Governed Main Integration V0: https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/43768086907
  * CEREBRO Universal Gateway V0 LAB contract CI: https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/43768086914
  * CEREBRO Enterprise Acceleration V0: https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/43768086899
- Vercel LAB proyecto existente: fenix-capital-preprod-app, ID prj_tz5NfMwhscoVj2OCBOIvb0oXC6jc, SSO ENABLED.
- Último Preview funcional: dpl_GUsDv7y88Vnf3ugBfurbmQM1DU8x, READY, target=null, SHA 986eed50a47dcf519d52dfbb0dfc2c12a3c2fee2. URL: https://fenix-capital-preprod-cne6y2k01.vercel.app/cerebro?section=operativa&visual_lab=cockpit-v3&op3_panel=control
- Alias de Preview privado que puede apuntar a la última versión: https://fenix-capital-prep-git-b7776b-carlosjmunozcabeza-2582s-projects.vercel.app/cerebro?section=operativa&visual_lab=cockpit-v3&op3_panel=control
- Preview anterior preservado: dpl_4i9nQzAxgRY5GyDcftutkWmxzTfb, READY, SHA 202e3264e0129c762c9172a71dd2d8403e8a31f6, URL https://fenix-capital-preprod-65kgfx7qz.vercel.app . Recuperación del código posible; rollback físico de alias NO ensayado.
- Supabase LAB EXCLUSIVO de estos lectores: hnqlnvakzaywtafeiybt, proyecto fenix-capital-inmo-map, HEALTHY. NO confundir con Supabase PROD.
- Edge LAB añadidas y comprobadas ACTIVE v1:
  * cerebro-operativa-device-observe-lab-v0
  * cerebro-operativa-job-telemetry-lab-v0, ID e46ede97-2e98-4744-9ffb-5ca792c03461
- Total Edge Functions LAB observado al cierre: 367; las anteriores no se sustituyeron. Las dos nuevas son independientes, GET/read-only, sin cron. verify_jwt=false por JWT de emisor ajeno; ambas VALIDAN sesión de propietario CARLOS-ADMIN contra el resolver existente ANTES de leer con credencial interna LAB. Esta configuración necesita auditoría de seguridad de defensa en profundidad; no abrir rutas sin protección.
- Navegador Opera, aceptación del panel REAL en conexión 5171b7ce-0de0-4792-93a9-ea5bf64ab645, pestaña 1381967870 en ese momento. IDs de pestañas son efímeros: descubrir los actuales en vez de presumir que existen.
- Cloudflare account usada para lecturas anteriores: e39a57e1ac42650ca5a6d5307cf0ac8e; NO desplegar/controlar sus Workers desde esta misión. Variable CEREBRO_CF_READ_TOKEN_PREVIEW AÚN AUSENTE de Vercel. Intentos de emisión/binding previos rechazados o revocados; no repetir ni eludir las protecciones.
- GitHub Social repo carlosjmunoz78/fenix-capital-cerebro-social: Instagram PR #8 DRAFT y Facebook PR #9 DRAFT. No tocar desde esta misión.
- App real: https://app.fenixcapital.es ; CRM real protegidos. App PREPROD cancelada. staging.fenixcapital.es SUSPENDIDA. El nombre histórico “preprod” del proyecto Vercel o columnas SQL NO reactiva esa App/entorno.

## 2. Capacidades de Operativa efectivamente implementadas y su calidad de evidencia
### 2.1 Consola y consultas
- Cockpit V3 / Control en Preview con autenticación propietaria, navegación, consultas de motores, fuentes y disponibilidad.
- Diagnóstico en chat de agentes faltantes, fallos observados, capacidades, avance recomendado, tiempo/coste. Distingue hechos verificados de definiciones: **179 motores lógicos definidos NO son 179 procesos ejecutándose**; role-agent-registry declara 11 perfiles, Media Studio tiene 529 roles diseñados, NO son censo de agentes. No sumar registros heterogéneos.
- Preguntas por fuente aunque no aparezca visible en panel. Ejemplos: “Qué agentes faltan en FACT-001”, “Qué falla”, “Qué tardó”, “¿Cuántos dispositivos tienen latido?”, “¿Cuántos trabajos tiene JARVIS?”.
- El chat de trabajos y dispositivos usa consulta LAB actual a través de owner auth. Chat E2E sintético VERDE; todavía NO se ha certificado escritura/envío real en Opera (su conector normal solo permite lectura/navegación).
- Diferencia ACCELERATE, PRIORITIZE, PAUSE, RESUME, CANCEL, RETRY, REASSIGN, SLOW_DOWN. Una intención detectada NO significa control ejecutado. El único recurso determinista LAB con recibos específicos es LAB-DEMO-001; RUNNING/PAUSED son estados deseados, no agente autónomo en ejecución.
- Observación del GitHub público disponible; detalle del paso fallido de workflow bajo solicitud con seguridad. No confundir GitHub Workflow con trabajo de motor o agente identificado.
- Cloudflare en el backend Preview sigue con error CLOUDFLARE_READ_TOKEN_NOT_BOUND; puede existir conector Cloudflare externo de Chat normal con permisos de lectura, pero no suministra automáticamente credenciales a Vercel. NO decir que el panel lee Cloudflare en vivo.

### 2.2 Dispositivos, latidos y órdenes (fuente LAB, consulta efectiva)
- Lector y Edge ACTIVE cerebro-operativa-device-observe-lab-v0: lectura de datos agregados de cerebro_device_agents_preprod, cerebro_device_commands_preprod, cerebro_device_results_preprod (identificadores de unión usados SOLO en servidor).
- En comprobación física Opera, fuente FENIX_DEVICE_LAB_OWNER_READ_V1 y consulta actual: 1 dispositivo no revocado en etiqueta LAB y 4 en etiqueta histórica PREPROD; **0 latidos en 5 min y 0 en 24 h** en esos registros; LAB 8 órdenes históricas = 6 completadas + 2 fallidas; PREPROD histórica 96 = 75 completadas + 21 fallidas. Resultados semánticamente verificados: LAB 6 y PREPROD histórica 75. Son contadores de muestra con fecha, NO pruebas de censo de agentes actual.
- Evidencia fechada separada en cerebro/universal/v0/device-runtime-snapshot-fenix-2026-11-15.json.
- Panel src/CerebroDeviceLivePanel.tsx: refresco al entrar, al volver a pestaña, cada 120 s visible y botón. Si origen denegado: UNAVAILABLE, NO inferir 0. Proyección y respuestas de API deben ser solo números/fechas, sin IDs, payload ni cliente.
- Duraciones comparables registradas del archivo: LAB n6 p50 28,2 s p90 113,1 s; PREPROD histórico n66 p50 3,7 s p90 127,7 s; no son ETA futuro.

### 2.3 Trabajos JARVIS, navegador, productora y costes observados
- Edge ACTIVE v1 cerebro-operativa-job-telemetry-lab-v0, función separada y solo lectura, misma sesión propietaria.
- Fuente FENIX_LAB_AGENT_JOB_AGGREGATE_V1 en panel Opera real, corte 15/11/2026 ~23:17 Europe/Madrid.
- jarvis_work_job_v1: 6 históricas: 5 SUCCEEDED, 1 DEAD_LETTER; última actualización 09/11.
- cerebro_browser_job_v2: 117 históricas: 92 SUCCEEDED, 13 DEAD_LETTER, 6 HOLD, 1 QUEUED, 5 CANCELLED; última actualización 26/10.
- cerebro_creative_job_v1: 18 históricas: 7 SUCCEEDED, 11 HOLD (10 FACT-001 y 1 UMS-001); última actualización 05/11.
- Suman 14 DEAD_LETTER y 18 HOLD/QUEUED en tablas históricas de trabajos; **NO son 14 averías de agentes actuales ni necesariamente incidencias vivas**. El estado QUEUED antiguo no demuestra ejecutor conectado. El panel sugiere P1/P2 SOLO REVISIÓN, sin reintentos.
- cero heartbeats recientes/no leases sin vencer en esas tablas observadas; no se verifican identidades agent_id/subagent_id, trabajo en curso, coste marginal futuro ni ejecuciones autónomas.
- cerebro_browser_worker_metric_v2: 60 muestras fechadas, coste incremental registrado total 0,0000 EUR en esas 60 muestras, p50 de duración 5,4 s y p90 84,6 s (observados en pantalla real). **Coste TOTAL de infraestructura: NO_MEDIDO**, incluso si suma incremental de esa tabla es 0.
- Contratos principales: cerebro/universal/v0/agent-job-live/{index.ts,job-projection.mjs}; api/cerebro-agent-job-live.ts; src/{cerebroAgentJobLiveApi.ts,CerebroAgentJobLivePanel.tsx,CerebroOperativeCockpitV3Bridge.tsx,cerebroOperativaDiagnostics.ts,CerebroFleetControlPanel.tsx}.
- Tests de proyección, deny by default, cross-company, no PII, E2E Playwright sintético: cerebro/universal/v0/operator-job-live.test.mjs y tests/cerebro-operativa-owner-quickreads-lab.spec.ts. Último SHA 3 workflows verdes.
- Confirmación física en Opera: lectura actual mostrando 6 JARVIS, 117 navegador, 18 productora, 14 dead-letter históricos y coste registrado. La pregunta por chat, aunque tiene E2E sintético, NO fue tecleada manualmente en navegador real.

## 3. Seguridad, límites y excepciones
- No tocar main, PROD, App/CRM, Supabase PROD, DNS, Hostinger, WordPress, staging suspendida, Social PR#8/9, Cloudflare Workers/cron, Trading LAB/REAL salvo orden separada y gates específicos.
- Mantener PR #66 DRAFT, sin merge; toda nueva implementación aislada en rama actual y Preview protegido; evitar gastos/suscripciones adicionales.
- SECRETOS: Nunca imprimir, transmitir en chat, logs, snapshots, comentarios o repos. Acceso autenticado cross-project únicamente mediante canales seguros existentes. No reintentar vías de emisión bloqueadas; de ser necesario clasificar HUMAN_REQUIRED para el canal autorizado.
- Vercel LAB SSO y target Preview; no convertirlo en alias de producción ni tocar DNS.
- Edge readers verify_jwt=false es una excepción técnica existente por JWT de otro issuer: exige verificar owner/server-side, negar anónimos, actor no owner, JWT expirado/revocado, métodos no GET, scopes no Fénix, payload/URL injection, límites de lectura, timeouts, caché, acceso API directo, respuesta de error sin detalles. Los tests sintéticos existentes NO sustituyen una prueba negativa end-to-end real.
- Coste adicional de suscripciones autorizado 0 EUR; coste real de invocación, CI, Vercel, Supabase y otros servicios NO auditado. Medición antes de aumentar periodicidad o ejecutar lotes.
- Human-by-exception válido exclusivamente para LEGAL_REQUIRED, SIGNATURE_REQUIRED, LOW_CONFIDENCE, HIGH_RISK, POLICY_CONFLICT, SECURITY_INCIDENT, MONEY_LIMIT o CUSTOMER_HUMAN_REQUEST. No repetir preguntas ante operaciones gratuitas seguras autorizadas; tampoco actuar fuera de permisos o riesgo admitido.
- Si se revierte, el Preview anterior READY sirve como referencia de rollback de UI; rollback físico de alias **no probado**. Las dos Edge nuevas no afectan la infraestructura previa y pueden dejarse deny-all si una validación de seguridad falla; no borrarlas sin inventario ni gate. Hay que ensayar reversión real en LAB.

## 4. Trabajo pendiente · orden de ejecución IMPERATIVO (sin repetir lo concluido)
### P0-A · Cerrar seguridad REAL de las dos Edge de lectura y su Proxy
1. Leer una vez el código concreto actual y las políticas que corresponden a los endpoints nuevos. Ejecutar pruebas negativas reales acotadas (GET sin JWT, identidad distinta, scope distinto, JWT expirado, métodos, origen), sin acceder a datos privados ni debilitar permisos. No usar credenciales en respuestas/logs. Revisar issuer, expiración, revocación, actor_code y trust boundary de owner resolver; controles rate-limit y tamaño de respuesta.
2. Comprobar separación estricta de proyecto LAB vs PROD; no cruzar service_role/credenciales al navegador ni permitir SSRF/URLs arbitrarias. Auditoría de RLS/ACL y patrón service-role, sin cambiar configuración de PROD.
3. E2E físico de lectura desde owner donde esté disponible; detectar si una pestaña deniega y otra permite, sin cambiar SSO global. Certificar contract provenance y timestamps de cada respuesta.
4. Ensayar rollback de función nueva y restauración sin afectar funciones antiguas, con snapshot/contrato. Si hay gate de seguridad, mantener lector aislado/OFF, marcar HUMAN_REQUIRED apropiado.

### P0-B · Fuente de identidad, trabajo y latido DE EJECUTOR REAL
1. Descubrir contratos existentes en LAB para agent_id, subagent_id, worker_id, job_id, run_id, execution_id, company_id, engine_id, environment, version. Separar "declarado", "creado", "conectado", "heartbeat reciente", "job con lease", "trabajo validado" y "autonomía demostrada". No atribuir dueño por registros no firmados ni por campo ONLINE.
2. Mapear a los ejecutores existentes (Bridge navegador, JARVIS LAB, FACT-001, SEO, Media Studio, Social LAB) de manera no invasiva; comprobar qué proveedor tiene telemetría verificable y cuál no. No crear un agente por cada rol o motor lógico ni 150 servidores.
3. Establecer contrato canónico read-only de provenance, TTL, heartbeat y recibos de actividad por identidad. Si no hay heartbeat real, mostrar DESCONOCIDO con fuente/causa; nunca 0 inventado. Crear capa adaptadora LAB solo cuando se pruebe el contrato, el acceso y la contención de costes.

### P1-A · Diagnóstico de bloqueos y cola sin ejecución peligrosa
1. Investigar por motor, usando metadatos seguros, las 14 filas DEAD_LETTER históricas y los 18 HOLD/QUEUED; determinar fallos de 2026-10/11 vs incidente actual, categorías de error, último éxito, dependencia, dueño lógico, coste/riesgo de corrección. Limitar y anonimizar antes de mostrar al usuario.
2. Sin resubmits automáticos: NO RETRY, CANCEL, PAUSE, RESUME, ACCELERATE, REASSIGN en ejecutores empresariales hasta policy+grants+idempotencia+recibo+readback+rollback+PREPROD apropiado del motor aislado (no reactivar App PREPROD). Crear propuestas y priorización razonada primero.
3. Añadir filtros por motor/entorno/fuente/antigüedad a Operativa, y consulta desde chat para elementos no visibles. Evitar gran listado de incidentes sin acciones concretas.

### P1-B · FinOps y ETA observados de verdad
1. Distinguir 0 EUR incremental registrado en 60 métricas de gastos reales GitHub, Vercel, Supabase, Cloudflare, DeepSeek, imágenes/vídeo y otros ya contratados. Obtener factura, cuotas, límites y consumo con conectores autorizados sin contratar nada.
2. Consolidar por company_id+engine_id+environment+version y ejecución; importes reales, límite mensual y hard-stop; los costes no disponibles son NO_MEDIDO, no 0.
3. Percentiles p50/p90 por tipo de trabajo solo con muestras suficientes y misma unidad; ETA por etapa/cola/dependencias con banda de incertidumbre. Registrar diferencia de coste/tiempo para acelerar únicamente cuando hay medición.

### P1-C · Conectores de fuentes faltantes
- Cloudflare: el conector externo sí pudo leer Workers; el backend Preview carece de CEREBRO_CF_READ_TOKEN_PREVIEW. Token anterior rechazado/revocado y no quedó credencial. NO reintentar generación tras bloqueo de seguridad. Solicitar únicamente intervención humana para conectar vía canal autorizado si es imprescindible; continuar otras prioridades sin pararse.
- GitHub Social privado, Instagram/Facebook DRAFT, Notion, WordPress, otras colas y tareas: inspección read-only no invasiva, detectar gates reales. Respetar decisiones de no usar WPVibe, Make o Elementor Pro cuando existe alternativa propia/gratuita.
- Verificar si la sesión browser en Chat normal permite teclear; Opera Connector actual permite lectura/navegación pero NO escritura en formularios. No fingir E2E manual de chat sin herramienta admitida.

### P2 · Control empresarial, fábrica y multiempresa
1. Adaptadores de control reales solo para recursos LAB seguros; proteger company_id, engine_id, environment, version y actor; estados OLD vs NEW, concurrencia, idempotencia, firmas/recibos, rollback y tests de denegación. El demostrador LAB-DEMO-001 no certifica ejecución autónoma ni ACCELERATE real.
2. Separar control plane, gateway, model router y runtimes; FACT-001 fábrica primero: scaffold declarativo + contratos+permisos+tests+evaluación+tribunal+observabilidad+coste+backup+rollback+rebuild+training.
3. Preparar Company Registry y onboarding multiempresa mediante el pipeline ya definido (discovery, footprint, web, SEO/local SEO, keywords, competidores, RRSS, marketing, knowledge, CRM/App bootstrap, automatizaciones, training, supervisor, backup/rebuild). No reestructurar sistemas existentes.
4. Consolidar UX responsive móvil/tablet/PC, voz, búsqueda universal, estados de conectores, observabilidad de coste, historial y alertas. Dar prioridad a errores realmente bloqueantes y cerrar gates, no a cambios cosméticos.
5. Promoción gradual única si contratos, permisos, pruebas, evaluación/tribunal, backup, rollback FÍSICO, reconstrucción, coste medido, políticas y aceptación E2E están VERDES. Mantener aislamiento del Trading LAB y REAL_AUTHORIZED=false mientras existan gates.

## 5. Criterios de aceptación y evidencia por cada bloque
- Diferenciar HECHO/EXISTENTE/PARCIAL/DEFINIDO/PLANIFICADO/POR AUDITAR/BLOQUEADO.
- Entregar exactamente: archivo/ruta y commit o recurso ID, origen, lectura o mutación, fecha, test y resultado, URL real privada/ pública según corresponda, riesgos, rollback real ensayado o pendiente, gasto incremental/medido, y siguiente gate.
- Pases: unit/contrato, typecheck/build, negativos de acceso, Playwright sintético, PREVIEW, lectura física owner, comparación OLD vs NEW, rollback, multiempresa y no-PRD. No afirmar promoción ni salud completa solo porque CI está verde.
- Antes de cambios: SHA esperado + rama no main + PR DRAFT + recurso exacto + inventario local de dependencias afectadas. No auditoría general repetida.
- Cambios en GitHub únicamente en rama LAB PR #66, sin fusionar; commitear de manera acotada. Evitar inflar CI mediante commits cosméticos repetitivos.
- Ningún envío de credenciales, acciones económicas o elevación de privilegios. HUMAN_REQUIRED solo por gates reales. Aceptar cumplimiento parcial verificable si el conector limita acciones.

## 6. Documentos y rutas clave
- Contrato base: cerebro/universal/v0/OPERATIVA_UNIVERSAL_CONTRATO_REAL_V1_2026-11-15.md
- Este handoff: cerebro/universal/v0/CEREBRO_OPERATIVA_TRASPASO_CHAT_NORMAL_2026-11-15.md
- Prompt de continuación copia-pega: cerebro/universal/v0/PROMPT_CONTINUAR_OPERATIVA_CHAT_NORMAL_2026-11-15.md
- Fuente histórica: cerebro/universal/v0/device-runtime-snapshot-fenix-2026-11-15.json
- Lector de dispositivos: cerebro/universal/v0/device-live-reader/index.ts y device-projection.mjs
- Lector trabajos: cerebro/universal/v0/agent-job-live/index.ts y job-projection.mjs
- API Preview: api/cerebro-device-live.ts y api/cerebro-agent-job-live.ts
- UI: src/CerebroFleetControlPanel.tsx, src/CerebroDeviceLivePanel.tsx, src/CerebroAgentJobLivePanel.tsx y src/CerebroOperativeCockpitV3Bridge.tsx
- Tests: cerebro/universal/v0/operator-job-live.test.mjs, operator-runtime-evidence.test.mjs, operator-device-snapshot.test.mjs, tests/cerebro-operativa-owner-quickreads-lab.spec.ts
- Fuente de pruebas y operación física en comentarios de PR #66 (incluido comentario 6902298000).
- Registros de fábrica, runbook, changelog, dependencies, backup/rebuild y estado de autonomía deben enlazar al resultado de cada siguiente incremento.

## 7. Arranque exacto del SIGUIENTE CHAT NORMAL
Leer este documento y el prompt enlazado (ambos en repo y rama LAB). Primeras consultas, acotadas: PR#66 HEAD/draft; estado de dos Edge; último Preview/SSO y CI del SHA; contrato exacto de seguridad de lectores. No buscar estado global durante horas ni repetir la implementación ya demostrada. Seleccionar el primer gate P0-A y EJECUTARlo con conectores Chat normal. Si aparece un bloqueo legal/seguridad/coste o herramienta exclusiva Work, explicarlo en 2-3 frases y avanzar al siguiente bloque seguro. Mantener documentación sincronizada de hechos nuevos; no afirmar que el resto del sistema esté operativo si no hay evidencia.

