# CEREBRO OS · NOTION · TRASPASO SIN REPETICIONES
**Fecha de corte:** 17/11/2026 · **Modo de continuación:** Chat normal del mismo proyecto, NO Work.  
**Regla:** CONservar → entender → envolver → probar → mejorar → migrar. No rehacer inventario ni romper App/CRM/PROD.

## 1. Estado acreditado (NO REHACER)
| Bloque | Evidencia / situación |
|---|---|
| Inventario Notion | Índice cifrado de **6.632 objetos buscables accesibles a la integración** (**6.446 páginas + 186 fuentes de datos**); **58/58 raíces**, recorrido de **67 páginas API** y `has_more=false`. Es un inventario del alcance de esa integración, no prueba de cobertura de comentarios, adjuntos, versiones históricas o contenido invisible. |
| Backup contenido Notion | Tres lotes de contenido **0→25, 25→50, 50→75** exportados y cifrados. **72 páginas y 3 fuentes de datos**, con evidencias de lectura y ZIP en Drive. Checkpoint documentado **75/v3** en D1 CAS del LAB; no reiniciar ni declarar backup integral. |
| Broker y operativa Notion | Existen operador headless, motor por lotes, manifiestos, cifrado AES-256-GCM, registros y workflows; preservar. El inventario y el plan de backup están en el PR LAB de FACT-001. |
| Console → NIA | **HECHO y probado físicamente:** Console V0 `cerebro-console-gateway-v0` **v38** (Supabase) autentica actor propietario, lee Skill NIA mediante token de servicio Vault y presenta **36 bloques / 6 secciones**. Envía orden a Cloudflare Queues; FACT-001 firma HMAC y NIA realiza lectura vía ACTGW + SQLite Durable Object. |
| Prueba E2E 17/11 | Supabase `CONSOLE_NIA_EDGE_QUEUE_ACCEPTED` **11:59:10.015Z**; NIA `NIA_CENTRAL_RECEIVER_GATE=PASS` **11:59:11.070Z**; FACT `FACT_NIA_PRIVATE_RESULT=PASS` **11:59:11.074Z**. Correlación por hora/etapas, **no** por identificador duradero común. |
| Código / protección | PR **#70 DRAFT**, rama `cerebro/nia-notion-actgw-readonly-lab-v0-20261116`, IAM `cerebro/registry/nia-notion-readonly-iam-lab.v0.json` **v0.7.1**. Frontend App React, CRM, DNS y motores no relacionados sin modificar. Producción autónoma de NIA **NO** habilitada. |
| Notion AI nativa | **NO EJECUTADA:** búsquedas de Custom Agents publicados no encontraron agente NIA disponible. Lectura API de Skill ≠ invocación de Notion AI. |
| Coste | Sin suscripciones nuevas; **coste de consumo futuro no medido**. GitHub Actions suspendido: no usarlo como requisito de QA. |

## 2. Pendiente real, por prioridad y criterio de aceptación

### P0. Rotación y seguridad de token Cloudflare (fecha límite)
- **POR HACER:** renovar **antes del 01/12/2026 00:00 UTC** el token `cerebro_nia_cf_queues_write_lab_20261117` de Supabase Vault, sin imprimir secretos.
- Permiso actual: **Queues Write a nivel de cuenta Cloudflare**, aunque el código apunta a una cola específica. Reducir alcance si el proveedor lo permite; si no, mantener ID fijo, aislamiento servidor y caducidad corta.
- Usar emisor/vault ya existentes, verificar nuevo token con envío seguro único, rollback a token anterior durante transición y revocación posterior. No activar emisiones duplicadas ni tocar otras colas.
- **Aceptación:** nueva credencial cifrada, expiración documentada, prueba real Supabase → FACT/NIA y antiguo token revocado o estado de retirada registrado.

### P0. Registrar lo que CEREBRO puede pedirle a Notion (sin inventariar otra vez)
- **PARCIAL:** existe el índice de 6.632 objetos y NIA Skill read. Falta vincular **el catálogo existente** de bases, búsquedas, workflows, acciones, Skills, fuentes y permisos al enrutamiento de CEREBRO / Model Router y al Engine Registry.
- Reutilizar Notion Bridge, FACT-001, ActionGatewayV1 y las rutas ya escritas: **no crear otro broker, otro inventario ni duplicar motores**.
- Distinguir API disponible/lectura, escritura permitida por IAM, automatización Notion preexistente, recurso nativo solo usable en UI, recurso no invocable.
- **Aceptación:** matriz por capacidad con `company_id`, `engine_id`, `environment`, permisos, origen, coste, ruta ejecutora, estado y evidencia; al menos un flujo READ completo reutilizando el índice además de la Skill NIA. Nada de habilitar escrituras por defecto.

### P0/P1. Resolver Notion AI sin prometer capacidades inexistentes
- **BLOQUEADO POR CAPACIDAD EXTERNA:** no hay Custom Agent NIA publicado accesible en el conector; `notion_spawn_session` requiere un agente publicado. Comprobar configuración/permisos de Notion Business y si se puede publicar un agente usando lo **ya pagado**; separar uso nativo dentro de Notion del uso remoto desde CEREBRO.
- **Aceptación:** o bien agente publicado e invocación verificada end-to-end sin suscripción nueva, o dictamen formal de que la invocación externa no está disponible con los permisos/plan actuales y ruta alternativa gratuita, **sin simular que se ha llamado a Notion AI**.

