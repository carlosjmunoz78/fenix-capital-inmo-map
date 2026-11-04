# B10 · Matriz de aceptación real y no verificaciones
| Fase | Requisitos mínimos físicos | Evidencia REAL en B10 | Estado |
|---|---|---|---|
| 1. Lectura | SHA servido por PROD, Gateway health, OWNER_ROOT real, B3 read grant, kill switch/SUP, auditoría, App/CRM no dañados, coste real | B3/B4 PROD OFF leídos por SQL; otros sin prueba | **NO_GO** |
| 2. Acciones seguras | permisos acotados, idempotencia real, rollback físico, verificación independiente | no conectada | **NO_GO** |
| 3. Misiones persistentes | JOB-001 real, 2 dispositivos, restart + snapshot/restauración, memoria central | B2 gate reutilizado con fixtures; no 2 dispositivos físicos | **NO_GO** |
| 4. Multiempresa | 2 empresas registradas reales + IAM y ausencia de fugas | `cerebro_company_registry_preprod` 0 filas; B8/B9 tenants sintéticos | **NO_GO** |
| 5. Voz | identidad misma sesión, 2 dispositivos y voz, interrupción, privacidad y coste | no verificada físicamente | **NO_GO** |
| 6. Delegación | supervisor real, tribunal real, revocación a mitad, cadena de auditoría | no verificada | **NO_GO** |
| 7. Mejora gobernada | OLD/NEW holdout, P23, recuperación desastres, promoción independiente, rollback post | B9 LAB parcialmente probado; B9 PG17 propia no corrido | **NO_GO** |

### Fuentes y clasificación
- `LOCAL_LAB_TEST`: B10 suite `490 PASS / 0 FAIL`, run 41796775749; CI B7 run 41796775690 y Governed run 41796775807 SUCCESS; no PROD.
- `REAL_EXTERNAL_READ`: Supabase PROD B3/B4 (`enabled=false`, `kill_switch=true`) y company_registry_preprod 0 filas; GitHub PR20/19/18/17/16 abiertos DRAFT.
- `PROD_OPERATION_VERIFIED`: 0; no cambiar etiqueta basándose en fixtures o salud web no autenticada.
- Intento navegación pública a `app.fenixcapital.es/PROD_SOURCE_SHA.txt`: herramienta no accesible; no fuente SHA verificada.
- Solo 2 dispositivos físicamente autenticados y trazados, idealmente móvil + PC, pueden cerrar B2 con evidencias independientes.

**Nota crítica:** Un metadato etiquetado `PROD_OPERATION_VERIFIED` dentro de un test no es una certificación; jamás sirve sin validación de un origen independiente confiable.
