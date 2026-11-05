# CEREBRO OS · PC-001 · Informe de implantación comprobada

**Fecha:** 2026-11-05. **Empresa:** fenix. **Motor:** PC-001. **Entorno implantado:** PREPROD (`hnqlnvakzaywtafeiybt`). **Estado:** `PREPROD_OWNER_HEALTH_ISSUER_INSTALLED_CODE_CI_GREEN_REMOTE_PHYSICAL_HOLD`.

## HECHO / VERIFICADO

- Migración Supabase `20261105111034_pc001_owner_health_private_grants_v1_20261105` aplicada. Esquema exclusivo `cerebro_pc001_private`, tablas `pc001_owner_health_grants_v1` y `pc001_owner_health_issues_v1` con RLS habilitado. Funciones de concesión, emisión y revocación `SECURITY INVOKER` y EXECUTE de `service_role` exclusivamente; `anon` y `authenticated` sin EXECUTE. Ninguna concesión creada al concluir.
- Nueva Edge Function `cerebro-pc001-health-issuer-preprod-v1`, versión 1, **ACTIVE** y `verify_jwt=true`; no reemplaza `cerebro-device-gateway-preprod` V9 ni `cerebro-owner-decision-gateway-v0` V1.
- Dos ensayos SQL reales en transacciones `ROLLBACK` sobre PREPROD: instalación temporal seguida de reversión; pruebas positivas de concesión/repetición, revocación/rechazo y emisión atómica/repetición/consumo único de crédito, sin persistencia ni entrega al PC. La migración instalada también fue inspeccionada en lectura.
- Fuente Edge + SQL + tests en rama `cerebro/pc001-owner-issued-health-canary-v0-20261105` del repositorio `carlosjmunoz78/fenix-capital-inmo-map`. GitHub Actions run `42018435529`: **79/79 PASS** contra el protocolo V2 real, política del propietario y contrato de emisor.
- PC-001, dispositivo `78ca78cf158b3cda329cf39e0270f0a5`: observado ONLINE; 0 órdenes pendientes; 0 permisos de propietario y 0 emisiones nuevas persistidas en el último corte. Se confirmó que existe 1 enlace de identidad de propietario en PREPROD (sin revelar datos privados).
- Supabase Security Advisor: dos avisos INFO `RLS Enabled No Policy` en las tablas privadas. Son esperables por el modelo exclusivo `service_role` y el cierre de permisos a clientes; no debe agregarse una policy abierta para ocultarlos.
- No suscripciones nuevas; consumo real no medido. App/CRM/Trading PROD y trabajador Windows original no modificados.

## PENDIENTE PARA PRUEBA E2E REAL

1. Obtener una **sesión de propietario autenticada de Supabase PREPROD** por el propio propietario, sin copiar credenciales o JWT al chat. La sesión del Supabase PROD de App Fénix NO sirve por defecto. La identidad management de Supabase tampoco sustituye por sí sola un JWT de usuario PREPROD.
2. Crear una concesión exacta `ONE_TIME` mediante la Edge V1, no a mano por SQL. Enviar la orden `READ_HEALTH` con el mismo contexto y esperar recepción real por el worker original. Verificar `COMPLETED`, `semantic_verified=true` y un receipt saneado, además de replay/caducidad/revocación.
3. Ejecutar prueba de concurrencia con conexiones independientes, no solo simulación secuencial en una misma transacción.
4. Revisar e integrar de manera reversible el broker de control Windows UI/FS. No está instalado ni probado: el trabajador actual solo ejecuta `SERVICE_HEALTH / READ_HEALTH`. Requiere aceptación local visible, kill switch, no dos pollers, backup/snapshot y restauración del worker original.
5. Pasar OLD vs NEW, QA/tribunal, observabilidad/costes/rollback y canary; solo entonces considerar PROD. No hay autorización técnica para control genérico en PROD.

## ENLACES DE EVIDENCIA

- CI: https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42018435529
- Registro de instalación: https://github.com/carlosjmunoz78/fenix-capital-inmo-map/blob/cerebro/pc001-owner-issued-health-canary-v0-20261105/cerebro/windows/pc-001/PC001_PREPROD_OWNER_HEALTH_GATE_INSTALLED_20261105.md
- Supabase PREPROD Edge: https://supabase.com/dashboard/project/hnqlnvakzaywtafeiybt/functions/cerebro-pc001-health-issuer-preprod-v1

## REGLA DE PROMOCIÓN

`PROD = HOLD` hasta E2E físico, auditoría de permisos y rollback; `PREPROD = INFRASTRUCTURE INSTALLED AND CI GREEN` sin declarar falsa ejecución remota. El código de prueba no concede permisos automáticos y ninguna orden de manipulación de escritorio existe en este ejecutor.