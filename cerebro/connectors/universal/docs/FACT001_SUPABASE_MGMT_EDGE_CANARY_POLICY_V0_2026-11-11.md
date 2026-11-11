# FACT-001 · Supabase Management · LAB Edge Canary Policy (2026-11-11)

**Estado:** `HECHO_EN_CODIGO / TEST_LOCAL_GREEN / CI_GREEN / SQLITE_OFFLINE_GREEN / NO_DESPLEGADO`. Conserva broker y sistemas actuales.

## Baseline físico comprobado
- Proyecto Supabase `cluhljgonannaafpmblx`: 110 Edge Functions en inventario de solo lectura. `cerebro-console-gateway-v0` ACTIVE v33 y `cerebro-fact001-headless-provider-lab` ACTIVE v33.
- La Edge Function sintética exacta `cerebro-fact001-sb-mgmt-canary-lab` NO existía al iniciar la implementación.
- `cerebro_supabase_management_pat_v1` figura en Vault por metadatos; no se ha solicitado ni expuesto su valor.
- El Gateway principal, App, CRM, SEO, Trading y ramas `main` permanecen fuera del cambio.

## Implementación aislada
- `services/provider-headless-lab/supabase-mgmt-edge-policy.mjs`: política pura sin HTTP, SQL, credenciales ni funciones ejecutoras; no está importada en `index.ts` desplegado.
- `services/provider-headless-lab/tests/supabase-mgmt-edge-policy.test.mjs`: 13 tests de política Node; ledger añade 16 tests. Total específico Supabase 29 PASS / 0 FAIL, registrados dentro de la CI del broker.
- Contrato fijo: company_id=`fenix-capital`, engine_id=`FACT-001`, environment=`LAB`, version=`1.0.0`, proyecto exacto `cluhljgonannaafpmblx`, recurso exacto `cerebro-fact001-sb-mgmt-canary-lab`.
- Operaciones planificables `edge.read`, `edge.create`, `edge.update`, `edge.delete` **solo** para recurso sintético. Flag por defecto `mutation_enabled=false`. Las salidas son planes con `executed=false`.
- Rechaza proyectos/tenants ajenos, PROD, órdenes con URL/SQL/token/cuerpo arbitrario, identidad falsa, costes positivos, expiración, cambios concurrentes, hashes incorrectos y snapshots/rollback no acreditados.
- Los tests positivos usan objetos de backup simulados: **NO** acreditan restauración física ni permisos de escritura reales.
- `idempotency_key` obligatorio ligado a `request_id`, pero aún falta ledger D1 CAS persistente: no se afirma idempotencia operativa.

## Siguiente bloque físico permitido
1. Congelar antes la imagen/sha exactos del broker v33 y comparar OLD vs NEW. **No sustituirlo**.
2. Reutilizar el runtime compartido existente, OIDC firmado y Vault, sin crear servidor, base o proyecto nuevo.
3. Preparar lectura verificada de metadata para el slug sintético, hash before/after, artifact de rebuild y prueba real de rollback.
4. Añadir idempotencia D1 CAS en la Recovery D1 ya existente y observabilidad; bloqueo fail-closed por error o resultado incierto.
5. Solo tras seguridad + coste + snapshot + rollback, probar en LAB la función sintética con permiso de recurso específico.
6. Dejar el Gateway CEREBRO propietario OFF hasta demostrar sesión real y E2E de una orden; no usar credencial de servicio para suplantar al propietario.

**Gates:** `CODE_LOCAL_GREEN`; `CI=GREEN_259_TESTS_PLUS_SQLITE`; `RUNTIME_DEPLOY=NO`; `MUTATIONS=OFF`; `PROD=INTACTO`; `SUPABASE_UNIVERSAL=PARCIAL`; `ADD_COST=0`.

**No repetir:** borrado de la anterior Edge sintética verificado en Actions #42816960750, ni las auditorías de las 8 tablas SEO ya registradas. No tocar RLS ni permisos existentes desde este módulo.

**Rollback de este cambio documental/de código:** revertir solo los tres archivos nuevos en esta rama DRAFT. Ningún recurso Supabase requiere rollback porque no se ha desplegado ni ejecutado una escritura.

## Cierre incremental validado el 11/11/2026 · Supabase D1 CAS

