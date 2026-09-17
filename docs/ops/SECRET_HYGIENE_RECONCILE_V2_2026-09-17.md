# Secret hygiene reconcile V2 · 2026-09-17

Reconciliación sobre `main` después de congelar el despliegue automático de la App.

Incluye:
- runtime smoke sin credenciales inline;
- `PROD_SUPABASE_PUBLISHABLE_KEY` desde GitHub Actions Secrets;
- `PROD_SUPABASE_LEGACY_ANON_JWT` desde GitHub Actions Secrets;
- validación fail-closed de clase `sb_publishable_*`;
- auditoría ampliada a runtime smoke;
- rollback rehearsal con guard de clave publicable.

No incluye:
- publicación de la App;
- mutaciones en CRM/Supabase;
- despliegue del Gateway primario;
- retirada de legacy.
