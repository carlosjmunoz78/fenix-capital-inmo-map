# PROMPT PARA NUEVO CHAT · CEREBRO OS / FACT-001

**MODO: EJECUCIÓN DIRECTA · ANTI-LOOP · COSTE ADICIONAL 0 € · OPERA ÚLTIMO.**

Retoma **FACT-001 · Conectores Universales ChatGPT + CEREBRO** desde los artefactos existentes. Mi objetivo es tener **Cloudflare, GitHub, Supabase, Vercel y Notion** operativos tanto desde ChatGPT normal/GPTs como desde el **CEREBRO Gateway** con dos modalidades: órdenes expresas mías y automatizaciones registradas. **Opera/navegador es el ÚLTIMO bloque**, nunca antes de cerrar los otros cinco.

**FUENTE DE VERDAD, LÉELA PRIMERO (NO ME PIDAS REEXPLICAR):**
- Repo `carlosjmunoz78/fenix-capital-inmo-map`, **PR #44 DRAFT**, rama `cerebro/fact001-cloudflare-universal-dual-lab-v0-20261109`.
- Documento maestro: `cerebro/connectors/universal/docs/FACT001_TRASPASO_MAESTRO_CONECTORES_2026-11-11.md`.
- Registro de 11 gates: `cerebro/connectors/universal/registry/headless-gates.v1.json`.
- Documentos de aceptación en `cerebro/connectors/universal/docs/`: `FACT001_CONNECTOR_AUTONOMY_ACCEPTANCE_ORDER_2026-11-10.md`, `FACT001_CEREBRO_HEADLESS_5_PROVIDERS_2026-11-10.md`, `FACT001_CLOUDFLARE_FULL_CRUD_PHYSICAL_GATES_2026-11-09.md`, `FACT001_NOTION_DUAL_MCP_GITHUB_REPO_CREATE_ACCEPTANCE_2026-11-10.md`, documentación Vercel y Supabase. La Biblioteca contiene copia en `/CEREBRO OS/Traspasos/FACT-001 Conectores/`.

**NO REPITAS TRABAJO:** ya existen pruebas reales de lectura y LAB CRUD para Cloudflare KV/D1/Pages, tests GitHub repo-scoped, Supabase, Vercel y Notion de hijo aislado. Los cinco proveedores están aún **PARCIAL**, no FULL. Notion lleva **100/6.632 objetos cifrados** y checkpoint D1 **100/v4**; no repetir lotes 0→100 ni concentrar todo el esfuerzo en miles de copias antes de resolver conectores. Cloudflare D1 Free ocupa **10/10** bases: NO crear otras. Usa evidencias, CI y hashes existentes. Haz únicamente pruebas nuevas para capacidades nuevas/cambiadas, o preflight breve de seguridad; nunca investigaciones generales ni refactor completo por costumbre.

**PRIORIDAD ESTRICTA DE EJECUCIÓN:**
1. **Cloudflare P0:** corregir/limitar el emisor de tokens demasiado privilegiado sin revocar hasta tener sustituto probado; crear broker backend de credenciales mínimas y ciclo token hijo protegido en Vault; conectar E2E separado ChatGPT y CEREBRO. Primera misión `CF-TOKEN-ISSUER-001_P0_SCOPE_CORRECTION_AND_LAB_BROKER`.
2. **GitHub:** resolver 403 al crear repositorio con GitHub App existente o credencial de servicio de mínimo scope, tokens efímeros; ciclo de vida de **un repo LAB** protegido, ramas/PR/Actions/rollback, sin tocar main.
3. **Supabase:** management sidecar permanente con permisos limitados, contratos para Edge/Storage/DB/Auth, canary JWT, rollback; no tocar PROD App/CRM ni saturar Supabase.
4. **Vercel:** resolver team/account y `authorize_team_access` 403; pedir una única autorización del propietario si realmente la exige, justo cuando pueda abrir el enlace; LAB deploy/rollback y broker estable.
5. **Notion:** operador CRUD de servicio permanente con reglas de página, firmas, idempotencia, backup suficiente y restauración; continuar backup integral como flujo paralelo, no bloquear los otros conectores.
6. **Único runtime/headless común:** Gateway + `UniversalConnectorCore`, dos identidades, entrada `owner_order|automation`, cola duradera, reintentos limitados, auditoría, coste 0 €, rollback, supervisor y dos E2E físicos (ChatGPT y CEREBRO) por capability soportada. No confundir conectar MCP ChatGPT con autonomía del servicio CEREBRO.
7. **OPERA AL FINAL:** reparar binding/timeout `list_tabs`, después navegación, escritura, clic, descargas y sesión humana controlada. Prohibido adelantar este bloque.

**REGLAS NO NEGOCIABLES:** conservar App, CRM, Supabase crítico, Notion, WordPress/SEO, Cloudflare/Workers/DNS existentes, Trading, automatizaciones y `main`. Trabajar en LAB y PR DRAFT. CONSERVAR → ENTENDER → ENVOLVER → PROBAR → MEJORAR → MIGRAR. Nada de compra/suscripción nueva, permisos billing amplios, claves en chat/log/Git, `service_role` en frontend, merges ni cambios PROD sin contratos, snapshot, comparación, tests, rollback y política de promoción. No crear cinco servidores independientes: reutilizar runtime/broker. No anunciar FULL por catálogo de métodos o pruebas aisladas. Marcar `NOT_ENTITLED` o `UNSUPPORTED` donde el proveedor no permita acciones.

**AUTORIZACIÓN:** quedan autorizadas las tareas gratuitas, reversibles y aisladas previstas. NO pedir confirmaciones repetidas. Solo interrumpir por obligación humana real (firma/consentimiento/MFA, legal, riesgo alto, incidente de seguridad, límite económico, conflicto de política o cliente pidiendo humano). Si aparece bloqueo humano concreto, dejar todo preparado e indicar **una sola acción exacta**; continuar con otras tareas independientes.

**FORMA DE TRABAJAR:** ejecuta ahora, no solo diseñes. Preflight breve de PR/registro/credenciales por metadatos y luego resuelve el **primer bloqueo**. Cada tarea debe dejar commit o comprobación física, logs de evidencia sin secretos, test de nuevo comportamiento, recuperación y estado exacto. Actualiza en el repositorio `headless-gates.v1.json`, runbooks, dependencia, coste, changelog y el documento maestro; conserva copia en Biblioteca cuando corresponda. Informa con **HECHO / PARCIAL / BLOQUEADO**, pruebas y siguiente paso. No asegures que algo funciona si no se probó.

**MISIÓN DE ESTE CHAT:** cerrar progresivamente el conjunto de cinco conectores para comandos y automatización real sin depender de GPT específico, y **solo al final Opera**. Empieza por Cloudflare P0 ya; no repitas lo acreditado.