# JARVIS CUT49 · Malla de mando auditada y verificación de conectividad

**Fecha:** 2026-11-07. **Entorno:** LAB/PREPROD lógico. **Estado:** CANDIDATO SIN DESPLIEGUE.  
**Fuente:** CUT48 PR #33; sin cambios en App/CRM/Edge Function v33/ANA/main/CUT30/DNS/Trading/Cloudflare/Notion/SEO/WordPress.  
**Coste:** 0 € nuevas suscripciones; 0 TTS/IA de pago; GitHub Actions usa el cupo disponible, no conciliado.

## 0. Precondición: regresión cerrada sin tocar el runtime
Incidente: prueba `PROD_MAX deterministic durable 50-job gate is GREEN` produjo 31/50 durante un shard general. El test era idéntico en CUT47/CUT48 (Git blob `ef8a581c61e50d71c044205b7bd88fbf92a6e3c2`). Se estabilizó **solo el presupuesto de tiempo del ensayo**: deadline y lease de 15 s en su fixture de 50 trabajos, manteniendo 50 trabajos, 48 de concurrencia, idempotencia, durabilidad, restitución y rechazo de Trading/PROD. **No se modificó JOB-001 ni la semántica temporal de producción**. El test no demuestra SLA de 2 segundos bajo disco compartido.
- `CEREBRO PROD_MAX Load Matrix V1` [#42311453182](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42311453182): SUCCESS; 4/4 tests de carga, 27/27 suplementarias; regresión larga 2688 PASS/0 FAIL, 10 omitidas explícitamente.
- `CEREBRO Enterprise Acceleration V0` [#42311453189](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42311453189): 24/24 jobs SUCCESS, incluida comparación OLD vs NEW.
- `CEREBRO Governed Main Integration V0` [#42311452901](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42311452901): SUCCESS.

## 1. Inventario exacto, no confundir catálogo con conexión
Fuente `cerebro/registry/engine-registry.v1.json`:
- **179** IDs catalogados. Por defecto `UNKNOWN_REQUIRES_AUDIT`. No equivale a 179 procesos, APIs o agentes operativos.
- Fuente `cerebro/registry/console-v0.json`: **cinco** motores de consola `CONSOLE-001`, `CHAT-001`, `CTX-001`, `CMD-001`, `ACTGW-001`. La interfaz de JARVIS NO ha demostrado comunicar con los restantes 174 a través de la Edge Function en producción.
- Fuente `cerebro/registry/existing-engine-bindings.json`: **nueve** referencias parciales y conservadoras (discovered-read-only / contract-only / Trading aislado). `prod_execution_enabled=false`.
- Fuente `cerebro/registry/role-agent-registry.v1.json`: **11** perfiles: diez roles técnicos `FULL_SAFE_PREPROD` y un perfil agente comercial `PLAN_ONLY`. Los 11 tienen `reports_to_state=UNRESOLVED`; no están certificados como 11 procesos/servicios que respondan a JARVIS. `roles != engines != runtime processes`.
- Existen código `CerebroGatewayV0`, `ActionGatewayV1`, `DurableJobRuntimeV1`, `GovernedExecutionHandoffRouterV1` y `AdaptiveHierarchicalAgentWorkPumpV3`. Demuestran **capacidad de enrutamiento bajo contratos PREPROD**, no un backbone universal vivo.
- Owner JWT de GitHub Actions `EXPIRED_OR_NEAR_EXPIRY`. NEGATIVO anónimo real HTTP 401 desde Supabase; OWNER_ONLY dentro del Gateway, E2E propietario y equipo físico siguen **PENDIENTES**.

## 2. Malla CUT49: envoltorio, no sustitución
Nuevo módulo `cerebro/console/jarvis-command-network-v0.mjs`.
- `inspectJarvisCommandNetworkV0()`: inspección determinista y **solo lectura** de IDs, estados y rutas. No declara conexión ni permiso por el mero hecho de aparecer en el registro.
- `bindJarvisCommandNetworkV0()`: añade únicamente los comandos `jarvis.network.inspect` y `jarvis.network.dispatch` al **Gateway V0 existente**, que delega en **ACTGW-001 existente**. No hay segundo proceso, runtime, cola, servidor o modelo nuevo.
- **CERO destinos ejecutables por defecto**. La lista `verified_targets` debe proceder de configuración de servidor confiable, con ID canónico, `company_id`, entorno PREPROD, capability exacta, evidencia, riesgo, coste 0 y permiso `EXECUTE_PREPROD`. No se genera desde texto IA.
- El despachador exige un `verifyOwner` **independiente y confiable del servidor**. El payload de cliente no puede autoconcederse `authorized:true`.
- Ejecuta solo capacidad previamente registrada en Action Gateway, con clave idempotente, contexto multicompañía, auditoría, límites de coste y gates `HUMAN_REQUIRED`. Un intento de destino inexistente o no conectado es `TARGET_NOT_CONNECTED` o `TARGET_UNKNOWN`; **no** `ACTION_EXECUTED`.
- Los perfiles AGENT/ROLE quedan bloqueados hasta resolver su cadena de supervisión `reports_to`, aportar evidencia de runtime operativo y disponer de adaptador firmado/verificable. `PLAN_ONLY` no es un destinatario.
- **Trading** no enrutable; **PROD, escrituras PROD, costes adicionales y acciones de alto riesgo** no autorizados.

## 3. Evidencia que se puede y que no se puede afirmar
**Comprobable en pruebas:** inspección de catálogo 179/11, cinco contratos Console, nueve referencias, un adaptador determinista **simulado en el proceso de test** con comprobación de propietario inyectada, llamada ACTGW, deduplicación y bloqueos de coste/risgo/cruce de empresa/destino no verificado.
**NO comprobable como vivo:** JARVIS ejecutando órdenes contra 179 motores, 11 agentes reales, origen de autorización humana real, identidad en PROD, supervisor físico, entrega de trabajos externos, dispositivos o reportes operativos; todos requieren pruebas individuales.

### Puerta de integración física de una lógica real: ROUTE-001
El test `CUT49 speaks through ACTGW to real existing ROUTE-001 deterministic budget function in PREPROD harness` conecta `CerebroGatewayV0.execute('jarvis.network.dispatch')` → `ACTGW-001.execute()` → **`budgetDecision` REAL** de `cerebro/router/execution-model-router.mjs`. No usa un controlador simulado para el cálculo: el resultado de `ROUTE-001` es `GREEN_ZERO_ADDITIONAL_COST`, `prod_authorized=false`, `execution_authorized=false` y `trading_access=false`.
La identidad propietaria es una **fixture explícita de test**, NO una validación E2E con el propietario. El callback se pasa desde bootstrap confiable; no existe un enlace runtime desplegado. Este ensayo demuestra el recorrido funcional de un motor real, NO autoriza habilitar los restantes 178 ni los 11 perfiles.

## 4. Puertas antes de ampliar la ejecución
1. Resolver la prueba de propietario mediante sesión de App ya existente sin copiar tokens a chat; JWT de CI no se considera válido.
2. Inventariar cada `engine_id` con endpoint/handler existente, contrato, evidencia física, permisos, dependencias, colas, salud, reintentos, coste, PREPROD, auditoría, rollback y responsable.
3. Activar un primer destino real **no sensible y PREPROD** mediante `verified_targets`, con prueba end-to-end; conservar `ACTGW-001` y `JOB-001`.
4. Verificar supervisión de roles/agentes, resolución de `reports_to` y aislamiento multiempresa.
5. Publicación gradual solo después de pruebas, tribunal, backup, rollback real y límites financieros. Nunca saltar gates para aparentar conectividad.

**Rollback CUT49:** cerrar PR/descartar rama. Ningún cambio desplegado, ni modificación del runtime compartido.
