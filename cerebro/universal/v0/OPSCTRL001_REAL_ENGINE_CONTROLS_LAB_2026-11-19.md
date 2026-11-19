# OPSCTRL-001 · Mandos operativos reales · 19/11/2026

**Foco único:** interfaz OPERATIVA. Chat/voz: HECHO · A MEJORAR. Navegador, FACT/UMS, redes, trading, App/CRM y producción protegidos: **SIN CAMBIOS**.

## Origen y contratos conservados

- Rama candidata PREVIEW: `cerebro/operativa-live-evidence-bridge-lab-20261118`, PR #81 DRAFT, sin merge.
- Gateway de propietario existente, solo **lectura**: `fenix-app-gateway/session/context` en Supabase PROD `cluhljgonannaafpmblx`. Identidad obligatoria `actor_code=CARLOS-ADMIN`; JWT + apikey originales de la sesión.
- Motor existente QA-001 en LAB `hnqlnvakzaywtafeiybt`: cron #74, programación `*/15 * * * *`, comando exacto `select cerebro_lab.run_agent_qa_v1();`; recibos firmados existentes.
- Supervisor CERT-001 en el mismo LAB: cron #77, `3,18,33,48 * * * *`, comando `select cerebro_lab.run_cert_supervisor_v1();`; historial HMAC existente.
- CONSOLE-001 cron #82/#83, FACT-001, UMS-001 y demás sistemas conservados, **sin controles habilitados en esta versión**.
- El proyecto Vercel que administra `app.fenixcapital.es` NO está disponible mediante el conector conectado, que devuelve 403 al consultar dominios. Ninguna publicación en PROD es atribuida a OPSCTRL-001.

## Implementación real en LAB

1. Migración aditiva `20261119093000_opsctrl001_lab_command_gate_v1.sql`: tabla privada `cerebro_lab.operativa_operator_command_v1` con audit trail y RLS; RPC estado `public.cerebro_lab_operator_state_v1()` y ejecución `public.cerebro_lab_operator_command_v1(uuid,text,text)`.
2. Migración `20261119094500_opsctrl001_last_monitor_guard_lab.sql`: impide que se detengan simultáneamente QA y CERT. Operaciones seriadas mediante advisory lock, verificación de comando/schedule/job exactos, petición idempotente con UUID, límite `RUN_ONCE` 60 segundos, sin permisos para otros motores.
3. Seguridad SQL **comprobada**: `anon=false`, `authenticated=false`, `service_role=true` para ejecutar/consultar RPC; usuarios normales no tienen acceso a la tabla privada.
4. Edge LAB `cerebro-operativa-controls-lab-v1` v2 ACTIVE: GET/POST exactos con `company_id=fenix`, `environment=LAB`; validación owner contra PROD solo por GET; nunca recibe ni devuelve secreto de servicio; `verify_jwt=false` porque la función exige y valida JWT del propietario vía resolver.
5. API Vercel Preview `/api/cerebro-operativa-controls?company_id=fenix`: solo hostname permitido y VERCEL_ENV preview (o etapa privada exacta), owner verificado otra vez, reenvío a Edge sin permitir URL arbitraria ni comando fuera de lista.
6. UI `CerebroOperativaControlsLab.tsx`, cliente `cerebroOperativaControlsApi.ts`, CSS dedicado: mandos **Ejecutar ahora**, **Pausar**, **Reanudar** en vistas Motores y Trabajos, estado original de cron, histórico de órdenes, errores explícitos. En otros motores los mandos permanecen deshabilitados. Chat/voz no tocados.
7. Enlaces directos `op3_panel=motores` / `op3_panel=trabajos` validados para facilitar prueba visual. No cambian los permisos.

## Evidencias físicas SQL

- `QA-001 RUN_ONCE`: recibo `20261119-1000-4000-8000-000000000001`, `APPLIED`, `SUCCEEDED`, `audit_persisted=true`, `prod_execution_enabled=false`; repetición devuelve `ALREADY_APPLIED`, sin nueva ejecución.
- `PAUSE_SCHEDULE`: recibo `...0002`; consulta directa `cron.job` confirmó `jobid=74 active=false`.
- `RESUME_SCHEDULE`: recibo `...0003`; consulta directa confirmó `74 active=true` y `77 active=true`.
- Protección último monitor: `...0004` pausa QA; intento `...0005` de pausar CERT devuelve **`OPSCTRL_LAST_MONITOR_PROTECTED`**; consulta muestra CERT activo; `...0006` reanuda QA; ambos continúan activos. Error mapeado a HTTP 409.
- La prueba de control SQL se ha ejecutado con una conexión administrativa LAB **sin invocar el navegador**. La versión Preview requiere comprobar JWT, envío POST de UI y respuesta end-to-end antes de declarar «controles completos».
- No se han creado Jobs de cliente, disparado motores productivos, dado altas ni generado contenidos de pago.

## Seguridad, migración y rollback

- Cobertura actual: **dos motores diagnósticos**, no todos los motores de CEREBRO; no inferir autonomía universal. Se distingue `LAB` frente a `PROD` visual y contractualmente.
- Rollback de UI = reasignar alias privado al despliegue anterior `dpl_AVetCsC8dm5kERWTzVHGNYZDp9GR`. No modificar dominio APP real.
- Desactivar ejecución Edge sin perder auditoría: revocar `EXECUTE` al rol `service_role` para `public.cerebro_lab_operator_command_v1(uuid,text,text)`; restaurar por auditoría solo cuando corresponda.
- El trabajo `QA` o `CERT` queda activo por defecto tras las pruebas. **No borrar tablas ni recibos durante rollback**, conservar la evidencia.
- Para promoción a PROD faltan: acceso al proyecto correcto de Vercel, inventario y snapshot del despliegue real, compatibilidad Old/New, pruebas negativas de propietario/no propietario desde interfaz, ejecución HTTP firmada del propietario desde cliente, coste incremental medido y recuperación real.

## Estado

- SQL control real: **HECHO EN LAB**.
- Función Edge LAB: **ACTIVA**.
- Interfaz Vercel Preview: **PENDIENTE VERIFICACIÓN VISUAL**.
- App/CRM y PROD: **INTACTOS; NO PROMOCIÓN**.
- Nuevas suscripciones: **0 €**; uso marginal de servicios existentes pendiente de medir.
