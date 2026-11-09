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
| Crear recurso nuevo | KV namespace EU VERIFICADO | NO PROBADO; definido para siguiente motor | NO |
| Escribir en recurso nuevo aislado | KV PUT VERIFICADO | KV PUT VERIFICADO | NO |
| Leer dato escrito | KV GET VERIFICADO | KV GET VERIFICADO | NO |
| Rollback/borrado dato nuevo | KV DELETE VERIFICADO | KV DELETE VERIFICADO | NO |
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