- Código adicional NO desplegado: `services/provider-headless-lab/supabase-mgmt-edge-d1-ledger.mjs`. Tablas **solo definidas** `fact001_supabase_edge_jobs_v1` y `fact001_supabase_edge_events_v1`, con disparadores de auditoría inmutable. Ninguna de ellas existe todavía en la D1 real (comprobación SQL de solo lectura posterior).
- D1 Recovery existente `cerebro-fact001-recovery-lab-eu` / UUID `1305f791-7c44-47f9-946b-f330a09c88aa`, jurisdicción UE, conectada; **no se crea otra D1**. Sus tablas anteriores no han sido modificadas.
- Política de servicio más estricta: `makeSupabaseEdgeLedger` exige identidad CEREBRO verificada por el backend firmado, no OAuth de ChatGPT ni identidad enviada en la orden. Para aceptar `COMPLETED` se exige readback de recurso exacto, hash posterior idéntico y comprobación reciente de 60 segundos.
- Reserva CAS `PREPARED`→`IN_FLIGHT` (attempts=1)→`COMPLETED`/`RECONCILE`; replay siempre denegado, fallos inciertos sin reintentos automáticos. Estados protegidos por restricciones SQL, eventos con bloqueo de UPDATE/DELETE.
- Pruebas: 29 específicas de política/ledger; también 5 pruebas del registro de proveedores corregidas para distinguir **VERIFIED_LAB_*** de `VERIFIED_FULL`, sin rebajar los estados físicos de Vercel.
- CI física [FACT001 Headless Broker LAB Security CI #43075688862](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/43075688862): **193 headless + 31 issuer + 18 owner-canary + 5 registry + 8 onboarding + 4 scaffold = 259 PASS, 0 FAIL**; ejecución in-memory SQLite `FACT001_SUPABASE_EDGE_D1_SQLITE_PHYSICAL_OFFLINE=PASS`, 0 nuevas D1 y 0 provider writes.
- Código de prueba SQL `services/provider-headless-lab/tests/supabase-mgmt-d1-sqlite-acceptance.py` añadido al mismo workflow preexistente; utiliza exclusivamente SQLite efímero de CI. 
- Postread físico Supabase: **110 Edge Functions**, broker `cerebro-fact001-headless-provider-lab` ACTIVE v33, `cerebro-console-gateway-v0` ACTIVE v33 y función sintética nueva **ausente**.
- Estado de GitHub [PR #44](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/pull/44) DRAFT, sin merge a main. Sin secretos revelados, suscripciones adicionales ni cambios de App/CRM/SEO/Trading/PROD.

### Gate previo a una migración D1 real (NO SATISFECHO)
1. Baseline + snapshot recuperable y comprobación de restore sobre la misma D1 Recovery; prohibido retroceder toda la base compartida por una operación del módulo Supabase.
2. Aislamiento de tablas nuevas y recuperación por tabla, existencia previa negada, ownership, rollback de migración no invasivo y test OLD vs NEW.
3. Adaptador D1 autenticado con permisos mínimos, contrato de idempotencia y confirmación de costes/quotas; no almacenar tokens en filas.
4. Operador Supabase de gestión solo para Edge Function sintética, con artefacto reconstruible, GET antes/después, backups, rollback físico e identidad firmada. Ningún acceso general a DB/Auth/Storage ni a datos App/CRM.
5. E2E real desde CEREBRO Gateway con propietario autenticado cuando exista sesión válida, sin suplantar JWT con token de backend. Solo promover tras el tribunal y comprobación de reversibilidad.

**Decisión:** CANDIDATE_LAB_ACCEPTED_IN_CODE_AND_CI; MIGRATION_NOT_APPLIED; AUTONOMOUS_SUPABASE_FULL=PARTIAL; DEPLOYMENT=OFF.


## Incremento 11/11/2026 · Metadata exacta y borrado seguro
- Módulo read-only candidato `supabase-mgmt-edge-readback.mjs`: GET fijo a Management API `/v1/projects/cluhljgonannaafpmblx/functions/cerebro-fact001-sb-mgmt-canary-lab`, exige identidad CEREBRO firmada y token de Vault backend; 404=ausente, 401/403/429/500 no son ausencia ni éxito. Valida slug, version y digest de bundle. No obtiene código ni sustituye backup físico.
- Contrato oficial: https://supabase.com/docs/reference/api/v1-get-a-function.
- Ledger: clausura `edge.delete` solo con `exists=false` y hash nulo; lectura ausente igualmente válida. `edge.create/update` exigen existencia y SHA tras la operación. La transición SQL verifica además la operación original mediante CAS. Nunca interpreta un token o resultado autodeclarado como prueba de propiedad.
- Cambios solo en PR DRAFT; readback no conectado al broker v33; escritura proveedor OFF; Supabase 110 funciones anteriores intactas.
