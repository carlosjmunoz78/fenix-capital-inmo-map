# ZEUS · SUPERAGENTE JARVIS · BLOQUE 6 · CORTE 01 · 2026-11-04

**Estado:** PARCIAL · HECHO en LAB, NO-GO PROD. **PR #16 DRAFT**, rama `cerebro/jarvis-b6-capability-executor-v0-20261104`, base PR #15 B5. No modifica main ni el App/CRM. B3/B4 PROD OFF.

## 0. Contrato canónico del Bloque 6
El plan del usuario define B6 como **«Ejecución integral y herramientas»**: router hacia CEREBRO/ZEUS Capability Fabric, API/MCP/CLI/browser/Computer Use, misión contractual, resultados, idempotencia, retries, compensación, rollback y auditoría de conectores reales. Aceptación real: trabajo autorizado extremo a extremo con verificación/reversión. Los tests sintéticos y un conector real de lectura no acreditan el bloque productivo completo.

## 1. Conservación e inventario diferencial
**OLD preservado:** B5 Corte 04 HEAD `b95d59b1305da2492dfa503164719b4b001e685b`, PR #15 DRAFT base B4; B2 y B3 anteriores; `src/cerebroVoice.ts`; rutas App/CRM; Supabase PROD; CEREBRO workers y Gateway preexistentes; Model Router y costes; B9 resiliencia. NO se crea servidor ni se fusiona PR.
**NEW aislado:** PR #16 DRAFT base B5 y código/documentación `zeus/jarvis/core/jarvis-b6-*`, `zeus/jarvis/gates/b6-*`. Todos los permisos de B6 PROD están deshabilitados en código; runtime real no desplegado.

## 2. Ejecutor de lectura cero coste
`jarvis-b6-controlled-read.mjs` compone **B2 principal validado server-side, flag de control, preflight B6, autorización B3 de DESCUBRIR y autorización separada B3 de EJECUTAR, registry trusted, auditoría previa, journal, conector READ, verificador independiente, auditoría de resultado y commit de huella**.
- Solo entorno LAB. Para PROD retorna `PROD_NOT_CERTIFIED` antes de llamar a adaptadores. No acepta ejecución de tipo MUTATION.
- La selección de API/MCP/CLI/BROWSER procede del catálogo B6 existente, no de texto, URL, script o una identidad declarada por el cliente.
- Para el único conector invocable, la aplicación del catálogo debe coincidir exactamente en company/tenant, entorno, capacidad, ID, ruta, coste marginal cero y semántica de solo lectura.
- Idempotencia: un journal inyectado impide segunda invocación cuando existe evidencia terminada; las devoluciones por repetición deben coincidir en propietario, empresa, entorno, misión, capacidad, ID conector, idempotency key y fingerprint.
- El resultado no se marca como HECHO sin verificación y auditoría; fallos de verificador/conector se registran, sin reintento automático. No se revelan token, claves, comandos ni contenido bruto en logs.

## 3. Prueba real de un proveedor
`jarvis-b6-github-read-adapter.mjs` usa GET de GitHub Contents API con `GITHUB_TOKEN` efímero de GitHub Actions, permisos `contents: read` y referencia SHA fijada del PR. El repositorio y ruta están **hardcodeados y permitidos**: `carlosjmunoz78/fenix-capital-inmo-map` y `zeus/jarvis/STATE_B5_CUT04_2026-11-04.json`. No se acepta URL de cliente ni escritura en GitHub. Se cotejan ruta, SHA de blob Git, longitud, codificación, contenido estructurado, referencia fijada y SHA256. Los datos no se publican.
- Workflow `JARVIS B6 Real GitHub API Read LAB` run **41749233111**: **SUCCESS**; petición GET real, exactamente una lectura en dos solicitudes con la misma clave; PROD y otra empresa DENY; 0 € marginal declarado por el contrato.
- **Limitación**: identidad B2 y grants B3 de este E2E son **fixtures CI**; token de GitHub acredita lectura del repo, NO autenticación real OWNER_ROOT ni permisos para otras apps. Verificador coteja integridad por Git blob hash, **no constituye revisión independiente humana**.

