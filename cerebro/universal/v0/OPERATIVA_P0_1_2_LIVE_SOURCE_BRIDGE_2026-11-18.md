# CEREBRO OPERATIVA · P0 puntos 1 y 2 · continuidad exacta · 18/11/2026

## Estado
- **HECHO LAB / PR #81 DRAFT:** proyección de evidencias por ID del registro de 2.506 perfiles, sin asignación manual.
- **HECHO LAB:** lector owner-only para inventario de Cloudflare Workers y Supabase Edge Functions; se consulta desde pantalla existente con intervalo 30 s, solo host privado y sin mutaciones.
- **HECHO CI:** workflow `CEREBRO Operativa verified evidence bridge LAB` y `CEREBRO Governed Main Integration V0` con SUCCESS en HEAD de implementación. Compilación TypeScript/Vite y pruebas de identidad/caducidad/duplicación/tenant.
- **HECHO verificación externa solo lectura:** 45 Workers listados por Cloudflare; 120 Edge Functions listadas por Supabase PROD. **No son 165 agentes ni 165 motores activos.**
- **PARCIAL:** ni la cobertura de todos los ejecutores ni los recibos individuales están conectados a PROD. No se marca ningún perfil activo a partir de inventario o de jobs sin identidad.
- **PROD sin cambios:** App, CRM, WordPress, Supabase, DNS, Worker, dominios, permisos, cuotas y secretos.

## Barrera técnica única para completar integración
La lectura del proyecto Vercel aislado `prj_tz5NfMwhscoVj2OCBOIvb0oXC6jc` muestra cuatro variables Preview actuales: `CEREBRO_PREPROD_PUBLISHABLE_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_FENIX_ENV`. No están configuradas allí `CEREBRO_CF_READ_TOKEN_PREVIEW` ni `CEREBRO_SUPABASE_MGMT_READ_TOKEN_PREVIEW`. La API responde explícitamente `NOT_CONFIGURED` por proveedor hasta tener credenciales **de solo lectura** custodias, sin intentar usar credenciales personales ni promover a PROD.

En Supabase LAB, las tablas de jobs JARVIS y Browser conservan `engine_id`, `worker_id/leased_by`, estado y heartbeat, **pero no asignan de modo universal un `agent_role_id` ni `subagent_role_id` del directorio**. No deducir identidades a partir del nombre del Worker, `engine_id` ni actor genérico CEREBRO.

## Próximo bloque único
1. Reutilizar o emitir credenciales restringidas de lectura para ambos proveedores en el **proyecto Vercel LAB aislado**; sin mostrar su valor ni contratar servicios. Comprobar que los dos estados pasan a LIVE mediante owner real; si un proveedor carece de API apropiada, declararlo PARTIAL.
2. Añadir un único hook de recibo por **runtime compartido** (no 2.477 integraciones): `company_id, engine_id, environment, version, executor_id, job_id, receipt_id, agent_role_id, subagent_role_id?, event, emitted_at`. La prueba de integridad/firma y vínculo con el servicio emisor debe verificarse en backend ANTES de proyectar el recibo. Un rol solo queda activo con STARTED/HEARTBEAT reciente y recibo auténtico; SUCCEEDED/FAILED acredita histórico, no ejecución presente.
3. Pasar E2E real y OLD vs NEW aislado + rollback físico y coste medido; conectar el contrato de lectura al Gateway común JARVIS/OPERATIVA/NEURONAL. No cambiar `app.fenixcapital.es` antes del gate.

## Siguiente estado permitido
- Fuente instalada/Worker desplegado: `INVENTORY_LIVE`, **no** `AGENT_ACTIVE`.
- Recibo íntegro de ID existente: `EXECUTION_EVIDENCED`.
- STARTED/HEARTBEAT auténtico reciente (<120 s): `ACTIVE_RECENT`.
- Sin recibo: `NOT_VERIFIED`; jamás `INACTIVE` por ausencia de evidencia.
- `HUMAN_REQUIRED` solo para excepciones previstas; de lo contrario seguir LAB autónomo.

Regla invariable: conservar los 2.506 registros, preservar los 179 motores/82 departamentos del snapshot actual sin inventar instancias ni modificar App/CRM.
