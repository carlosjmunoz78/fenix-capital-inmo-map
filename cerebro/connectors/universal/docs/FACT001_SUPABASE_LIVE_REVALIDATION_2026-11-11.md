# FACT-001 · Supabase Security · Revalidación física solo lectura

**Fecha:** 11/11/2026 · **Estado:** HIGH_RISK / HUMAN_REQUIRED para cambiar permisos, RLS o funciones existentes.
**Proyecto MAP:** `fenix-capital-inmo-map`, ref `hnqlnvakzaywtafeiybt`.
**Proyecto protegido:** `fenix-capital-prod`, ref `cluhljgonannaafpmblx` (ninguna escritura).

## Evidencia verificada en vivo
Supabase `list_projects`: ambos proyectos `ACTIVE_HEALTHY`.
Supabase `execute_sql` de consulta a catálogos `pg_class`, `pg_namespace`, `has_table_privilege`:
ocho tablas `public` de la familia `seo_cerebro_*` con `relrowsecurity=false`; las 8 conceden **SELECT/INSERT/UPDATE/DELETE** efectivos a ambos roles `anon` y `authenticated`.

1. `seo_cerebro_autonomy_capabilities_preprod`
2. `seo_cerebro_b2b_strict_audit_preprod`
3. `seo_cerebro_b2c_strict_audit_preprod`
4. `seo_cerebro_infrastructure_audits_preprod`
5. `seo_cerebro_landing_contract_qa_preprod`
6. `seo_cerebro_paused_cron_jobs_preprod`
7. `seo_cerebro_sitewide_archive_backups_preprod`
8. `seo_cerebro_sitewide_backups_preprod`

Segunda consulta *solo lectura* a `pg_proc`:
- `seo001_refresh_autonomy_capabilities_preprod(text,text,text)`: `SECURITY DEFINER=true`, `EXECUTE anon=true`, `EXECUTE authenticated=true`.
- `seo001_b2b_strict_gate_preprod()`: mismos tres indicadores.
- `seo001_b2c_strict_gate_preprod()`: mismos tres indicadores.
- Los tres cuerpos **no incluyen referencias literales** a `auth.uid`, `auth.jwt` ni `current_setting`. **No es prueba de ausencia de toda protección interna**: auditar lógica completa y callers por separado. Los tres cuerpos fueron identificados por huella sin imprimir su código ni leer registros de negocio.

## Evidencia que falta (no declarar VERDE)
- Confirmar físicamente que `public` está en los esquemas expuestos por Data API y comprobar habilitación de API en este proyecto.
- Inventariar consumidores reales: Edge Functions, SEO001, GitHub Actions, WordPress, otros motores y uso de funciones SECURITY DEFINER.
- Verificar copia recuperable (fecha, ubicación, alcance) y **ejecutar una restauración de prueba** sin alterar App/CRM/SEO reales. Los nombres `*_backups_preprod` **no acreditan** backups recuperables.
- Capturar contrato de acceso actual y comparar respuesta OLD/NEW con pruebas `anon`, `authenticated`, servicio y jobs antes del cambio.
- Confirmar rollback probado; luego aprobación humana de alto riesgo para modificar **una tabla cada vez**, revisar dependencias y auditar tras cada fase.
- Auditar las tres funciones SECURITY DEFINER por separado, incluidas sus verificaciones de autoridad y privilegios EXECUTE. No invocarlas como prueba en sistema real.

## Decisión
**NO ejecutar DDL/DML**, **NO activar RLS todavía**, **NO revocar permisos todavía**, **NO crear nuevas bases ni proyectos**, **NO promover FACT-001 a PROD**.
El riesgo de exposición API es potencial y grave, **no hay evidencia de acceso malicioso**; el estado sigue `HIGH_RISK` hasta resolver la exposición y compatibilidad.

**Referencia Supabase:** https://supabase.com/docs/guides/api/securing-your-api
**Informe de base:** `FACT001_SUPABASE_SECURITY_GATE_2026-11-11.md`.
**Secuencia conservadora:** CONSERVAR → ENTENDER → ENVOLVER → PROBAR → MEJORAR → MIGRAR.
