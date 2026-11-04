# ZEUS / JARVIS · BLOQUE 6 · CORTE 02 · Integración transaccional y política B3

**Fecha:** 2026-11-04 · **Estado:** PARCIAL; integración real de lectura en LAB certificada; PROD NO-GO.
**Rama:** `cerebro/jarvis-b6-capability-executor-v0-20261104` · **PR:** #16 DRAFT · **Base:** PR #15 B5 DRAFT · **Coste adicional de nuevas suscripciones/API:** 0 €.
**Contrato canónico B6:** ejecutar trabajo real autorizado de extremo a extremo con permiso, auditoría, idempotencia y reversibilidad. **Este corte no certifica todavía esa aceptación completa en PROD.**

## Conservación e inventario (OLD)
- Código base B6 Corte 01: `zeus/jarvis/core/jarvis-b6-controlled-read.mjs`; preflight B6 existente, adaptador GitHub read-only, prueba CI, PostgreSQL 17 journal candidato y rollback sintético. PR #16 HEAD inicial `d8d0f344b834fe3eed373a580cd7fcf57ae87675`.
- Se conserva `main`, PR #12 voz UX, PR #13 B2/B3, PR #14 B4, PR #15 B5, App Fénix, CRM, WordPress, DNS, Trading y Supabase core. No se crea servidor ni worker nuevo.
- El B3 ya proporciona `createJarvisB3DecisionService`, `createJarvisB3PostgresAdapters` y `authorizeJarvisAction`. **Se reutiliza**, no se fabrica un gobierno paralelo.

## Cambios del Corte 02 (NEW)
1. `core/jarvis-b6-pg-journal.mjs`: adaptador de `claim / complete / fail` al PostgreSQL 17 existente en LAB mediante consultas parametrizadas con valores exactos de propietario, empresa, entorno, misión, capacidad, conector, idempotency key y fingerprint. Las repeticiones solo devuelven evidencia cuando la fila completada y TODOS los campos coinciden.
2. `gates/b6-ci-psql-query.mjs`: puente CLI de CI aislado hacia el servicio PostgreSQL 17 desechable. Solo consultas `SELECT` al namespace LAB, argumentos parametrizados, sin shell y sin exposición de errores o secretos. **No forma parte de PROD**.
3. `gates/b6-cut02-pg17-github-integrated-lab.mjs` + workflow `jarvis-b6-cut02-pg17-github-lab.yml`: combina el GET real de GitHub con journal PostgreSQL real (dos ejecutores concurrentes), prueba reinicio simulado con una nueva instancia, conflicto de idempotencia, fallo terminal, cross-tenant y bloqueo PROD. Se usa token efímero de GitHub Actions `contents:read`; la identidad B2/B3 continúa sintética en CI.
4. `core/jarvis-b6-pg-journal.test.mjs`: validación de respuestas de DB y rechazo de recibos cruzados, huellas falsas, scopes inválidos y errores no sanitizados.
5. `core/jarvis-b6-b3-decision-integration.test.mjs`: usa el **motor B3 existente y su evaluador real de permisos en el proceso de test**, con grants sintéticos, para comprobar permiso por operación, revocación, caducidad, kill switch, separación entre descubrimiento y ejecución y fallo de auditoría.
6. En `jarvis-b6-controlled-read.mjs`, un `journal.fail()` que no confirme la escritura devuelve `JOURNAL_FAILURE_UNRECORDED` y nunca un éxito inventado.

## Evidencia verificada (2026-11-04)
| Gate | GitHub Actions | Resultado |
|---|---|---|
| LAB Suite completa | `41750925376` | **315/315 PASS, 0 FAIL** |
| GitHub API + PG17 journal integrados | `41750925389` | SUCCESS, 1 GET real para dos ejecutores |
| B6 Journal PostgreSQL 17 aislado | `41750925403` | SUCCESS |
| GitHub API read-only base | `41750925716` | SUCCESS |
| B4 PostgreSQL 17 regresión | `41750925479` | SUCCESS |
| Governed Main Integration | `41750925423` | SUCCESS, producción SKIPPED |

