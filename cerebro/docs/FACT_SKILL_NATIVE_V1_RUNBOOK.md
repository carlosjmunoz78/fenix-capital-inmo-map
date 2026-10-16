# FACT-SKILL-NATIVE v1 · Runbook PREPROD

## Estado de este cambio

`PREPROD_CANDIDATE` hasta que el CI objetivo y el E2E sintético queden GREEN. No concede autoridad PROD.

## Ownership y dependencias

- capability: `FACT-SKILL-NATIVE`
- owner: `FACT-001`
- support: `LRN-001`, `QA-001`, `EVA-001`, `ROUTE-001`, `OBSERV-001`, `FINOPS-001`
- runtime existente reutilizado: `skill-capability-autonomy-closure-v1.mjs`
- supply/adoption existentes preservados: `skill-full-adoption-v1.json` y scripts `cerebro/skills/skill-*`
- no se crea motor nuevo
- coste adicional objetivo: `0 €`

## Flujo

`discovery/import metadata → dedupe → license/security → versioned registration → impact analysis → contracts/policy/permissions → OLD vs NEW → shadow/E2E → eval → Tribunal → LRN hooks → governed PREPROD registration`.

La capability no ejecuta código externo de la skill. Envuelve la evidencia y los wrappers internos ya gobernados.

## Route

`capability://FACT-SKILL-NATIVE/v1/admit`

El router exige:

- `gateway_authorized=true`
- `environment=PREPROD`
- `engine_id=FACT-001`
- `context.company_id === payload.company_id`

## Gates FULL

Deben quedar todos verdes: registry/versioning; contexto multiempresa; manifest/contracts/events; permisos/policy; implementación/wrapper; routing; tests/E2E; evaluation/Tribunal; OLD vs NEW; observabilidad/idempotencia/coste; fallbacks; backup/rollback/rebuild; runbook/changelog/dependencies; evidencia PREPROD GREEN.

## Backup

Antes de modificar una versión registrada, conservar el JSON anterior del registry como snapshot versionado. No sobrescribir evidencia histórica.

## Rollback

1. deshabilitar el binding de la versión candidata;
2. restaurar el registro/version anterior;
3. mantener el código externo sin ejecutar;
4. reejecutar el test objetivo;
5. registrar `skill.native.rollback` en la cadena de auditoría del caller cuando se conecte al runtime durable.

La rama completa también puede revertirse sin tocar PROD porque esta v1 es PREPROD-only y no modifica writers existentes.

## Rebuild

Reconstruir desde:

1. `cerebro/registry/capability-fact-skill-native.v1.json`;
2. `cerebro/runtime/fact-skill-native-v1.mjs`;
3. `cerebro/runtime/fact-skill-native-router-v1.mjs`;
4. wrappers/evidencias existentes referenciados por el registry;
5. `node --test cerebro/tests/fact-skill-native-v1.test.mjs`.

El resultado debe conservar ids de registro e idempotencia para el mismo input.

## Fallback

Si cualquier gate cae a rojo: mantener la versión/capability anterior o usar la capacidad existente ya admitida; no promover la candidata.

## Observabilidad / FinOps

Cada receipt incluye `registration_id`, decisión, `idempotency_key`, gates fallidos, eventos first-party, estado de learning hooks y coste adicional medido. Paid fallback permanece OFF.

## Changelog

### 1.0.0 · 2026-10-16

- añade wrapper first-party nativo de FACT-001 para el ciclo completo de skills;
- añade routing PREPROD aislado por empresa;
- reutiliza el plano de autonomía existente en vez de reescribirlo;
- añade E2E sintético, idempotencia, fail-closed de permisos y HIGH_RISK;
- PROD, auto-merge, trading, customer data y external skill code execution permanecen denegados.
