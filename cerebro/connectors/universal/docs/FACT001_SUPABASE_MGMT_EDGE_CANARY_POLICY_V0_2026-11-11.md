# FACT-001 · Supabase Management · LAB Edge Canary Policy (2026-11-11)

**Estado:** `HECHO_EN_CODIGO / TEST_LOCAL_GREEN / NO_DESPLEGADO`. Conserva broker y sistemas actuales.

## Baseline físico comprobado
- Proyecto Supabase `cluhljgonannaafpmblx`: 110 Edge Functions en inventario de solo lectura. `cerebro-console-gateway-v0` ACTIVE v33 y `cerebro-fact001-headless-provider-lab` ACTIVE v33.
- La Edge Function sintética exacta `cerebro-fact001-sb-mgmt-canary-lab` NO existía al iniciar la implementación.
- `cerebro_supabase_management_pat_v1` figura en Vault por metadatos; no se ha solicitado ni expuesto su valor.
- El Gateway principal, App, CRM, SEO, Trading y ramas `main` permanecen fuera del cambio.

## Implementación aislada
- `services/provider-headless-lab/supabase-mgmt-edge-policy.mjs`: política pura sin HTTP, SQL, credenciales ni funciones ejecutoras; no está importada en `index.ts` desplegado.
- `services/provider-headless-lab/tests/supabase-mgmt-edge-policy.test.mjs`: 13 tests Node locales, 13 PASS, 0 FAIL.
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

**Gates:** `CODE_LOCAL_GREEN`; `CI=POR_VERIFICAR`; `RUNTIME_DEPLOY=NO`; `MUTATIONS=OFF`; `PROD=INTACTO`; `SUPABASE_UNIVERSAL=PARCIAL`; `ADD_COST=0`.

**No repetir:** borrado de la anterior Edge sintética verificado en Actions #42816960750, ni las auditorías de las 8 tablas SEO ya registradas. No tocar RLS ni permisos existentes desde este módulo.

**Rollback de este cambio documental/de código:** revertir solo los tres archivos nuevos en esta rama DRAFT. Ningún recurso Supabase requiere rollback porque no se ha desplegado ni ejecutado una escritura.