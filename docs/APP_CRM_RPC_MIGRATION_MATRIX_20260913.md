# APP/CRM RPC MIGRATION MATRIX · 2026-09-13

Status: BRANCH-ONLY / NO PROD WRITE / NO MAIN CHANGE

## Objetivo
Eliminar llamadas frontend directas a RPC `SECURITY DEFINER` sin romper App/CRM. Patrón obligatorio: conservar contrato actual → introducir equivalente server-only → exponer por `fenix-app-gateway` → migrar caller en rama → OLD vs NEW → rollback → solo entonces retirar EXECUTE de `authenticated`.

## Inventario reproducible
La CI de esta rama detecta 10 call-sites directos sobre 8 RPC PROD únicos.

| RPC actual | Call-sites | Server-only equivalente | Estado contrato | Ruta Gateway objetivo |
|---|---:|---|---|---|
| `fenix_prod_chat_list_user` | 1 | `fenix_prod_chat_list_server` | EXISTENTE, definición inspeccionada | `GET /chat` |
| `fenix_prod_chat_send_user` | 1 | `fenix_prod_chat_send_server` | EXISTENTE, definición inspeccionada | `POST /chat` |
| `fenix_prod_exp_update` | 3 | `fenix_prod_exp_update_server` | EXISTENTE, definición inspeccionada | `PATCH /expedientes/:code` |
| `fenix_prod_contact_create` | 1 | `fenix_prod_contact_create_server` | DEFINIDO, NO desplegado | `POST /contactos` |
| `fenix_prod_exp_create` | 1 | `fenix_prod_exp_create_server` | DEFINIDO, NO desplegado | `POST /expedientes` |
| `fenix_prod_notifications_list_user` | 1 | `fenix_prod_notifications_list_server` | DEFINIDO, NO desplegado | `GET /notificaciones` |
| `fenix_prod_notification_mark_user` | 1 | `fenix_prod_notification_mark_server` | DEFINIDO, NO desplegado | `POST /notificaciones/:tarea_id/state` |
| `fenix_prod_sign_create` | 1 | `fenix_prod_sign_create_server` | DEFINIDO, NO desplegado | `POST /firmas` |

## Call-sites confirmados
- `src/ChatShell.tsx`: list + send
- `src/ContactCreateShell.tsx`: contact create
- `src/DetailShell.tsx`: expediente update
- `src/ExpedienteCreateShell.tsx`: expediente create
- `src/ExpedienteManualPhaseGuard.tsx`: expediente update
- `src/ExpedienteRenameGuard.tsx`: expediente update
- `src/FirmaCreateShell.tsx`: sign create
- `src/NotificationsShell.tsx`: list + mark

## Gates
1. No retirar EXECUTE de `authenticated` mientras `direct_call_count > 0`.
2. Los nuevos contratos server-only deben aceptar `p_actor_code`, no depender de `auth.uid()`, y quedar invocables solo por backend/service role.
3. El Gateway debe resolver identidad con el contrato ya existente antes de delegar.
4. La migración frontend debe conservar códigos de estado, errores de negocio e idempotencia.
5. Cada caller debe tener rollback de una sola reversión de commit/feature gate antes de cualquier promoción.
6. `main` y PROD permanecen intactos hasta evidencia OLD vs NEW.

## Estado actual
- OBJ-1 inventario exhaustivo: HECHO / GREEN.
- OBJ-2A wrappers existentes: HECHO / GREEN para chat y expediente update.
- OBJ-2B cinco wrappers faltantes: DEFINIDO / pendiente de implementación y validación en entorno seguro.
- OBJ-3 Gateway: PLANIFICADO.
- OBJ-4 migración callers: PLANIFICADO.
- OBJ-5 OLD vs NEW + rollback: PLANIFICADO.
- OBJ-6 retirada EXECUTE authenticated: BLOQUEADO por diseño hasta `direct_call_count = 0`.
