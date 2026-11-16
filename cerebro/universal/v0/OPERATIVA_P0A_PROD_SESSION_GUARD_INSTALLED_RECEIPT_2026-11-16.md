# OPERATIVA V3 · RECIBO DE INSTALACIÓN FÍSICA · PRIVATE SESSION GUARD ISSUER PROD

Fecha: 2026-11-16. Autorización propietario: SI, limitada a instalación aditiva de lector aislado con snapshot, pruebas LAB y rollback preparado. Producción de OPERATIVA: **HOLD**.

## Recursos tocados
- ÚNICO objeto nuevo: `public.cerebro_operativa_session_guard_prod_v0(uuid,uuid)` en Supabase emisor `cluhljgonannaafpmblx`.
- Migración registrada: `20261116113120_cerebro_operativa_prod_issuer_private_session_guard_v0_20261116`.
- Tipo SQL boolean, `SECURITY DEFINER`, propietario postgres, `SET search_path=''`, cuerpo fijo: buscar par `session_id/user_id` en `auth.sessions` no caducada.
- ACL: `EXECUTE` SOLO service_role; anon y authenticated no. `service_role` sigue sin `SELECT` directo sobre `auth.sessions`.
- App, CRM, Gateway/Auth config PROD, Edge, DNS, main, otras empresas y tablas existentes: **sin modificación**. Ningún usuario, JWT, sesión o contraseña creado/alterado/revocado.

## Gates, ejecución y pruebas
| Gate | Evidencia | Estado |
|---|---|---|
| Inventario y snapshot anterior | Firma no existente, DB metadata y ACL auth.sessions, contrato en PR #66 | HECHO |
| Instalación LAB paralela y rollback | Misma SQL con nombre de ensayo, CREATE/REVOKE/GRANT, 2 casos de false, DROP RESTRICT y ausencia posterior | HECHO |
| Contratos y OLD vs NEW | CI 43858085306, 43858085354, 43858085345; 26 SUCCESS, 1 SKIPPED, 0 FAIL | HECHO |
| Migración PROD estrictamente aditiva | apply_migration success; registrada versión 20261116113120 | HECHO |
| Verificación PROD privilegiada | rol service_role invoca y devuelve false en sesión inexistente | HECHO |
| Denegación pública real | roles anon y authenticated reciben insufficient_privilege; sin consultar sesiones | HECHO |
| Auditoría seguridad | Security advisors consultados, sin findings relacionados con la función nueva | HECHO acotado |
| E2E firma + sesión activa + logout + revocación real | No hay credenciales exclusivamente LAB en runner privado ni emisor-prod reader caller certificado | BLOQUEADO |
| Integración gateway + control efectivo + rollback integral | Sin cambio en App/CRM; no conectado | PLANIFICADO / HOLD |

## Rollback y rebuild
Fuente instalada: `cerebro/universal/v0/security-prod/20261116_cerebro_operativa_session_guard_prod_v0.sql`.
Rollback controlado por `cerebro/universal/v0/security-prod/20261116_cerebro_operativa_session_guard_prod_v0_rollback.sql`. Verificar ausencia de consumidores y ejecutar sólo `DROP FUNCTION public.cerebro_operativa_session_guard_prod_v0(uuid,uuid) RESTRICT` ante fallo/human exception. LAB certificó este mecanismo; **nunca se ejecutó rollback productivo** porque la función nueva pasó pruebas y no afecta al tráfico. Rebuild mediante migration source después de preflight; no activar automáticamente.
Backup: snapshot de contrato y metadatos previos de función inexistente, no base entera. Disponibilidad de PITR/backup proveedor no evaluada; no falsear ese gate.

## Semáforo
`P0A_INSTALL_OBJECT=GREEN`.
`P0A_VERIFIED_REVOKED_OWNER_SESSION_HTTP=BLOCKED`.
`P0B_PROVIDER_CAUSAL_JOB_RECEIPT=PARTIAL`.
`P0I_OPERATIVA_PROD=HOLD`.
No lanzamiento ni cambio en alias, PR #66 sigue DRAFT. Coste nuevas suscripciones 0 €, consumo marginal real NO_MEDIDO.
