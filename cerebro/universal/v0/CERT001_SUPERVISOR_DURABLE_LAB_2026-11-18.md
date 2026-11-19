# CEREBRO OS · CERT-001 LAB · Tribunal previo, supervisión firmada y estados reales
**Fecha:** 18/11/2026 · **Entorno:** Fénix, LAB, Supabase `hnqlnvakzaywtafeiybt` · **Estado:** definido e implementado, NO producción autónoma.

## Inventario / dependencias conservadas
- QA-001: `cron.job 74` preexistente en este bloque, `*/15 * * * *`; `cerebro_lab.run_agent_qa_v1()`, HMAC-SHA256, tabla nueva aislada de recibos. 6/6 controles comprobados.
- FACT-001: lectura de la tabla EXISTENTE `public.cerebro_universal_fact_attestation_lab_v0`: recibo del 14/11/2026 `9bac7b1c-3ccc-4634-8866-e4a82eb6716f`, capacidad `fact.registry.attest`, 179 entradas, 177 base conservadas, ejecución determinista sin acciones externas. **No prueba motor de fabricación autónomo.**
- CONSOLE-001: 123 jobs históricos en fuentes Browser/JARVIS, 0 identificadores de rol verificables y 0 metadatos recientes en esas fuentes. No reactivados.
- UMS-001: 1 job histórico en HOLD; no reactivado, sin compras, generación multimedia ni publicación.
- Cron social: 19 tareas con prefijo cerebro-social-, 17 activas, 2 inactivas. El auditor inspecciona SOLO los últimos 1200 registros cron; no inferir fallos de los trabajos que no aparecen. Observación inicial: 9 con última ejecución `succeeded` en la muestra, no implica resultados comerciales.
- GitHub Actions bloqueado por proveedor: este supervisor NO depende de Actions, Make ni IA de pago.

## Cambios aditivos implementados
- `public.cerebro_lab_certification_gates_v1()` · función solo lectura, agregación de cinco fuentes, certificación general siempre FALSE; acceso RPC únicamente `service_role`. Migrations `20261118211000...`, corrección acotada `20261118211800...`, corrección de rowtype `20261118212200...`; las correcciones son parte necesaria del rebuild.
- Edge nueva `cerebro-certification-gates-lab-v1` v1: GET fijo, validación real del propietario contra PROD Gateway, solo lectura desde LAB y sin exponer claves.
- `cerebro_lab.cert_supervisor_secret_v1` y `cert_supervisor_history_v1`: nuevas tablas privadas; HMAC en dominio `CEREBRO_CERT_SUPERVISOR_V1`; sin acceso público ni de usuarios normales.
- `cerebro_lab.run_cert_supervisor_v1()`: función programable que consulta gates y persiste *su propia* evaluación, sin mover ningún job de negocio; componente lógico compartido, NO nueva instancia para cada agente.
- `public.cerebro_lab_cert_supervisor_observe_v1()`: compara HMAC firmado, historial y caducidad; sólo servicio autorizado. Resultado inicial `status=OK`, `signed=true`, `history_count=1`, `gate_count=5`, `health=EVIDENCE_OK_NOT_CERTIFIED`.
- Cron NUEVO `cerebro-cert-supervisor-lab-v1` id `77`; periodicidad final deseada cada 15 minutos, desfasado 3 minutos respecto al QA. Ajustes temporales de frecuencia solo para prueba física y restauración posterior.
- Edge nueva `cerebro-cert-supervisor-history-lab-v1` v1: consulta GET privada, verifica actor CARLOS-ADMIN y lee función servidora; probado 401 OWNER_SESSION_REQUIRED sin token.
- Vercel Preview aislado, alias único `fenix-capital-preprod-operativa.vercel.app`; devuelve gateboard y watchdog solo en sesión de propietario. Ningún alias/DNS de PROD cambiado.

## Pruebas reales y defensas
1. Firma QA: 5 ejecuciones cron observadas, 5 completadas; media observada **29,10 ms**, máximo **50,12 ms**, muestra acotada. Esto es duración de SQL, **no coste en euros**.
2. RPC gateboard: `status=OK`, 5 categorías, todos los flags `full_engine_certified=false`; vistas de QA+FACT históricas correctamente segregadas de CONSOLE/UMS. Primera implementación superó timeout por búsqueda de cron histórica ilimitada; reemplazada por últimas 1200 filas y comprobada.
3. HMAC supervisor: primera ejecución manual `receipt_id=ee50af01-01b1-4f4d-a13f-5324ea8db16b`, verificación SQL firmada y persistida; acceso al secreto no concedido a `service_role`, anon ni authenticated.
4. Seguridad: anon/authenticated NO EXECUTE en lectura de supervisión y gates, `service_role` SÍ. Public Edge exige propietario, 401 sin sesión, sin exponer claves ni trabajos.
5. Rollback del programador: job de prueba `76` creado, eliminado con `cron.unschedule` y comprobado ausente; job productivo LAB QA `74` conservado activo. No equivale a rollback completo de PROD.
6. Compilación Vercel Preview READY y comprobación visual Opera autenticado: 5 filas de gateboard y widget de supervisor firmado. Guardar el deployment exacto en changelog de PR.