## 4. Journal PostgreSQL 17 real y reversión física aislada
`b6-pg17-idempotency-journal-candidate.sql`: esquema PRIVADO de LAB únicamente, `SECURITY INVOKER`, sin grants públicos. Unique primary key por owner, company, environment, mission, capability, connector, idempotency key. Claims concurrentes evitan duplicados; fingerprints distintos se rechazan; estados CLAIMED/COMPLETED/FAILED son monotónicos, no hay retry automático.
`b6-pg17-idempotency-journal-lab.sh`: PostgreSQL 17 real con dos sesiones independientes, competencia por el mismo claim, resultado único, segunda sesión IN_PROGRESS, verificación owner/tenant, finalización, fail no-retry, backup `pg_dump`, restore `pg_restore`, rollback en base sintética restaurada.
`b6-sandbox-mutation-rollback-lab.mjs`: cambio FÍSICO de un fichero exclusivamente temporal sintético, hash previo/snapshot, mutación, verificación de postcondición, compensación desde snapshot e igualdad byte a byte.
- Workflow **41749233139 SUCCESS**, con marcadores `B6_PG17_DURABLE_JOURNAL_LAB_GREEN` y `B6_LAB_SANDBOX_MUTATION_AND_ROLLBACK_PASS`.
- **Limitación:** el journal PostgreSQL se ha probado de forma independiente; no se ha conectado todavía al ejecutor real de GitHub ni instalado en Supabase PROD. La mutación es solo un archivo descartable de laboratorio, NO un conector externo de escrituras.

## 5. Evidencia de regresión e integración
- Suite universal LAB a partir del HEAD de PR #16: **289/289 PASS, 0 FAIL**, referencia 41748698475; posteriormente se mantiene sin cambios de lógica testable. El HEAD final de documentación exige nueva verificación.
- Integración gobernada GitHub Actions: **SUCCESS** run 41748698413; promoción/deploy: **SKIPPED**.
- Real GitHub API READ SUCCESS run **41749233111**.
- PostgreSQL/rollback SUCCESS run **41749233139**.
- No DeepSeek ni API IA de pago, no repositorios externos editados, ninguna suscripción nueva.
- B3/B4 PROD permanecen `enabled=false` / `kill_switch=true` (revalidar en cierre).

## 6. Matriz OLD vs NEW
| Contrato | OLD | NEW | Estado |
|---|---|---|---|
| Catálogo Capability Fabric | B6 preflight orden API → MCP → CLI → BROWSER, no ejecuta | READ executor consume catálogo confiable | HECHO LAB |
| Autenticación/autorización | B2/B3 servidores reales pendientes de aceptación | Doble grant B3, OWNER_ROOT/tenant, fail-closed | LAB MOCK, NO PROD |
| API real | Ningún conector B6 invocado en Corte 03 | Lectura real GitHub API con token efímero de CI | HECHO LAB |
| Idempotencia | Readiness no tenía journal de ejecución | Claim/receipt + PostgreSQL 17 concorrencia sintética | LAB PARCIAL, NO INTEGRADO PROD |
| Reversión | Requisitos definidos | Prueba física de snapshot/rollback en archivo temporal | HECHO LAB SINTÉTICO |
| MCP/CLI/Browser/Computer Use | Catalogados o previstos | No se han conectado proveedores ejecutables | PENDIENTE |
| Entornos | Flags B3/B4 PROD OFF | B6 devuelve PROD_NOT_CERTIFIED | PROD NO-GO |

## 7. Requisitos de aceptación pendientes
1. Activar **por capacidad**, tras certificar B2 identidad OWNER_ROOT real, B3 permisos reales, Vault, revocación, auditoría y kill switch, usando rutas reales y políticas.
2. Conectar journal transaccional y evidencia duradera a runtime compartido (no otro servidor), con control de repetición después de reinicio/desconexión.
3. Inventariar y probar al menos un conector real seguro de MCP/CLI/Browser y, después, una operación reversible de bajo riesgo fuera de fixtures; antes, baseline, backup/rollback, contrato, límites y evaluación independiente.
4. Preparar y probar promoción gradual bajo OFF, y recuperación/supervisor B9; certificar que no hay fuga entre empresas.
5. Verificar B3/B4 PROD backup/restore real antes de cualquier cambio; actual B4 pruebas solo en fixture.
6. Para acciones bajo riesgo legal/económico, exigir HUMAN_REQUIRED: LEGAL_REQUIRED, SIGNATURE_REQUIRED, LOW_CONFIDENCE, HIGH_RISK, POLICY_CONFLICT, SECURITY_INCIDENT, MONEY_LIMIT o CUSTOMER_HUMAN_REQUEST.

## 8. Rollback y siguiente bloque
Se puede **cerrar PR #16 o revertir exclusivamente sus commits**, sin tocar B1–B5, PR #12, main, App/CRM ni Supabase. Esquemas LAB de CI se destruyen junto con su instancia; no existe migración B6 aplicada a PROD. Mantener DRAFT y todas las activaciones OFF.

**next_block:** `B6_CUT02_TRUSTED_CONNECTORS_B3_REAL_POLICY_JOURNAL_WIRING_AND_CROSS_DEVICE_NO_GO`.
