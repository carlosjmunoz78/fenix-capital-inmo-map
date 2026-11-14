# FACT-001 · Fábrica canónica de 179 motores · Aceptación física en LAB

**Fecha:** 14 de noviembre de 2026
**Fuente:** `carlosjmunoz78/fenix-capital-inmo-map`, PR #66 DRAFT
**Ejecución:** GitHub Actions [43582352885](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/43582352885), commit `cbe60117a44beef46120a4fd133c038f97fec39b`

## HECHO: generación real en entorno temporal
El workflow del Gateway ejecutó el generador **existente** `cerebro/factory-v1.mjs generate`, alimentado con el registro canónico `cerebro/registry/engine-registry.v1.json`, y verificó el resultado mediante `cerebro/universal/v0/factory-batch-lab-acceptance.mjs`.

La salida real del job indica:
- `status=PHYSICAL_LAB_FACTORY_GENERATION_VALIDATED`
- `engine_definitions=179`; `scaffolds_generated=179`
- `files_per_scaffold=18`; `total_engine_files=3222`
- `base_engines_preserved=177`; extensiones no destructivas `HCI-001` y `MOTION-001`
- Manifiestos JSON parseables, UUID/rutas no inventadas, lista de IDs y orden exactos, huellas SHA-256 por scaffold e integridad de 18 archivos verificadas para cada uno
- Sin llamadas a modelos IA, sin staging, sin despliegue, sin modificaciones de PROD

El propio test crea y elimina el resultado en el **directorio temporal del runner**. Los 3.222 archivos **no se han instalado como motores productivos** ni se han promovido a GitHub main. El generador versionado permite reconstruirlos al repetir la prueba.

## Relación con la ejecución real de Operativa
- Capacidad `FACT-001/fact.registry.attest` ejecutada con éxito por el Gateway Universal en LAB, con registro persistente: `9bac7b1c-3ccc-4634-8866-e4a82eb6716f`.
- El botón de Operativa confirma exclusivamente la atestación y recibo, **no** dispara este generador masivo de CI.
- Por tanto, esta fábrica tiene **código de generación y prueba de batch físicamente verdes**, pero los 179 motores siguen sin certificado de runtime, integración y autonomía.

## Gates antes de un servicio de factory autogenerador
- Exponer generación parametrizada desde el **mismo Gateway** con permisos por empresa y trabajo idempotente, salida durable y observabilidad.
- Definir destinos de artefactos reproducibles y rollback sin eliminar ni sobrescribir infraestructuras existentes.
- Tribunal, backup y coste medido; validación en LAB y pruebas negativas (PROD, Trading, staging suspendido).
- Solo promover capacidades concretas al disponer de evidencia completa; nunca calificar la generación de scaffold como operación empresarial autónoma.

## Condiciones innegociables
Staging `staging.fenixcapital.es` permanece `SUSPENDED_BY_OWNER`. No se han modificado App/CRM/WordPress/DNS PROD ni main ni Trading. Sin nuevas suscripciones; el consumo de minutos del proveedor preexistente no está cuantificado en euros.
