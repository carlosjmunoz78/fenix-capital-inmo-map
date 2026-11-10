# FACT-001 · Notion governed operator candidate · 2026-11-10

## Estado
HECHO EN CODIGO Y CI; NO DESPLEGADO EN CEREBRO. La prueba real de restauración Notion ya finalizó en https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42859689267; no se ha repetido.

## Reutilización de infraestructura
- Cloudflare D1 EU existente: cerebro-fact001-recovery-lab-eu (UUID 1305f791-7c44-47f9-946b-f330a09c88aa). No se crea nueva D1 ni se modifica el esquema.
- Worker existente cerebro-fact001-recovery-runner-lab: Cron */5 * * * * y solamente fact001.lab.heartbeat. No ejecuta Notion.
- Módulo existente src/recovery-d1-ledger.mjs: claim CAS e idempotencia mediante fact001_recovery_v1; no guarda cuerpos, secretos ni datos de páginas.
- Supabase Edge Function cerebro-fact001-headless-provider-lab v12 ACTIVE con hash original. No se añade ruta de escritura ni se toca el Gateway.

## Nuevo código
- services/provider-headless-lab/notion-governed-operator.mjs: candidato OFF por defecto, writesEnabled=false.
- Operaciones acotadas: notion.lab.child.restore, notion.lab.child.trash, notion.lab.child.rename, solo sobre subpáginas LAB sintéticas registradas y autorizadas de Wiki Fénix Capital.
- Ámbito fijo company_id=fenix-capital, engine_id=FACT-001, environment=LAB, version=1.0.0, client_id=cerebro y source=owner_order.
- Identidad verificada externamente por firma mediante verifyTransport; nunca se aceptan permisos autoafirmados desde JSON ni se intercambian credenciales entre ChatGPT y CEREBRO.
- Antes de PATCH: verificación padre/hijo, ownership duradero, título/revisión esperados, coste, D1 CAS, snapshot persistente y auditoría. Después: GET de verificación, settlement; si resultado incierto, RECONCILE sin reintento.
- Contratos de inyección faltantes para operación física: ownership persistente, snapshots seguros, audit append-only, provider, costGuard real y service-to-service identity. Declarar durable=true no demuestra persistencia sin adaptador físico.

## Pruebas
- GitHub Actions https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42861826414 : 65/65 PASS, 0 FAIL (48 broker + 5 registry + 8 onboarding + 4 scaffold). Incluye SQLite CAS real local con mock de Notion, concurrencia, conflicto, recuperación, autorización, cuota, auditoría, snapshots y orden de operaciones. NO E2E remoto Notion.
- Guard CI añadido: prohíbe importar el nuevo operador desde index.ts de servicio activo antes de promoción.
- La ejecución #42861601389 falló por contradicción de estado en el Registry histórico. Corregido sin relajar el test: backup_and_rollback=PENDING y evidencia de restauración unitaria aislada en scoped_restore_evidence.

## Gates restantes
1. Inventario, punto de recuperación y snapshot de D1 Recovery antes de alterarla.
2. Construir registro de propiedad de subpáginas, snapshots cifrados y audit append-only reutilizando D1 Recovery EU únicamente tras prueba OLD vs NEW y rollback.
3. Conectar identidad independiente de CEREBRO y credencial Notion guardada en Supabase Vault con permisos mínimos; no copiar token a D1.
4. Cost guard físico, límites, permisos por operación, idempotencia/reconciliación tras fallo y pruebas de múltiples workers.
5. E2E de un trabajo sintético por orden firmada CEREBRO, luego cola programada solo tras tribunal, backup y política. No publicar, no extender a PROD.

## Estado final
- Restauración individual Notion real: VERIFICADA LAB.
- Operador gobernado de escritura: CODE + LOCAL CI GREEN / NO DEPLOY.
- Autonomía Notion general: PENDIENTE. Mantener 6/11 gates completos, sin verde ficticio.
- Sin nuevas suscripciones (0 EUR). No se han tocado App, CRM, DNS, main, PROD ni Worker o D1 originales.
- PR #44 permanece DRAFT.
- NEXT_BLOCK: FACT001_NOTION_DURABLE_OWNERSHIP_SNAPSHOT_AUDIT_BINDING_LAB.


