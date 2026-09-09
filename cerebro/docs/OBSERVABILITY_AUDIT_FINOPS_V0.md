# OBSERV-001 + AUD-001 + FINOPS-001 · Persistent Reference V0

Estado: **IMPLEMENTADO EN PARALELO / PREPROD / NO CUTOVER**.

## Alcance

Se añade una referencia local/self-hosted y de coste adicional objetivo 0 € para persistir observabilidad, auditoría y costes sin sustituir las superficies existentes de `SharedRuntime`, `CerebroGatewayV0` o `PolicyEngine`.

- `OBSERV-001`: registros durables con `correlation_id`, contexto multiempresa (`company_id`, `engine_id`, `environment`, `version`) y consultas por contexto/correlación.
- `AUD-001`: ledger lógico append-only, registros canónicos con actor/acción/objetivo/before/after/reason/result y cadena SHA-256 para detección de corrupción/inconsistencia. No se presenta como protección criptográfica autenticada frente a manipulación maliciosa.
- `FINOPS-001`: `cost_events` durables en micro-euros enteros y agregación por empresa, motor y proveedor.

## Persistencia y límites

Reutiliza `AtomicV8Journal` de `persistent-runtime.mjs`: snapshot V8 local, temp write, fsync, rename atómico y fsync de directorio. Es una referencia **single-writer**. No usa Supabase, no escribe en App/Web, no toca Trading, no habilita PROD y mantiene `autonomous_prod=false`.

## Preservación

No hay migración de estado ni wiring con el runtime existente. La secuencia obligatoria antes de cualquier cutover sigue siendo:

`CONSERVAR → ENTENDER → ENVOLVER → PROBAR → MEJORAR → MIGRAR`.

El siguiente gate es comparar OLD vs NEW con datos controlados, validar backup/rebuild/rollback y sólo después decidir integración gradual.
