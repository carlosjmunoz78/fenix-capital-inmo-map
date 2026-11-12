# FACT-001 · Cloudflare UNIVERSAL · Operaciones CRUD y límites reales
Fecha: 2026-11-09 · Empresa: fenix-capital · Motor: FACT-001 · PR #44 DRAFT.

## Alcance oficial observado

El conector conectado a ChatGPT normal expone la especificación Cloudflare OpenAPI con **3.763 operaciones** en **2.345 rutas** (conteo de lectura del schema, no de permisos concedidos ni de pruebas físicas). Desglose: GET 1.840, POST 795, PUT 366, PATCH 274, DELETE 488. No implica acceso irrestricto ni que todos los servicios estén incluidos en la cuota gratuita.

ChatGPT normal: ejecutó con identidad autenticada del usuario 3 GET reales (D1/Workers/Access), creó una namespace Workers KV nueva EU por POST, escribió por PUT una clave temporal, leyó por GET y eliminó por DELETE; rollback verificado. Namespace exacta `cerebro-fact001-write-e2e-eu-lab-20261109`, ID `fbeb7be5bb81494a8316d8c4221d6a8e`, jurisdicción `eu`. Coste adicional de suscripción 0 EUR. No tocaron recursos anteriores.

CEREBRO desplegado: nueva Edge Function aislada `cerebro-fact001-cloudflare-kv-write-lab` v1. Función anterior de solo lectura sigue en v1, y Console principal v33 sin cambios. Dos ejecuciones reales GitHub OIDC → Supabase Vault → Cloudflare KV PUT/GET/DELETE con 21/21 pruebas de seguridad en ambas:
- [Primera ejecución #42696938902](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42696938902): SUCCESS.
- [Segunda ejecución #42697512937](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42697512937): SUCCESS.
- GET Cloudflare posterior: `leftover_test_keys=0`, `jurisdiction=eu`; no hay claves de prueba.
- HTTP 401 anónimo y token falsificado, HTTP 200 OIDC firmado. Credencial extraída de Vault, no retransmitida por workflow.

## Estado por superficie

| Tipo de operación | ChatGPT normal | CEREBRO LAB | CEREBRO PROD |
| --- | --- | --- | --- |
| Cuenta / Workers / D1 / Access GET | VERIFICADO | VERIFICADO en inventario limitado | Gateway v33 NO ENLAZADO |
| Crear recurso nuevo | KV namespace EU + D1 EU VERIFICADOS | D1 EU nueva VERIFICADA; KV namespace creación NO probada | NO |
| Escribir en recurso nuevo aislado | KV PUT + SQL D1 INSERT VERIFICADOS | KV PUT + SQL D1 INSERT VERIFICADOS | NO |
| Leer dato escrito | KV GET + SQL D1 SELECT VERIFICADOS | KV GET + SQL D1 SELECT VERIFICADOS | NO |
| Rollback/borrado dato nuevo | KV DELETE + D1 DELETE VERIFICADOS | KV DELETE + D1 DELETE VERIFICADOS | NO |
| Modificar recurso preexistente | Conector técnicamente apto sujeto a permisos y gates; NO probado | NO AUTORIZADO, bloqueado por política | NO |
| Escribir DNS, WAF, Access PROD, Workers PROD, D1 PROD | NO EJECUTADO; contratos/snapshots pendientes | NO | NO |
| R2 | 403 / 10042 NotEntitled en pruebas anteriores | NO | NO |
| Logpush | 403 / permiso distinto | NO | NO |
| Token API con privilegio mínimo | Gestión token 403 / código 9109 | Reutiliza temporalmente secreto administrativo en Vault SOLO LAB | NO |

## Regla de gobierno del API universal (no 3.763 servidores)

Cada capability de FACT-001 tiene `company_id`, `engine_id`, `environment`, `version`, esquema OpenAPI, nivel de riesgo y coste, permisos, política, controles de idempotencia, backup, rollback, observabilidad y pruebas. Las operaciones GET son de consulta; POST/PUT/PATCH/DELETE se habilitan por operación y por recurso, no mediante una autorización universal sin controles. El principio es CONSERVAR → ENTENDER → ENVOLVER → PROBAR → MEJORAR → MIGRAR. En LAB se puede probar con recurso nuevo aislado, en PROD exigir adicionalmente snapshots, dependencia, OLD vs NEW, PREPROD/CANARY, tribunal, política e intervención humana únicamente en casos HUMAN_REQUIRED establecidos.

**Bloqueos de promoción real**: el Gateway principal CEREBRO no llama a la función LAB; JWT de usuario de pruebas caducado; falta token Cloudflare dedicado mínimo privilegio (la identidad del conector no tiene permiso para crear tokens); los recursos preexistentes no tienen inventario/backup/rollback específicos. Por tanto **no afirmar «todo en verde» para escritura completa de la cuenta**.

## Runbook rollback LAB

Los dos jobs efectuaron DELETE de sus claves. Un fallo temporal tras PUT dispara cleanup compensatorio en el código; TTL 600 segundos limita residuos. Una prueba de lectura posterior de Cloudflare confirmó cero claves. El espacio KV nuevo permanece con nombre y jurisdicción UE para pruebas posteriores, sin bindings en Workers. La función nueva es independiente y puede deshabilitarse sin afectar CEREBRO Console v33 ni otros recursos. La PR #44 permanece DRAFT. No fusionar ni habilitar PROD sin superar las condiciones anteriores.


## Segunda ronda CRUD real: D1 europeo en ambos clientes · 2026-11-09

**ChatGPT normal directo:** listado inicial 8 bases D1. El nombre `cerebro-fact001-d1-crud-eu-lab-20261109` no existía. POST creó base europea UUID `97257e8d-9491-4fa9-af76-c5f0522cc213`, POST SQL creó tabla, POST SQL insertó valor, POST SQL SELECT verificó el valor, DELETE eliminó exclusivamente el UUID nuevo. Nueva consulta final: 8 bases originales, cero bases de prueba y cero modificaciones de las bases preexistentes. Todo sin Work.

**CEREBRO LAB desplegado:** función aislada `cerebro-fact001-cloudflare-d1-write-lab` ACTIVE v1, no desplaza al Gateway Console v33. Orden `CD1-20261109-002` desde GitHub OIDC firmado → servicio Supabase LAB → Vault → Cloudflare: crea D1 EU con nombre fijo derivado del ID, consulta snapshot de las ocho UUID originales, ejecuta CREATE TABLE + INSERT + SELECT de SQL fijo, elimina exclusivamente su base nueva por UUID/nombre/jurisdicción y revalida las ocho originales. GitHub [ejecución #42700998048](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42700998048) **SUCCESS**; 22/22 tests. HTTP 401 para anónimo y JWT falsificado, 200 para OIDC firmado. Cloudflare consultado después desde ChatGPT normal: 8 D1, cero residuos de LAB. Ninguna credencial API enviada en la orden, el servicio reutiliza la de Vault.

**Aceptar LAB:** creación/SQL/borrado para D1 **nuevas y efímeras** y CRUD KV LAB nuevo. **No aceptar PROD** ni operaciones arbitrarias sobre D1 previas; pendiente token separado de mínimos permisos, unión con Console principal y contratos de snapshots/rollback por tipo de recurso. Los servicios LAB siguen separados y la PR permanece DRAFT.
