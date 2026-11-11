# FACT001 · Supabase Universal · SECURITY / BACKUP / DEPENDENCY GATE

**11/11/2026 · Estado: HIGH_RISK · HUMAN_REQUIRED para cualquier corrección de los recursos SEO existentes.** Auditoría física estrictamente SOLO LECTURA. No confundir con confirmación de incidente real ni explotación.

## Dos proyectos existentes (no descartables)
| Proyecto | Ref | Tablas public | RLS ON | Edge | Migraciones |
|---|---|---:|---:|---:|---:|
| fenix-capital-prod | `cluhljgonannaafpmblx` | 38 | 38 | 110 | 263 |
| fenix-capital-inmo-map | `hnqlnvakzaywtafeiybt` | 157 | 149 | 360 | 538 |

Dependencias relacionales: **PROD 18 FK / 259 funciones SQL public**, **MAP 30 FK / 399 funciones SQL public**. Contrato histórico 05/09/2026 de `fenix_prod`: 29 tablas, 24 Edge, contratos Gateway→CRM→documentos; no asumir que el conteo de `public` actual sustituye al de esquema `fenix_prod`. No se accedió a datos personales ni valores de secretos.

## Hallazgo principal · 8 tablas SEO de public

Las siguientes tablas en proyecto MAP tienen **RLS desactivado** y privilegios efectivos de `anon` y `authenticated` para **SELECT, INSERT, UPDATE y DELETE** (comprobado con `pg_catalog` y `has_table_privilege`):
- `public.seo_cerebro_autonomy_capabilities_preprod`
- `public.seo_cerebro_b2b_strict_audit_preprod`
- `public.seo_cerebro_b2c_strict_audit_preprod`
- `public.seo_cerebro_infrastructure_audits_preprod`
- `public.seo_cerebro_landing_contract_qa_preprod`
- `public.seo_cerebro_paused_cron_jobs_preprod`
- `public.seo_cerebro_sitewide_archive_backups_preprod`
- `public.seo_cerebro_sitewide_backups_preprod`

El linter oficial Supabase confirmó `rls_disabled_in_public` nivel **ERROR**, 8 hallazgos. El mismo proyecto tiene **3 vistas security-definer** clasificadas ERROR. Otros avisos de posibles funciones privilegiadas y GraphQL también requieren evaluación individual. Referencia: https://supabase.com/docs/guides/database/database-linter?lint=0013_rls_disabled_in_public

**Riesgo**: permisos efectivos en BD y ausencia de RLS en esquema `public`. La exposición concreta por API depende de configuraciones de Data API aún no verificadas. No hay evidencia de explotación, pero el riesgo potencial es serio. No habilitar RLS ni revocar GRANT a ciegas: las integraciones SEO existentes podrían estar usando estas tablas con `anon` o `authenticated`.

## Backups y gate de despliegue
Documentación oficial Supabase indica que el plan **Pro** ofrece backups automáticos diarios con retención de 7 días: https://supabase.com/docs/guides/platform/backups. **No se ha verificado un backup reciente físico en el Dashboard ni se ha probado restauración de estos proyectos**. No declarar Backup=VERDE. Branches/sandboxes nuevos pueden tener coste horario y está prohibido crearlos con el coste máximo autorizado 0 €.

Secuencia para remediación: 1) comprobar Data API/schema y permisos reales; 2) inventariar consumidores SQL/Edge/SEO/WordPress de las 8 tablas; 3) capturar un backup/restauración verificable o snapshot acotado + tests; 4) desarrollar política y permisos equivalentes en entorno aislado; 5) comparar comportamiento OLD vs NEW; 6) rollback probado; 7) promoción granular, validando SEO; 8) auditoría posterior y monitorización.

El gate `HIGH_RISK` requiere decisión humana para la modificación del recurso existente. No se ha aplicado SQL DDL/DML ni alteración de grants o funciones existentes.

## Factory / autonomía segura
- Identidad independiente GitHub OIDC → Supabase Headless Broker ya verificó lectura con Management PAT `cerebro_supabase_management_pat_v1` almacenado en Vault; no moverlo a GitHub/ChatGPT.
- Se preparó un motor lógico compartible `supabase/universal-lab/policy.mjs`, manifest y tests, **sin despliegue de servicio nuevo**. Lecturas permitidas solo en dos proyectos fijos, mutaciones bloqueadas explícitamente. No añadir subcripciones, DB ni más servidores.
- Escrituras genéricas Supabase Universal: **NO VERIFICADAS**. Ningún nuevo proyecto, tabla, RLS, GRANT ni Edge desplegado por este bloque.

**Próximas evidencias**: revisión de consumidores, snapshot operativo y comprobación física de backup; gate humano solo ante cambio real de permisos con riesgo.


## Dependencias SQL físicas (inventario complementario)

Consulta de solo lectura sobre `pg_proc.prosrc`, `pg_trigger`, `pg_constraint` y `pg_rewrite` detectó tres funciones del esquema `public` que referencian directamente las primeras tres tablas:

| Tabla | Función SQL vinculada | SECURITY DEFINER | EXECUTE anon |
| --- | --- | --- | --- |
| `seo_cerebro_autonomy_capabilities_preprod` | `public.seo001_refresh_autonomy_capabilities_preprod` | Sí | Sí |
| `seo_cerebro_b2b_strict_audit_preprod` | `public.seo001_b2b_strict_gate_preprod` | Sí | Sí |
| `seo_cerebro_b2c_strict_audit_preprod` | `public.seo001_b2c_strict_gate_preprod` | Sí | Sí |

Ninguna de las ocho tablas tiene triggers de usuario, FK o dependencias de vistas declaradas detectadas por estas consultas. **Esto no descarta consumidores externos por Edge/SEO/WordPress ni SQL dinámico**. No se ha ejecutado ninguna de estas funciones ni leído registros de negocio. No se ha auditado todavía el cuerpo de sus controles de autenticación; la capacidad de invocación `anon` no demuestra por sí sola que permitan efectos no autorizados. Mantener HIGH_RISK y bloquear remedios masivos hasta mapear todos los callers.