### P1. Procesamiento con resultado trazable en Console y JARVIS
- **PARCIAL:** la Console V0 puede mostrar resultado sincrónico de lectura de la Skill; FACT/NIA procesa la Queue; `QUEUED` no es `DONE`.
- **POR HACER:** trazabilidad persistente `actor_id + company_id + correlation_id + request_id + engine_id + status` desde Console/JARVIS → Queue → FACT → NIA → resultado y auditoría; lectura de estado final con garantía de tenant y redacción de datos. Reutilizar runtime/observabilidad.
- **POR AUDITAR:** JARVIS **predeterminado** (`/cerebro`) tiene ruta distinta a Console V0 (`?section=legacy-v0`); NO atribuirle todas las capacidades verificadas de Console.
- **Aceptación:** una orden autenticada y su estado final visible desde la interfaz adecuada, con logs por ID y negativos de suplantación/tenant. No modificar PROD automáticamente sin OLD/NEW, backup, gate y rollback.

### P1. Continuar backup Notion desde 75/v3, no desde cero
- **PARCIAL:** 75 objetos tienen copia física de contenidos; 6.632 objetos en índice. Los restantes requieren confirmar cobertura y cambios desde corte.
- Reutilizar motor batch y checkpoint CAS existente; continuar desde **75/v3**, añadir archivos/adjuntos, comentarios, cambios incrementales, escrow externo de clave, pruebas de restauración LAB y auditoría SHA. No saturar Supabase con documentos pesados.
- **Aceptación:** lotes siguientes con ZIP cifrado + readback/hash, checkpoint incrementado SIN saltos, restauración real en espacio LAB y reporte de cobertura de **cuerpos** separado de **índice**. No bloquear el resto por el backup.

### P1/P2. Aprovechar Notion vs. Cloudflare sin desmantelar lo que funciona
- **POR AUDITAR (sin inventario global nuevo):** cruzar los workflows YA documentados GitHub–Notion con los de Cloudflare, comparando coste, latencia, confiabilidad, permisos, cuota y dependencias.
- **Aceptación:** mapa `MANTENER EN CLOUDFLARE / EJECUTAR EN NOTION / ENVOLVER / DESCARTAR PROPUESTA`, evidencias antes de desactivar cualquier workflow. Ninguna migración automática, sin doble ejecución.

### P2. Supervisión / costes / autonomía
- Costes efectivos, cuotas, rate limits, alertas, políticas de `HUMAN_REQUIRED`, idempotencia, observabilidad, backup y rollback. Gobierno multiempresa.
- **Aceptación:** tribunal y PREPROD; producción autónoma solo con contrato, IAM, tests, logs, rollback y coste medido VERDES. Cero suscripciones nuevas.

## 3. Restricciones de ejecución
- **NO** repetir el inventario 6.632, ni reconstruir el broker, el motor batch, NIA, FACT-001 o la Console.
- **NO** modificar App/CRM, WordPress, DNS, Trading ni servidores productivos ajenos al alcance. Para cambios puntuales al backend existente, exigir snapshot, contrato, tests OLD/NEW, despliegue paralelo, rollback y autorización pertinente.
- **NO** usar GitHub Actions mientras esté suspendido. En Chat normal usar conectores disponibles, no fingir navegador Work ni ejecución cuando no haya herramientas.
- **NO** imprimir tokens, JWT, API keys ni secretos. Solo usar Vault existente.
- **NO** confundir un mensaje en cola, una lectura API o una Skill con IA nativa, resultado final o autonomía PROD.
- Cada operación debe registrar `HECHO / EXISTENTE / PARCIAL / DEFINIDO / PLANIFICADO / POR AUDITAR / BLOQUEADO`; evidencia verificable y siguiente paso exacto.

## 4. Fuentes canónicas
- Registro IAM: `cerebro/registry/nia-notion-readonly-iam-lab.v0.json`, rama PR #70.
- Cierre V38: `cerebro/docs/NIA_CONSOLE_READABLE_RESULT_V1.md`, rama PR #70.
- Runbook Console/Supabase: `cerebro/docs/NIA_CONSOLE_V37_PROD_READONLY_GATE_20261117.md`, rama PR #70.
- Manifiesto/backups FACT: `cerebro/connectors/universal/docs/FACT001_NOTION_ENCRYPTED_FULL_SEARCH_INDEX_MANIFEST_AND_CHUNK_PLAN_2026-11-10.md`, rama `cerebro/fact001-cloudflare-universal-dual-lab-v0-20261109`.
- Contrato Notion NIA: https://app.notion.com/p/41a81b1a756d81ba8a0ffafe84554824
- PR #70: https://github.com/carlosjmunoz78/fenix-capital-inmo-map/pull/70
- **ATENCIÓN:** la descripción inicial del PR #70 todavía puede reflejar bloqueos del 16/11 y está desactualizada; confiar en el registro IAM v0.7.1 y en sus pruebas, no en ese texto histórico.

## 5. Arranque recomendado del próximo chat
**No otra auditoría.** 1) Recuperar estas fuentes exactas; 2) resolver el token próximo a caducar; 3) sacar mapa diferencial de capacidades Notion ya construidas y rutas de ejecución; 4) atacar exclusivamente un gate funcional P0, con resultados físicos y costes. Enviar progreso y continuar sin pedir al usuario que repita información.
