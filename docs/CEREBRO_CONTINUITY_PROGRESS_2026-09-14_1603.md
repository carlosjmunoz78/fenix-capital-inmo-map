# CEREBRO OS · continuidad técnica · 2026-09-14 16:03 Europe/Madrid

## Estado de rama de restauración

- Rama viva: `app-restoration-v0-20260914`.
- PR asociado: `#380`, abierto y aislado de `main`.
- HEAD al iniciar este ciclo: `ba3000187a69ac993191c011ae5dfb8e8b141107`.
- Se verificó que `AgendaShell.tsx` ya contiene selección múltiple, preview, confirmación, control de versión y ejecución masiva mediante `runTaskBulkAction`; por tanto el punto de continuidad real está más avanzado que la inspección histórica de Agenda.
- La matriz canónica de restauración sitúa como siguientes gaps relevantes: Perfil editable, Informes/actividad estructurada, hechos laborales canónicos, E2E documento→persona y QA OLD-vs-NEW.

## Legacy RPC retirement

Estado anterior: READY_TO_APPLY_OR_VERIFY.

Verificación READ-ONLY realizada sobre Supabase PROD `cluhljgonannaafpmblx`:

- `fenix_prod_chat_list_user(integer)` → `authenticated EXECUTE = false`, `service_role EXECUTE = true`.
- `fenix_prod_chat_send_user(text,text)` → false / true.
- `fenix_prod_contact_create(text,text,text,text,text,text,text,text,boolean)` → false / true.
- `fenix_prod_exp_create(text,text,text,text,text,numeric,numeric,text,text,jsonb,boolean)` → false / true.
- `fenix_prod_exp_update(text,integer,text,text,text,text,date)` → false / true.
- `fenix_prod_notifications_list_user(integer)` → false / true.
- `fenix_prod_notification_mark_user(uuid,text)` → false / true.
- `fenix_prod_sign_create(text,timestamptz,text,text,timestamptz,timestamptz,date)` → false / true.

Además, `fenix-app-gateway` continúa ACTIVE v17. Security Advisor muestra 16 warnings SECURITY DEFINER autenticados, frente a 24 antes del retiro legacy; los ocho RPC retirados ya no aparecen en ese grupo. `pg_net` permanece sin tocar. Las tablas fail-closed con RLS sin policy siguen intencionalmente cerradas al acceso directo.

Conclusión: **HECHO / VERIFICADO** para el retiro selectivo de los 8 RPC legacy de `authenticated`, preservando `service_role` y wrappers server-only.

## Perfil · siguiente unidad de restauración

Auditoría viva:

- `ProfileShell.tsx` actual es mayormente read-only.
- `fenix-profile-api` está ACTIVE v1, `verify_jwt=true`.
- `fenix_prod_profile_update_server(text,text,text)` permite actualizar `display_name` y `zone_code` y registra actividad.
- Existen wrappers server-only separados para lectura/actualización de redes sociales.
- No se despliega una ampliación de Edge Function sin pasar el gate correspondiente.

Cambio seguro realizado en la rama aislada:

- Añadido `fetchProfileApi()` al runtime autenticado de `src/supabase.ts` para que la UI pueda consumir el contrato `fenix-profile-api` sin duplicar autenticación ni persistencia.
- Commit: `7d296061a0141f286295f77063d96564d388122b`.

Siguiente paso: conectar edición reversible de nombre/zona en `ProfileShell` contra `fenix-profile-api` v1; después ampliar sociales mediante contrato backend compatible, sin crear persistencia paralela.
