# CEREBRO OS · Zero-Cost Runtime Wave 1

Estado inicial: PLANIFICADO / POR AUDITAR.
Fecha: 2026-09-10.
Base: main `95106d8e792257f809033486b7025d81665ea83b`.

## Objetivo
Cerrar cinco puntos de infraestructura CEREBRO con coste adicional objetivo 0 €, sin tocar App/web/Trading ni introducir dependencia obligatoria de un segundo proyecto Supabase PREPROD.

## Reglas no negociables
- CONSERVAR → ENTENDER → ENVOLVER → PROBAR → MEJORAR → MIGRAR.
- No crear IDs nuevos si ya existen `LOCAL-001`, `FREE-001`, `DBOFF-001`, `STOROFF-001`, `AIBUD-001` y `ROUTE-001` en el mapa maestro.
- `company_id`, `engine_id`, `environment`, `version` en contratos aplicables.
- Supabase queda como core transaccional; logs pesados, jobs largos, research/training y estado auxiliar deben poder salir fuera.
- PREPROD de Supabase permanece OFF por defecto; primero CI/local/ephemeral/mocks.
- Sin nuevas suscripciones; cualquier coste debe activar MONEY_LIMIT y quedar justificado.
- `prod_writes=false`, `autonomous_prod=false` para esta wave.
- Trading LAB aislado.

## Cinco puntos a dejar verdes

### 1. LOCAL-001 · Local Runtime Capability
Implementar inventario y selector determinista de capacidades locales/self-hosted ya disponibles. Debe declarar capacidades, límites, health, coste esperado 0 €, entorno y compañía. No ejecutar shell arbitrario ni leer secretos.

Gate verde: tests de selección determinista, tenant isolation, fail-closed y health degraded/unavailable.

### 2. FREE-001 · Free-First Broker
Implementar política de resolución FREE_FIRST_BEFORE_PAY. Orden mínimo: lógica determinista → local/open-source → herramienta ya contratada → free tier → self-hosted → externo barato → pago justificado.

Gate verde: con alternativa gratuita válida nunca selecciona proveedor de pago; sin alternativa válida devuelve decisión explícita con motivo y MONEY_LIMIT cuando corresponda.

### 3. DBOFF-001 + STOROFF-001 · Offload Contracts
Definir adapters/contratos para estado auxiliar fuera de Supabase, inicialmente locales y sin dependencias nuevas. Deben permitir backend local reproducible y mantener a Supabase fuera de logs/jobs pesados.

Gate verde: round-trip, restart/rebuild, aislamiento company_id, corrupción fail-closed y rollback del backend local.

### 4. AIBUD-001 + ROUTE-001 · Budget + Model Router V0
Implementar router determinista que no trate un motor como una IA. Debe poder elegir `deterministic`, `local_model`, `existing_provider`, `free_tier`, `paid_provider` o `HUMAN_REQUIRED`, según capacidades, política, coste, confianza y riesgo. La IA de pago no puede ser requisito inicial.

Gate verde: routing reproducible, 0 € por defecto, no paid route cuando exista opción equivalente gratuita, LOW_CONFIDENCE/HIGH_RISK/MONEY_LIMIT fail-closed y sin acceso a Trading.

### 5. Integración, evaluación y evidencia
Integrar los cuatro bloques anteriores en un harness V0 aislado de App/web/PROD. Añadir tests, evaluación, observabilidad, coste, backup, rollback, rebuild, runbook, changelog y estado de autonomía.

Gate verde: suite CEREBRO completa verde, Codex review sin P1/P2, evidencia exact-head, y ningún cambio que active escrituras PROD o requiera reactivar el segundo Supabase PREPROD.

## Promoción
Esta wave puede quedar mergeable en código de referencia, pero no autónoma en PROD. Antes de cualquier wiring real se exige inventario de consumidores, OLD vs NEW, rollback probado y promoción gradual.
