# CEREBRO OS · FACT-001 · PR #66 · Ejecución real LAB y aceptación

## Objetivo y alcance
La primera **capacidad ejecutora real** de FACT-001 es `fact.registry.attest`: valida el registro canónico de 179 motores definido en GitHub, calcula la huella SHA-256 ordenada y guarda un justificante en PREPROD mediante el mismo Gateway de Operativa. **NO** arranca ninguno de los motores del registro. No reactivar ni consultar `staging.fenixcapital.es`.

## E2E verificado (físico y durable)
- **14/11/2026 09:34:33.460125 UTC**: desde Operativa Preview autenticada en Opera, Gateway owner-only `submit_command` → adaptador único de LAB → Edge `cerebro-operativa-command-executor-lab-v0` → INSERT append-only.
- Recibo real: `9bac7b1c-3ccc-4634-8866-e4a82eb6716f`; `registry_count=179`, `base_count=177`, prefijo SHA-256 `26c0b01c840503ed`.
- Texto visible en la UI: `Certificación FACT-001 ejecutada y persistida en LAB. No se han ejecutado otros motores.`
- Repetición con `idempotency_key='lab-fact-attest-owner-accepted-20261114'`: Operativa mostró `Certificación anterior recuperada: idempotencia demostrada.`; SQL volvió a leer **una única fila**, mismo UUID y misma fecha de creación.
- El disparador temporal de aceptación `op3_fact_attest_once` fue RETIRADO del código, commit `4a0193cf8715f528fb3953ed8f1cc46eae88762c`. Las acciones futuras solo desde botones normales, con sesión autorizada.
- PROD y staging intactos; el motor de Trading no está enrutado. No hay crons ni colas nuevas. Sin modelos IA de pago ni nuevas suscripciones.

## Arquitectura y contrato
- API existente `/api/cerebro-universal-preview` permanece con comprobación Vercel Preview + owner JWT.
- Dos operaciones documentadas: `submit_command` con `capability_id=fact.registry.attest` y `get_fact_attestation_latest`.
- Gateway **prepara** digest y devuelve `FACT_ATTESTATION_PREPARED, executed=false`; solo tras INSERT persistido y comprobación de recibo responde `FACT_ATTESTATION_EXECUTED, executed=true`. La ejecución real consiste en la certificación y el recibo, **no** en accionar las 179 definiciones.
- Edge usa **un único runtime compartido LAB** con allowlist de una acción; rechaza otras compañías, otros motores, PROD, URL de destino, costes positivos, firmas, riesgo alto y payload arbitrario.
- El Edge consulta exclusivamente el contexto de identidad existente (GET) y Supabase PREPROD para INSERT/SELECT; no hace solicitudes a staging ni modifica el App/CRM.
- Tabla `public.cerebro_universal_fact_attestation_lab_v0`: RLS ON; `anon` sin SELECT, `authenticated` sin INSERT; `service_role` SELECT/INSERT = true, UPDATE/DELETE = false, **comprobado con SQL posterior**. La restauración no puede borrar justificantes sin operación administrativa separada.

## Probar / validar
1. `node --test cerebro/universal/v0/fact-execution.test.mjs`: simulaciones de entorno, motor, firma, alto riesgo, límite de coste, destino, sesion, digest y cuerpo inválidos.
2. `node --test cerebro/universal/v0/execution-lab/anon-smoke.mjs`: GET y POST sin sesión deben devolver HTTP 401. No se envía ninguna credencial real.
3. Workflow `CEREBRO Universal Gateway V0 LAB contract CI` debe superar TypeScript, Vite y pruebas negativas. Registro de aceptación de la PR: comparar siempre SHA y estado del último commit.
4. Preview owner: comprobar lectura del último recibo incluso tras recarga. Guardar nueva evidencia solo con acción del propietario.
5. Verificar que `staging` continúa 15/15 JOB-001 deshabilitados, 14/14 cron parados, 4/4 SQL en bloqueo, 94 Edge con snapshots. No confundir con aislamiento de todos los externos.

## Reversión, límites y continuidad
- Sin promoción a PROD. Conservar el gateway antiguo y revertir commits aislados de PR #66 si aparecen problemas. La tabla y los recibos se retienen como evidencia; detener el Edge LAB no afecta producción.
- **NO VERIFICADO**: 179 motores autónomos, Hostinger/schedulers externos, JARVIS/Neuronal/Navegador conectados físicamente, métricas de coste por proveedor.
- **Siguiente motor:** integrar capacidades reales adicionales individualmente a este mismo Gateway/ejecutor compartido con su propio manifest, políticas, tests, auditoría, control humano, rollback y gates. No crear un servidor por motor.
