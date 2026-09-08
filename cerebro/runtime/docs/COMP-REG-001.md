# COMP-REG-001 · Company Registry V0

## Estado objetivo de esta versión
`CONFIRMED_OPERATIONAL` únicamente en PREPROD/shared runtime después de CI verde y merge. No implica servicio desplegado ni autonomía PROD.

## Arquitectura
- runtime compartido Python estándar;
- persistencia V0: archivo JSON atómico fuera de Supabase;
- coste adicional objetivo: 0 €;
- sin IA;
- sin servidor dedicado;
- sin credenciales ni secretos;
- `company_id` es la clave canónica multiempresa.

## Contrato
`cerebro/runtime/contracts/company-registry-v0.json`

El registro conserva identidad, nombres, owner lógico, marcas, dominios, geografías, referencias lógicas de acceso y estado de ciclo de vida. Los secretos están prohibidos por contrato y por validación runtime.

## Idempotencia
- mismo `company_id` + mismo registro: `NO_CHANGE` lógico; no crea segundo evento;
- mismo `company_id` + datos distintos: `POLICY_CONFLICT`;
- intento de introducir campos de secreto/token/password/API key/credential/private key: `SECURITY_INCIDENT` y cero escritura.

## Ciclo de vida V0
`REGISTERED → ONBOARDING → ACTIVE`

Rutas adicionales controladas:
- `REGISTERED → ARCHIVED`
- `ONBOARDING → SUSPENDED|ARCHIVED`
- `ACTIVE → SUSPENDED|ARCHIVED`
- `SUSPENDED → ACTIVE|ARCHIVED`

Cualquier transición no declarada devuelve `POLICY_CONFLICT`.

## Backup
`CompanyRegistry.snapshot(path)` genera una copia atómica y prueba SHA-256. El snapshot no incorpora secretos porque el Registry no los admite.

## Rollback de datos
`CompanyRegistry.restore(path, expected_sha256)` valida checksum, schema y environment antes de reemplazar el archivo activo de forma atómica.

## Rollback de versión
FACT-001 V0.4 puede mover Engine Registry de `0.2.0` al scaffold `0.1.0` sin borrar la versión nueva:

`python cerebro/factory/scripts/version_engine.py rollback --engine-id COMP-REG-001 --to-version 0.1.0 --plan`

## Rebuild
Git + manifest versionado + `cerebro/runtime/company_registry.py` + contrato JSON. No requiere base de datos ni servicio externo.

## Observabilidad
`health()` devuelve únicamente metadatos no sensibles:
- ok;
- engine/version/environment/schema;
- company_count;
- audit_count;
- storage type;
- external_cost_eur.

Los eventos de auditoría usan secuencia monotónica local y no timestamps para mantener pruebas deterministas.

## Evaluación / Tribunal V0
PASS PREPROD requiere simultáneamente:
1. Factory Registry/manifest validator verde.
2. Factory unit tests verdes.
3. Runtime Company Registry unit tests verdes.
4. App Compatibility verde.
5. Scaffold `generated/COMP-REG-001` inalterado e idempotente.
6. Contrato de secretos en DENY.
7. Snapshot + restore verificados por test.
8. PROD rechazado determinísticamente.
9. Coste adicional 0 €.
10. Post-merge PRE-PROD App Build verde.

PROD: `DENY`. La versión V0 no acepta `environment=PROD`.
