# CEREBRO OS · AUDIT-001 · Verdad operacional sin GitHub Actions · 2026-11-18

## Motivación
El propietario indica que GitHub Actions está temporalmente bloqueado. No se espera a la liberación para observabilidad. La nueva auditoría funciona con Supabase LAB preexistente, sin ejecutar ni modificar trabajos ajenos.

## Componentes
- SQL RPC: `public.cerebro_lab_engine_truth_v1()`, generada mediante `supabase/migrations/20261118210000_cerebro_lab_engine_truth_v1.sql`.
- Edge LAB aislada: `cerebro-engine-truth-lab-v1` versión 1, ruta GET exclusiva y autenticación de CARLOS-ADMIN vía gateway de SOLO LECTURA.
- Frontend privado: `api/cerebro-executor-coverage.ts`, `src/cerebroExecutorCoverageApi.ts`, `src/CerebroRoleAgentRosterReadonly.tsx`. Reutiliza el alias LAB `fenix-capital-preprod-operativa.vercel.app`. Sin mutación de App/CRM/DNS/WordPress/PROD.

## Evidencia física
Conector de Supabase LAB `hnqlnvakzaywtafeiybt`, consulta ejecutada:
`select public.cerebro_lab_engine_truth_v1() as engine_audit;`

Resultado:
| fuente | engine_id | histórico | eventos últimos 5 min | identificador de rol explícito | diagnóstico |
|---|---|---:|---:|---:|---|
| BROWSER | CONSOLE-001 | 117 | 0 | 0 | NO_RECENT_METADATA |
| JARVIS | CONSOLE-001 | 6 | 0 | 0 | NO_RECENT_METADATA |
| CREATIVE | FACT-001 | 17 | 0 | 0 | NO_RECENT_METADATA |
| CREATIVE | UMS-001 | 1 | 0 | 0 | NO_RECENT_METADATA |

Total: 141 registros; NO implican que los motores estén operativos hoy. Un mismo engine_id puede aparecer en varias fuentes. No atribuir ninguna de estas filas a un agente individual. Los trabajos no se han reprogramado, reactivado, tocado ni duplicado.

QA-001 (recurso separado): último recibo firmado con `6/6` controles, 4 recibos históricos al auditar; firma válida. Este motor LAB sí tiene ejecución física demostrada, pero no implica excelencia/tribunal ni promoción a PROD.

## Seguridad
- `anon` EXECUTE de `public.cerebro_lab_engine_truth_v1()` = FALSE; `authenticated` = FALSE; `service_role` = TRUE. `security definer` confinado a esta RPC con salidas agregadas, `search_path` restringido y permisos explícitos.
- Edge exige owner JWT vigente y key publicable PROD entregada solo para verificar owner; el servicio LAB firma las consultas vía key server-only. Sin claves en respuestas ni logs.
- El frontend rechaza datos sin el contrato exacto, y los muestra como históricos, sin falso VERDE.
- GitHub Actions no interviene. Vercel Preview fue compilado READY y alias privado actualizado; verificado visualmente desde Opera conectado con la sesión de propietario.

## Recovery / rollback / rebuild
- Si se degrada el nuevo panel, revertir SOLO alias LAB al deployment READY previo `dpl_EB8tcemgi57VDkEFL1KHWsud3AqN` (no afecta dominio PROD).
- Para dejar de mostrar auditoría: deshabilitar solo la consulta en el puente LAB. Para retirar la RPC aislada DESPUÉS de exportar el resultado, `drop function public.cerebro_lab_engine_truth_v1();`. Nunca eliminar tablas de trabajos históricas.
- Para reconstruir, aplicar la migración y desplegar la Edge en LAB, comprobar permisos, ejecutar RPC y E2E de dueño + rechazo anónimo.
- Rollback exacto no ejecutado y backup físico de la RPC no evidenciado; no considerar READY para PROD.

## Estado y próximos gates por motor
- `QA-001`: programa `pg_cron`, prueba firmada, integridad comprobada; **EJECUCIÓN ACREDITADA EN LAB**, **NO AUTONOMÍA PROD CERTIFICADA**.
- `CONSOLE-001`: trabajos antiguos; revisar ejecutor compartido real y añadir `agent_role_id` durante la ejecución solo en un módulo nuevo en paralelo, nunca editar datos históricos; probar un job con resultado seguro.
- `FACT-001`: 17 trabajos previos, en categorías SUCCEEDED/HOLD; no activar trabajos HOLD sin diagnóstico y gates. Instrumentar recibo en runtime físico LAB antes de atribuir rol.
- `UMS-001`: HOLD; no reactivar producción multimedia ni gastos sin validación de derechos/permisos/coste.
- Otros 2.476 perfiles: NO ACREDITADOS FÍSICAMENTE. Cada nueva ejecución verificada requiere company_id,engine_id,environment,version,actor/rol,job_id,estado,tiempo,firma y supervisión. Ni plantillas ni filas anteriores se consideran instancias operativas.
- `CEREBRO_E2E` identidad técnica: la prueba real de JWT dinámico fue SUCCESS antes del bloqueo de Actions; el motor SQL actual NO necesita Actions.

## Coste
No se creó ningún plan nuevo ni se ejecutó IA de pago; consumo marginal existente de CPU/Edge/Vercel/DB no medido. Mantener presupuestos bajo control.

## Prohibiciones
No fusionar PR #81 ni promocionar antes de gates contractuales, permisos, evaluaciones, tribunal, backup, rollback probado, costes, PREPROD cuando corresponda, OLD-vs-NEW y seguridad. App/CRM/Supabase PROD/WordPress/DNS y Trading intactos.