## Control de coste y gates de promoción
- Suscripciones nuevas: **0**; consumo marginal Cloudflare/Supabase/Vercel **sin medir en €**. Ventana de logs y SQL acotada. Sólo metadata de trabajos, sin clientes.
- CERT-001 observa y alerta visualmente, **no autoriza promociones ni ejecuta trabajos HOLD**.
- Tabla de estados: QA-001=ejecución diagnóstica HMAC LAB; FACT-001=atestación del registro histórica LAB; CONSOLE-001=históricos sin atribución; UMS-001=HOLD; Social=programaciones técnicas, sin acreditación de outcomes.
- Sin elevar a PROD hasta contrato actual, mapa de dependencias, backup/snapshot externo, pruebas independientes por motor, tribunal, observabilidad, coste medido, rollback end-to-end, OLD-vs-NEW y promoción gradual.

## Operación / rollback
```sql
select public.cerebro_lab_certification_gates_v1();
select public.cerebro_lab_cert_supervisor_observe_v1();
select jobid,jobname,schedule,active from cron.job where jobid in (74,77);
-- Pausa solo del nuevo supervisor LAB, cuando sea necesario:
select cron.unschedule('cerebro-cert-supervisor-lab-v1');
-- Reinstalar una vez comprobados permisos y gates:
select cron.schedule('cerebro-cert-supervisor-lab-v1',
 '3,18,33,48 * * * *','select cerebro_lab.run_cert_supervisor_v1();');
```
Para reconstrucción, aplicar las migraciones versionadas por orden, no reejecutar los jobs históricos. Conservar la clave firmante dentro de almacén privado y hacer respaldo externo cifrado antes de una migración definitiva. Promoción PROD=HOLD.

## 18/11/2026 · Cierre físico del cron y reversibilidad
- El programador #77 fue temporalmente configurado en `* * * * *` solo para prueba de ejecución autónoma real.
- `cron.job_run_details` acreditó runs **SUCCEEDED** a 20:26:00 y 20:27:00 UTC. El verificador privado recuperó **4 informes duraderos**, HMAC verdadero, 5 gates, `health=EVIDENCE_OK_NOT_CERTIFIED`; último informe consultado a las 20:28 UTC (recibo `4b17f182-b1cd-4254-a82b-3a2e7ab76865`).
- Reestablecido programador #77 a `3,18,33,48 * * * *` y confirmado ACTIVO; QA #74 sigue `*/15 * * * *` ACTIVO.
- Registro temporal de rollback #76 creado, eliminado y comprobado ausente; **solo prueba reversibilidad del planificador**, no del sistema PROD.
- Vercel último deployment compilado READY `dpl_FrHvqwa8zWjZN6B9DKW6yjhCkBfj` SHA `4c26bbd562b2e4a13e2833983f96aa559fa510f0`, promovido exclusivamente a alias privado LAB. Opera autenticado muestra `SUPERVISOR AUTÓNOMO LAB`, un informe HMAC verificado, la matriz de 5 fuentes y no-certificación de los demás motores. Tras los runs naturales el historial pasó a 4, validado mediante SQL.
- Edge `cerebro-cert-supervisor-history-lab-v1` devuelve `OWNER_SESSION_REQUIRED` para GET sin JWT; no contiene claves en la respuesta.
- Pruebas de firma, permisos y gates VERDES; falta coste monetario, backup independiente y autorización de promoción. Las 17 tareas sociales activas no equivalen a 17 agentes acreditados.

## Changelog
- v1.0: matriz FACT / CONSOLE / UMS / QA / cron social.
- v1.0.1: corregido timeout de consulta global de `cron.job_run_details` restringiendo la consulta a las últimas 1200 filas.
- v1.0.2: corregida alineación del ROWTYPE de la atestación FACT.
- v1.0.3: supervisor programado, HMAC privado con dominio separado, historial durable, API GET propietaria, panel y prueba de rollback temporal.
- Manifest: `cerebro/universal/v0/cert-supervisor-lab-v1.manifest.json`; preservado registro de 179 motores: es un componente compartido de supervisión, no un motor adicional contabilizado.
