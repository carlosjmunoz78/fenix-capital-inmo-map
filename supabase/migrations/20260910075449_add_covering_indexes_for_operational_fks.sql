-- PROD parity snapshot. Idempotent and safe on an already-migrated database.
create index if not exists idx_contact_list_members_cliente_code on fenix_prod.contact_list_members(cliente_code);
create index if not exists idx_expediente_personas_cliente_code on fenix_prod.expediente_personas(cliente_code);
create index if not exists idx_lead_events_cliente_id on fenix_prod.lead_events(cliente_id);
create index if not exists idx_notification_state_tarea_id on fenix_prod.notification_state(tarea_id);
