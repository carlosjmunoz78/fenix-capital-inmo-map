# CEREBRO OS · OPSCTRL-001 · QA-001 OWNER RUN_ONCE · Evidencia E2E física (LAB)

Fecha local: 2026-11-19, 19:01:03 Europe/Madrid. Entorno: `LAB`. Empresa: `fenix`.

## Origen
El propietario confirmó una pulsación única de «Ejecutar ahora» en:
`https://fenix-capital-preprod-operativa.vercel.app/cerebro?section=operativa&op3_panel=motores`.

No se envió segunda orden desde los conectores durante esta verificación. Se hicieron únicamente consultas SELECT.

## Orden persistida
- Tabla: `cerebro_lab.operativa_operator_command_v1`, Supabase LAB `hnqlnvakzaywtafeiybt`.
- `request_id`: `38750b2f-72ac-4479-9014-5a5a9a1c2097`.
- `engine_id`: `QA-001`.
- `command`: `RUN_ONCE`.
- `outcome` / `result_status`: `SUCCEEDED`.
- `created_at`: `2026-11-19T18:01:03.439492Z`.
- `job_id`: `74`, `previous_active=true`, `final_active=true`.
- `prod_mutation=false`, `paid_execution=false`.
- `COUNT(*) WHERE request_id=... = 1`: una sola orden persistida. **No se repitió el UUID mediante POST** para comprobar idempotencia dinámica; esta prueba de no-duplicación se limita al ledger.

## Recibo físico de ejecución
- Tabla `public.cerebro_agent_sql_qa_receipt_lab_v1`.
- Recibo `130d06ab-938c-43ca-92d0-0eced2abfd67`.
- `observed_at=2026-11-19T18:01:03.457638Z`, 18.1 ms después de la orden persistida.
- `agent_role_id=ENG-QA`, `executor_id=cerebro_lab.run_agent_qa_v1`, `status=SUCCEEDED`, `tests_passed=6/6`.
- RPC observadora `public.cerebro_lab_qa_observe_v1()`: `signature_verified=true`, `physical_execution_evidenced=true`, `recent=true`, `operational_autonomy_certified=false`, `excellence_certified=false`.
- `customer_data_touched=false`, `prod_execution_enabled=false`, `additional_subscription_eur=0` según el recibo.

## Permisos, scheduler, producción
- `has_function_privilege` para invocar `public.cerebro_lab_operator_command_v1(uuid,text,text)`: `anon=false`, `authenticated=false`, `service_role=true`; lectura de estado RPC también denegada a anon/authenticated. El API proxy sigue teniendo verificación independiente del propietario.
- Cron LAB `#74` `*/15 * * * *`, `#77` `3,18,33,48 * * * *`, `#82` `17,47 * * * *`, `#83` `19,49 * * * *`: todos `active=true` tras la orden, programaciones intactas.
- Vercel alias real `app.fenixcapital.es` seguía mapeado a `dpl_3jZ9UZwEoXEE4wDd2vHpEqErHNGQ`; ninguna operación sobre App, CRM, producción o DNS.

## Calificación estricta
- `OPSCTRL-001 · QA-001 RUN_ONCE OWNER LAB`: **HECHO · evidencia física**.
- `QA-001` motor autónomo universal o PROD: **NO CERTIFICADO**.
- No se capturó código HTTP del POST original desde la pestaña; éxito confirmado por correlación de orden y recibo SQL. Tampoco se reejecutó de forma deliberada el mismo request_id para probar retorno ALREADY_APPLIED.
- Coste de nueva suscripción 0 €; consumo marginal de infraestructura existente sin medir.

### Continuidad
Conservar PR #81 en DRAFT; no usar esta acreditación para levantar gates de FACT/UMS/Trading ni conceder capacidades de producción. Ejecutar auditoría siguiente solo ante una misión aprobada concreta.
