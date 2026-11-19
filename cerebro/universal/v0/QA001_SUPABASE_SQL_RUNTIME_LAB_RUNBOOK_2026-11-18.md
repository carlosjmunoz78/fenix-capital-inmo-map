# CEREBRO OS · QA-001 · Runtime independiente de GitHub Actions · 18/11/2026

## Registro de motor y estado

- `company_id=fenix`; `engine_id=QA-001`; `agent_role_id=ENG-QA`; `environment=LAB`; `version=1.0.0`.
- **HECHO:** ejecución física de controles deterministas en Supabase LAB, no simulación de una acción de otro motor.
- **HECHO:** `cron.jobid=74`, job `cerebro-agent-qa-001-lab-v1`, programación `*/15 * * * *`. No depende de GitHub Actions, Make, suscripciones nuevas ni IA de pago.
- **HECHO:** 3 recibos duraderos verificados durante el cierre (uno lanzado manualmente y al menos uno por `pg_cron`; los 3 tenían `6/6` condiciones cumplidas según supervisor). El segundo recorrido automático consta en `cron.job_run_details` como `succeeded` a las 19:34 UTC.
- **HECHO:** firma HMAC-SHA256 generada y verificada dentro del servidor, con secreto aleatorio en esquema privado; clave nunca incluida en GitHub ni devuelta al navegador.
- **HECHO:** vista protegida del propietario en https://fenix-capital-preprod-operativa.vercel.app/cerebro?section=operativa&op3_panel=agentes muestra `QA-001`, evidencia del recibo, 6/6 y 3 ejecuciones, comprobada en Opera autenticado.
- **NO EQUIVALE A:** agentes físicos para el resto de los 2.477 perfiles, autonomía de operaciones comerciales, tribunal de excelencia o promoción a PROD.

## Dependencias y contratos

1. Proyecto existente Supabase LAB `hnqlnvakzaywtafeiybt`, extensiones `pg_cron` y `pgcrypto` preexistentes.
2. `cerebro_lab.qa_signing_key_v1` (privado, sin acceso de anon/authenticated/service_role); `cerebro_lab.run_agent_qa_v1()` (solo postgres). Ningún cliente conoce la clave.
3. `public.cerebro_agent_sql_qa_receipt_lab_v1`: nueva tabla aislada RLS, solo `service_role` puede leer, no insertar ni modificar. No contiene datos de clientes.
4. `public.cerebro_lab_qa_observe_v1()`: RPC de verificación interna de firma. `EXECUTE` exclusivamente a `service_role`; `anon` y `authenticated` DENEGADOS.
5. Edge LAB `cerebro-agent-qa-health-lab-v1` v1: solo GET, verifica identidad `CARLOS-ADMIN` mediante Gateway de PROD en modo lectura y lee RPC con `service_role` del LAB. Nunca envía ese secreto al cliente.
6. Vercel Preview `api/cerebro-executor-coverage.ts` consulta esa Edge usando la sesión del propietario y publica cobertura separada: infraestructura, prueba de ejecución física de QA y calidad global aún no acreditada.
7. UI `src/CerebroRoleAgentRosterReadonly.tsx` actualiza la cobertura cada 30 segundos, sin desplegar ni modificar App/CRM.
8. Migración versionada `supabase/migrations/20261118204500_cerebro_agent_sql_qa_lab_v1.sql`, fuente Edge versionada en `supabase/functions/cerebro-agent-qa-health-lab-v1/index.ts`.

## Los 6 controles de QA reales

- Existencia del origen JARVIS de trabajos LAB.
- Existencia del origen de trabajos de navegador LAB.
- Existencia de la tabla separada de recibos de GitHub, sin alterarla.
- RLS activado en la nueva tabla de evidencias.
- Prohibición de lectura anónima sobre recibos.
- Prohibición de acceso a la clave privada para usuarios autenticados.

Un resultado `SUCCEEDED` de este conjunto **no acredita la calidad de los restantes motores**. Se etiquetará siempre `QA_METADATA_PROBES_PASSED_NO_TRIBUNAL`.

## Gates de seguridad físicamente comprobados

- Ejecución SQL local: `SUCCEEDED` `6/6` con `receipt_id` durable.
- Supervisión SQL: `signature_verified=true`, `physical_execution_evidenced=true`.
- Autoejecución `pg_cron`: estado `succeeded`, recibo nuevo comprobado.
- `anon_can_read=false`, `authenticated_can_read=false`, `service_can_read=true`, `service_can_run=false`, `anonymous_can_use_private_schema=false`.
- Edge y API Vercel respondieron `OWNER_SESSION_REQUIRED` sin sesión.
- Vista Opera del propietario mostró resultado REAL y prueba firmada.

## Observabilidad y consultas de operación

```sql
select jobid,jobname,schedule,active from cron.job where jobname='cerebro-agent-qa-001-lab-v1';
select status,start_time,end_time,return_message from cron.job_run_details where jobid=74 order by start_time desc limit 5;
select public.cerebro_lab_qa_observe_v1() as qa_supervisor;
select count(*) as signed_receipts from public.cerebro_agent_sql_qa_receipt_lab_v1;
```

## Pausa, rollback y rebuild

- **Pausa segura prevista** (NO ejecutada al redactar): `select cron.unschedule('cerebro-agent-qa-001-lab-v1');`
- **Reanudar** tras comprobar estado: `select cron.schedule('cerebro-agent-qa-001-lab-v1','*/15 * * * *','select cerebro_lab.run_agent_qa_v1();');`
- Conservar y exportar la tabla de recibos y el resultado de supervisor antes de una retirada definitiva. Nunca copiar el contenido de la tabla privada de firma a un log o respaldo sin cifrado.
- En caso de regresión en la UI, reasignar el alias **solo de LAB** al último deployment conocido; no alterar dominios de producción.
- Rebuild: aplicar únicamente la migración ya versionada a un LAB vacío, desplegar Edge a una nueva versión, ejecutar un recibo firmado y comprobar firma/RLS antes de programar cron.
- No fusionar PR #81, no promocionar a producción sin inventario, OLD-vs-NEW, pruebas, tribunal, backup, rollback probado y coste medido.
- **Costes:** ninguna suscripción contratada; consumo incremental de DB/Edge/Vercel no medido, por tanto no afirmar coste absoluto 0€.

## Estado de autonomía

- `QA-001` motor SQL de pruebas: **EJECUCIÓN PROGRAMADA Y VERIFICADA EN LAB**.
- `ENG-QA`: una identidad lógica explícita atribuida a la función y sus recibos; no proceso autónomo universal.
- Otros 2.476 roles acreditables: **POR ACREDITAR FÍSICAMENTE**.
- 29 plantillas: **NO INSTANCIADAS**.
- `excellence_certified=false`, `operational_autonomy_certified=false`, `prod_execution_enabled=false`.
- El circuito separado de JWT técnico `cerebro-e2e@fenixcapital.es` había pasado pruebas reales, sin necesidad de GitHub Actions para ejecutar el nuevo QA SQL.
