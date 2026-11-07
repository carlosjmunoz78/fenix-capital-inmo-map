# CEREBRO OS · JARVIS V2 · CUT62 — Inventario de código, Edge desplegado y restauración aislada

**Fecha:** 2026-11-07 · **Company:** `fenix` · **Engine:** `JARVIS` · **Environment:** `LAB` · **Version:** `CUT62-v0.1`
**Rama aislada:** `cerebro/jarvis-deepseek-weekend-lab-20261106` (no main, no merge).
**Objetivo operativo:** preparar **JARVIS V2 real PROD**, preservando App/CRM/Supabase/Cloudflare CUT30/ANA/Trading/SEO/Notion.
**Estado:** HECHO inventario parcial real + restore físico aislado; BLOQUEADO restore de base PROD, identidad B2/B3 y alta `fenix` en backend destino. **PROD NO-GO**.

## 1. Inventario del código fuente App/CRM/CEREBRO

- Se inspeccionó por `git ls-files` + lectura de código el checkout exacto de la rama JARVIS con un scanner que nunca imprime contenido de código ni secretos, solo rutas y marcadores de contratos.
- Código: `cerebro/jarvis/boost-001/cut62-source-consumers-inventory-v0.mjs`; tests: `...v0.test.mjs`.
- [GitHub Actions #42391123117](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42391123117): **SUCCESS, 4/4 PASS** (el primer run #42391010229 también PASS).
- **1.670 archivos de código versionados examinados**. **19 rutas** contienen referencias textuales exactas a contratos de Company Registry/Onboarding/EngineState/MKT-CRM/LRN. **121 rutas** contienen superficies de invocación API (por ejemplo `.rpc()`, `.functions.invoke()`, `/functions/v1/`) y **692 rutas** mencionan `company_id` como contexto textual. El recuento 692 NO equivale a llamadas RPC. Las categorías pueden solaparse.
- `src/`: 47 rutas con marcadores genéricos; **0 rutas** contienen las referencias literales exactas buscadas. **No significa ausencia de dependencias dinámicas.**
- `supabase/functions/` en Git: **2 fuentes** mencionan directamente una tabla de registro: `cerebro-browser-interactive-v3/preprod.ts` y `cerebro-browser-work-total-owner-v1-preprod/index.ts`. Son **código versionado**, NO demostración de que estén desplegadas.
- Las otras rutas exactas se concentran en contratos SQL, runbooks/rollback, QA CI y CEREBRO; el resultado está conservado como rutas+marcadores, sin contenidos sensibles.
- Artifact id **13582020645**, `jarvis-cut62-app-crm-edge-consumers-42391123117`, ZIP SHA256 `99829c29a3425df27261d06ac0dec8b54d687a75ccdd8b435a5dd32f4e833de6`, retención 30 días.
- **Límites:** repositorio único; no se ha certificado igualdad con el bundle App/CRM PROD, ni se han inspeccionado todos los repositorios conectados, variables/config dinámica o todas las fuentes desplegadas.

## 2. Edge Functions realmente desplegadas en Supabase PROD

Lectura mediante `mcp__Supabase__list_edge_functions` y `get_edge_function` del proyecto `cluhljgonannaafpmblx`. No deploy, no invocación ni modificación de secret/grant.

- **95 funciones con estado administrativo ACTIVE**, de las cuales **60 tienen `verify_jwt=false`**. Esto **NO prueba desprotección**, porque la validación puede estar implementada en el código, gateway o HMAC; requiere revisión caso por caso. No activar/desactivar/desplegar ninguna sin contrato.
- **14 funciones seleccionadas** inspeccionadas leyendo su código desplegado: `fenix-app-gateway`, `fenix-crm-sync-once`, `cerebro-console-gateway-v0`, `jarvis-orchestrator-v0`, `jarvis-work-gateway-v1`, `cerebro-gateway-prod-governed-write-canary-v1`, `cerebro-browser-interactive-v3`, `cerebro-browser-work-total-owner-v1-prod`, `fenix-app-gateway-v2-canary`, `cerebro-console-gateway-human-v1-canary`, `cerebro-console-gateway-human-v1-owner100`, `fenix-crm-sync-trigger-once`, `jarvis-work-dispatch-v1`, `jarvis-git-gateway-v1`.
- En esas 14 fuentes desplegadas: **0 referencias literales exactas** a los contratos Company Registry / Onboarding / EngineState / MKT-CRM / LRN buscados. **9 sí utilizan un patrón genérico de llamada RPC**. La ausencia de texto literal no descarta nombres construidos dinámicamente ni autorización externa.
- Snapshot de metadatos y resultados booleans **sin código ni credenciales**: `cerebro/jarvis/boost-001/cut62-deployed-edge-audit-20261107.json`, commit `4ce04ef4ba48d4b99f48c4b613c33721be9d8129`.
- Los despliegues de Browser/Console/Gateway pueden tener versión diferente de los candidatos Git. Verificar hash/versión y la política de auth por endpoint antes de introducir integración JARVIS.

## 3. Recuperación física reutilizando el mecanismo EXISTENTE de B4

- Se ha reutilizado **sin cambiarlo** el script de la biblioteca `zeus/jarvis/gates/b4-real-postgres-concurrency-restore-lab.sh`, ya previsto para PostgreSQL 17 aislado en CI.
- El ensayo crea **datos sintéticos** en PostgreSQL 17 efímero, prueba concurrencia y aislamiento multiempresa, genera `pg_dump --format=custom`, crea una segunda base, ejecuta `pg_restore`, compara 3 registros restaurados y prueba la reversión de índices. Ninguna escritura a Supabase real.
- [GitHub Actions #42391522891](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42391522891): **SUCCESS**. Log `B4_SYNTHETIC_REAL_POSTGRES_GREEN`.
- Primer intento de workflow #42391395047 no creó jobs por una clave YAML con dos puntos sin comillas; se corrigió el nombre de un paso y se ejecutó con éxito. No se cambió el script B4 original.
- Artifact id **13581881634**, `jarvis-cut62-isolated-pg17-backup-restore-42391522891`, ZIP SHA256 `fec7394c65354b0484d1647ba1bfb16c920025e0e08141ba03ef9b9c1c059d02`. Solo metadata JSON, no ZIP de DB ni datos reales.
- **Prueba conseguida:** PG17 real y restauración completa de fixture sintético B4 en entorno aislado.
- **NO conseguido:** backup físico de `fenix-capital-prod`, restauración de la DB PROD en instancia no productiva, verificación de integridad/datos empresariales críticos ni rollback de su esquema/datos. Nunca confundir una prueba B4 con la recuperación de Supabase PROD.
- Los archivos históricos `cerebro/evidence/multicompany-physical-e2e-acceptance-2026-10-14.json` y `.../lrn001-multicompany-physical-preprod-acceptance-2026-10-14.json` documentan **SQL transaccional sintético sobre el proyecto existente y ROLLBACK de cambios**, NO un `pg_restore` de la base PROD. Pueden aprovecharse para tests de contratos, no para borrar el gate del backup real.

## 4. Identidad y requisitos para ejecución real en PROD

Estado físico heredado CUT61 y PR [#25](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/pull/25):
- B3 en Supabase real `zeus_jarvis.b3_runtime_control` `enabled=false` y `kill_switch=true`; `b3_owner_grants=0`. No abrir permisos ni desactivar kill switch.
- Cloudflare Access de CUT30 demostró Owner canary en un corte anterior, pero revalidación actual en CUT61 redirigió a login. Falta autenticación interactiva del dueño en Opera, inscripción B2 por dispositivo, concesión B3 `MISSION_INSPECT` mínima, revocación real E2E, Access de Worker paralelo CUT32 y GET de misión real.
- `fenix` sigue sin alta ni onboarding en el proyecto destino; LRN-001 no tiene recibos de empresa. Los 17 estados antiguos del proyecto diferente son metadatos históricos, no estados actuales certificados.
- El siguiente trabajo no invasivo: **comparación fuente vs despliegue** de los 14 endpoints de mayor riesgo, auditar mecanismos de auth propios de los 60 `verify_jwt=false` por prioridad (no asumir que son vulnerables), localizar recibo administrativo de backup de `fenix-capital-prod` y restaurar solo en destino independiente sin coste o con aceptación ROI. Después cerrar B2/B3 owner E2E.
- Ninguna de las pruebas concede potestad de escribir en producción. Necesarias: contratos, permisos, backup+restore, comparación OLD/NEW, evaluación/tribunal independiente, observabilidad, rollback, coste medido, identidad y promoción gradual.

## 5. Estados trazables

| Gate | Estado |
| --- | --- |
| Inventario Git App/CRM/Edge | HECHO en repositorio actual: 1.670 archivos, 19 refs directas |
| Inventario fuente desplegada en Supabase | PARCIAL: 14/95 revisadas, sin certificar auth completa |
| SQL consumidores y claves externas | HECHO en CUT61: 17 funciones / 10 FKs |
| Repetición real dump/restore PG17 sintético | HECHO, 3 registros |
| Backup real y restauración física de base Supabase PROD | BLOQUEADO / NO ACREDITADO |
| Certificación B2/B3 y Access actual | BLOQUEADO |
| Registro de `fenix` en backend destino | NO HECHO |
| Aprendizaje LRN-001 en backend destino | NO HECHO |
| Despliegue integrado de JARVIS V2 PROD | NO HECHO |
| Coste extra contratado | 0 €, minutos Actions facturados no conciliados |

**Siguiente bloque propuesto: CUT63 · priorizar y certificar 14 endpoints reales, identificar proveedor de backup y preparar restore aislado bajo aprobación gobernada, completar login Owner Access y B2/B3; después alta con contrato y validación física de 17 motores.** Conservación, sin cambios en App/CRM/ANA/SEO/Trading/PROD ni main.
