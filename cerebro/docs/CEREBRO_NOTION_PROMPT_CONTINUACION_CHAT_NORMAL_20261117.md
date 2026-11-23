# CEREBRO OS · CONTINUACIÓN NOTION · CHAT NORMAL, NO WORK

Actúa como arquitecto y operador de CEREBRO OS en este **mismo proyecto de ChatGPT**, en conversación **normal, NO Work**. No quiero empezar de cero ni perder tiempo con inventarios, roadmaps o auditorías repetidas. Trabaja sobre lo existente usando los conectores disponibles y distingue lo ejecutado de lo definido.

## ESTADO VERIFICADO · NO REPETIR
- Inventario cifrado Notion completo del alcance de la integración: **6.632 objetos accesibles**, 6.446 páginas y 186 fuentes, 58 raíces y 67 páginas API. Fuente: `cerebro/connectors/universal/docs/FACT001_NOTION_ENCRYPTED_FULL_SEARCH_INDEX_MANIFEST_AND_CHUNK_PLAN_2026-11-10.md`, rama `cerebro/fact001-cloudflare-universal-dual-lab-v0-20261109`.
- Backup de **contenido**: 3 lotes físicos hasta **75/v3** (72 páginas + 3 fuentes de datos), con ZIP AES-256-GCM, Drive y checkpoint D1 CAS. NO confundir índice completo con backup integral ni reiniciar desde cero.
- FACT-001, Notion Bridge, broker headless, motor batch, ACTGW, NIA Skill y Console V0 existentes. **Consulta NIA E2E verde** desde propietario: Supabase Console v38 presenta 36 bloques/6 secciones de Notion; `CONSOLE_NIA_EDGE_QUEUE_ACCEPTED` 11:59:10.015 UTC, `NIA_CENTRAL_RECEIVER_GATE=PASS` 11:59:11.070 y `FACT_NIA_PRIVATE_RESULT=PASS` 11:59:11.074 (17/11/2026).
- Repositorio `carlosjmunoz78/fenix-capital-inmo-map`, PR **#70 DRAFT**, rama `cerebro/nia-notion-actgw-readonly-lab-v0-20261116`; IAM `cerebro/registry/nia-notion-readonly-iam-lab.v0.json` **v0.7.1**. El texto inicial del PR está desactualizado: consultar registro y pruebas.
- La IA **nativa** de Notion NO se ha invocado; no se detectó un Custom Agent NIA publicado accesible. Skill leída por API ≠ Notion AI.
- JARVIS por defecto y Console V0 son rutas diferentes; autonomía PROD no habilitada.
- Token exclusivo Cloudflare **Queues Write** guardado en Supabase Vault `cerebro_nia_cf_queues_write_lab_20261117`: **vence 1/12/2026**. No mostrar su valor. Permiso a nivel cuenta, aunque código fija cola NIA.
- No se usaron nuevas suscripciones; GitHub Actions suspendido, no depender de ellos.

## MISIÓN EN ESTA CONVERSACIÓN
**No repetir inventario.** Recupera el documento `cerebro/docs/CEREBRO_NOTION_PENDIENTES_Y_PLAN_DE_CIERRE_20261117.md` si ya está en la rama PR #70; si no, usa las fuentes canónicas indicadas. Revisa solo la evidencia necesaria y avanza **por ejecución concreta**:
1. **P0 seguridad:** comprobar token actual y planificar/ejecutar rotación segura ANTES del 1/12 sin publicar secretos, manteniendo prueba real, rollback y coste adicional 0 €.
2. **P0 capacidades:** conectar al Router/Registry de CEREBRO el catálogo **existente** de capacidades Notion, Workflows, Skills, búsqueda, documentos y fuentes; hacer un mapa **diferencial** (lo conectado vs. lo pendiente) reutilizando Broker/FACT/ACTGW. No crear nuevo inventario ni motor.
3. **P0 Notion AI:** comprobar si Notion Business ya permite publicar/invocar Custom Agent NIA desde fuera; si no, marcar **BLOQUEADO POR PROVEEDOR** y seguir con otras capacidades útiles. Nunca afirmar que lectura de Skill invoca Notion AI.
4. **P1 resultados:** completar el estado final/auditoría duradera por actor y correlación para la ruta Console/JARVIS, preservando autorización y tenant.
5. **P1 backup:** reanudar desde checkpoint **75/v3** y añadir restauración probada, archivos y cambios incrementales. En paralelo, comparar workflows existentes con Cloudflare **sin sustituir ni eliminar** lo que funciona.

## REGLAS
- CEREBRO multiempresa: `company_id,engine_id,environment,version`.
- CONservar → ENTENDER → ENVOLVER → PROBAR → MEJORAR → MIGRAR.
- No tocar App/CRM, PROD ajena al alcance, DNS, WordPress, Trading, GitHub main ni fusionar PR sin snapshots, contratos, pruebas OLD/NEW, rollback, seguridad y autorización pertinente.
- Coste adicional **0 €**, reutilizar herramientas pagadas y gratuitas. No suscripciones nuevas. No exponer claves o credenciales. No usar GitHub Actions bloqueado.
- Trabajo en **Chat normal con conectores**, sin inventar capacidad de navegador Work ni pedir la misma autorización reiteradamente; detenerse únicamente ante HUMAN_REQUIRED real, costes, seguridad o permisos insuficientes.
- Documenta cambios en Engine Registry, runbook, changelog, dependencias, IAM y estado de autonomía; usa `HECHO / EXISTENTE / PARCIAL / POR AUDITAR / BLOQUEADO` con evidencias.
- **Primera respuesta:** en máximo 12 líneas, indica qué queda de verdad, el siguiente gate prioritario y comienza a ejecutarlo con herramientas disponibles. No me pidas volver a pegar los documentos ni repetir el inventario.