**Prueba integrada exacta:** marcador `B6_CUT02_REAL_PG17_PLUS_GITHUB_E2E_PASS`; `concurrency=2`, `remote_read_calls=1`, `restart_dedup=true`, `failure_terminal=true`, `privacy_conflict_denied=true`, `prod_off=true`, coste marginal declarado 0 €.

## Auditoría real de B3 en Supabase PROD (SOLO LECTURA)
Proyecto `cluhljgonannaafpmblx`. La inspección de metadatos ha comprobado que `zeus_jarvis.b3_owner_grants`, `b3_runtime_control`, `b3_audit_events` y `b3_secret_inventory` tienen RLS. En las concesiones visibles a `anon` / `authenticated` / `PUBLIC` para esas tablas no se observan permisos directos. Para empresa `fenix` y entorno `PROD`: **0 grants B3; 0 eventos de auditoría B3; 0 entradas registradas en inventario de secretos para fenix**. Además B3 y B4 siguen `enabled=false`, `kill_switch=true`.
**Interpretación:** la política de ejecución B6 en PROD NO tiene todavía la cadena de autorizaciones requerida. No se han creado grants, no se ha accedido al Vault ni se han realizado mutaciones en tablas B3/B4. No inferir seguridad completa de RLS o de contar cero permisos de tabla.

## OLD vs NEW
| Área | Corte 01 | Corte 02 | Alcance |
|---|---|---|---|
| GitHub API real | GET con journal in-memory | GET real con journal PG17 simultáneo | HECHO LAB |
| PostgreSQL journal | pruebas sintéticas separadas | conectado al ejecutor API real | HECHO LAB |
| Reinicio | identidad de proceso no duradera | nuevo ejecutor recupera fila y evita GET duplicado | HECHO LAB |
| B3 autorización | mocks | implementación B3 original con grants de fixture y escenarios de revocación | HECHO LAB / PROD PENDIENTE |
| Escritura reversible | fichero temporal aislado | se conserva sin ejecutar mutation externa | PARCIAL |
| MCP / CLI / Browser / Computer Use | preflight sin ejecución | puente CLI CI solo para PG, no conector empresarial certificado | PENDIENTE |
| PROD | denegado explícitamente | sigue DENEGADO; grants B3 reales = 0 | NO-GO |

## Gates abiertos / NO-GO
- B2 identidad real OWNER_ROOT con sesión, MFA cuando corresponda y continuidad PC/móvil.
- Grants B3 reales, revocación y auditoría autorizadas, Vault con identidad server-side. No emitir grants genéricos por defecto.
- B4 restore/backup real de PROD y auditoría del Gateway/worker compartido; jamás instalar journal B6 en producción sin ello.
- Prueba de recuperación durante crash justo después de GET pero antes del resultado, reconciliación segura y tratamiento de claims incompletos sin reejecutar trabajo ciegamente.
- Conectores MCP/CLI/Browser/Computer Use reales, modelo de permisos y aislamiento por empresa, compatibilidad bajo cargas y sin costes añadidos.
- Mutaciones externas reversibles con backup y aprobación, tribunal independiente, observabilidad e interruptores controlados.

## Política de promoción, coste y rollback
`PROD_NOT_CERTIFIED` continúa codificado; **no convertir tests sintéticos en prueba de autonomía productiva**. Sin merges automáticos. Cero nuevas suscripciones, cero llamadas IA de pago, sin recargas. Los GitHub Actions usan CI existente; coste marginal de proveedor no equivale a garantía de minutos ilimitados en cuenta GitHub.

Rollback: cerrar/revertir **solo PR #16** a su baseline `d8d0f344b834fe3eed373a580cd7fcf57ae87675` para retirar este corte; no eliminar esquemas B3/B4 existentes ni tocar `main`, App/CRM o PR #15.

**next_block:** `B6_CUT03_APPROVAL_SCOPE_FAILOVER_AND_MORE_TRUSTED_CONNECTOR_PROOFS`, sin promover PROD hasta completar los gates.