## BLOQUE SIGUIENTE EJECUTADO · Contratos D1 completos (NO MIGRADOS)
- Añadido services/provider-headless-lab/notion-d1-adapters.mjs: esquema aditivo de 3 tablas LAB, dos triggers de auditoría inmutable y adaptadores para propiedad de subpáginas, snapshots y eventos; sin SQL contra Cloudflare remoto. Tests del contrato y ensamblaje con Recovery D1 local y Notion mock: tests/notion-d1-adapters.test.mjs.
- **CI REAL:** https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42862702505 — SUCCESS, **71/71 PASS**, 0 FAIL (54 broker + 5 registry + 8 onboarding + 4 scaffold). El mismo workflow mantiene el gate de no importar el candidato al servicio v12.
- Inventario Cloudflare vivo, solamente lectura: D1 EU cerebro-fact001-recovery-lab-eu, Worker cerebro-fact001-recovery-runner-lab con un solo binding RECOVERY_DB a esa D1; Cron */5 * * * *; configuración enabled=1 y max_jobs_per_tick=1, único job tipo heartbeat COMPLETED. La cuenta sigue con 9 D1, no se crea ninguna.
- Cloudflare D1 Time Travel GET bookmark devolvió SUCCESS para el snapshot actual. El bookmark no se guardó en GitHub ni se ejecutó Restore. **No equivale a export independiente ni rollback físicamente probado**; se requiere un gate adicional antes de aplicar el nuevo esquema.
- Consulta remota a sqlite_master confirma: 0 tablas fact001_notion_% en D1 activa. El esquema nuevo está exclusivamente en Git, **NO EJECUTADO**.
- Supabase cerebro-fact001-headless-provider-lab v12 y Notion ya configurado conservados; sin nuevos endpoints, tokens, tablas, rutas externas ni acciones provider. No se ha repetido la restauración E2E anterior.
- **NEXT_BLOCK REAL:** checkpoint/export verificable de D1 + snapshot/rollback ensayado sin alterar heartbeat; después schema paralelo de propiedad/snapshots/audit en LAB, prueba comparativa OLD vs NEW, identidad segura Gateway → Notion service Vault, una única operación sintética física, y solo después estudiar automatización. La cola real actual no soporta Notion y queda sin cambios.


## CIERRE FISICO · PERSISTENCIA D1 Y ROLLBACK AISLADO · 10/11/2026

**Datos demostrados en Cloudflare oficial, no simulación.** Esta sección actualiza y sustituye los estados históricos que indicaban esquema D1 de Notion NO EJECUTADO y rollback NO PROBADO. Los otros gates siguen pendientes si no hay prueba.

