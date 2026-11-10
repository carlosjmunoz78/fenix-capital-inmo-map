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