- **Origen preservado:** D1 `cerebro-fact001-recovery-lab-eu` UUID `1305f791-7c44-47f9-946b-f330a09c88aa`, jurisdicción UE. Worker `cerebro-fact001-recovery-runner-lab` sigue con binding único `RECOVERY_DB` a esa D1, Cron `*/5 * * * *`, `enabled=1`, `max_jobs_per_tick=1`. No cambios de código, rutas, horarios, Gateway ni tareas externas.
- **Backup exportable:** la API Cloudflare D1 SQL Export devolvió `status=complete`, `at_bookmark=0000005c-00000000-0000511f-b42b4f42f35eba796f113f5596c0b2c5` y URL de descarga temporal; la descarga no fue autorizada por el proxy del conector. **No declarar un archivo SQL externo guardado**, no distribuir URLs temporales firmadas.
- **Clonación física de recuperación:** creada solo para el ensayo la D1 UE `cerebro-fact001-rollback-check-lab-20261110` (UUID `25f8e9f9-09b7-4381-b0d4-edc3db87abf1`). Copiados las 4 tablas, 1 índice y sus datos a partir de la D1 original: filas `recovery=1, config=1, jobs=1, ticks=98` al tomar la copia. Hash SHA-256 de resultados ordenados IGUAL en origen y destino por tabla.
- **Primer rollback físico:** en la copia se creó una tabla marcadora sintética; Time Travel Restore por bookmark devolvió success; comprobación SQL posterior confirmó que el marcador desapareció y permanecieron las 4 tablas con sus 98 ticks.
- **Ensayo de migración paralelo:** aplicada en la copia la definición exacta de `notion-d1-adapters.mjs`: 3 tablas Notion + 2 triggers de auditoría. Se insertaron exclusivamente registros sintéticos y se comprobaron `INSERT/SELECT`, rechazo de parentesco no autorizado y disparo de `AUDIT_IMMUTABLE` ante UPDATE de auditoría.
- **Segundo rollback físico, específicamente de la migración:** Time Travel Restore de la D1 temporal a bookmark previo eliminó todas las tablas Notion añadidas; se verificó SQL que las 4 tablas iniciales seguían con `1+1+1+98` filas, sin ninguna tabla `fact001_notion_%`.
- **Instalación en D1 LAB original, aditiva:** tras esos gates se aplicó el esquema exacto en D1 original: 3 tablas `fact001_notion_owned_children_v1`, `fact001_notion_snapshots_v1`, `fact001_notion_audit_v1`; 2 triggers de inmutabilidad `fact001_notion_audit_block_update/delete`. Se registró una sola subpágina sintética ya existente en Trash (UUID `41481b1a-756d-8119-b1fa-c38a9d013a35`) en tabla `owned_children` con `approved=0`: persiste, pero **no concede permiso para escribir**. No se realizó ninguna escritura en la API de Notion.
- **OLD vs NEW confirmado:** datos originales `recovery=1, config=1, jobs=1` intactos y ticks crecientes por Cron; se releyeron Worker schedule y su único D1 binding. No modificaciones a las 4 tablas anteriores ni a su contrato.
- **Limpieza y capacidad:** la D1 temporal fue eliminada por UUID/nombre exactos; GET final Cloudflare confirmó **9 D1** en la cuenta y ausencia de la temporal. Ningún recurso adicional persistente salvo 3 tablas y 2 triggers LAB en D1 Recovery existente.
- **Seguridad/presupuesto:** sin nuevas suscripciones; la cuenta permanece en Cloudflare Free sujeto a cuotas. Sin cambios en App/CRM, WordPress, DNS, main, PROD, Supabase Edge v12 ni CEREBRO Gateway.

**Gates:**
- `notion_d1_persistence_lab = VERIFIED_PHYSICAL`.
- `isolated_migration_rollback = VERIFIED_PHYSICAL`.
- `cloudflare_sql_export_generation = VERIFIED`.
- `external_retained_sql_backup_file = PENDING`: archivo SQL firmado no se pudo descargar/verificar.
- `service_identity_to_d1_to_notion_write_executor = PENDING`: las pruebas físicas D1 se hicieron con el conector Cloudflare de ChatGPT, **no** son la ejecución remota autónoma de CEREBRO.
- `backup_and_rollback` de Notion **sigue PENDING** en el registro integral porque falta archivo externo, pruebas completas de reconstrucción y rollback de servicio, no solo D1 LAB.
- `autonomous_queue`, `cost_guard_verified`, `production_promotion_policy`, `observability_and_audit` globales siguen PENDING. No afirmar 11/11 ni autonomía Notion.
- **NEXT_BLOCK:** enlazar identidad CEREBRO firmada con el broker y D1 persistente sin credenciales en Worker; registrar snapshot/audit y ejecutar un único comando LAB sintético sobre Notion, con lectura postacción, reconciliación, costes y rollback. Después certificar autonomía sin activar PROD prematuramente.
