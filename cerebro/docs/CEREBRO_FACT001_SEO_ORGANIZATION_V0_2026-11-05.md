# FACT-001 · SEO organizational overlay V0 · 2026-11-05

**Estado:** Definido, generado físicamente en GitHub Actions tras las pruebas. NO desplegado, NO IAM, NO publicación.

## Finalidad

La fábrica de motores conserva intacto su generador canónico de 177 motores y 18 ficheros por motor. Se añade una extensión determinista para crear los **contratos organizativos lógicos** de las 8 familias profesionales y 32 departamentos SEO definidos en `cerebro/seo-enterprise/v2/organization.manifest.json`. Ni crea agentes físicos ni servidores ni ejecuta labores comerciales.

## Invocación

```sh
node cerebro/factory/seo-org-cli-v0.mjs validate
node cerebro/factory/seo-org-cli-v0.mjs generate --company-id fenix --out /tmp/seo-org-contracts
```

Se generan 74 JSON: 8 fichas de familias con plantillas de director y supervisor, 64 fichas de departamento (manifest + contrato), 1 catálogo de roles de supervisión transversal y 1 índice SHA-256.

Cada departamento incorpora plantillas lógicas de jefe, agente, subagente y QA, permisos DENY, contrato de mérito universal, premios sujetos a IAM y autorización del propietario, capacitación, tribunal, observabilidad, coste, backup, rollback, OLD vs NEW y pruebas STAGING obligatorias. Cada familia incorpora director y supervisor declarativos; el catálogo global incorpora tribunal, juez, guardian y metaevaluación. **Los puestos NO son identidades verificadas ni trabajadores activos.**

Cada plantilla contiene `company_id`, `engine_id`, `environment:SCAFFOLD`, `version`; las 8 familias y 32 departamentos conservan sus nombres reales. En modo multiempresa, cambiar `--company-id` produce contratos separados, sin acceso a otras empresas. No hay proyectos Supabase ni aplicaciones adicionales.

El generador es no destructivo: reejecución idéntica no cambia archivos; una colisión con un archivo diferente falla, sin modificarlo; rutas por symlink rechazadas. El índice aporta huellas de los contratos. No se toca WordPress, CRM, App, Trading o PROD.

## Gate de LISTO

Aún pendientes, sin inflar estados: identidades IAM de cada actor, director y supervisor asignados, misiones físicas reales, métricas por competencia, entrenamiento, QA, tribunal, GSC/GA4 y herramientas necesarias, pruebas de recuperación y rollback de WordPress, comparación OLD vs NEW y aprobación de promoción. La certificación sigue en **0/32**; únicamente **15 departamentos PARCIAL y 17 DEFINIDO** con evidencias anteriores.

Este overlay no amplía permisos de FACT-001 y no sustituye `factory.mjs`. Es un punto de extensión aislado y probado que permite continuar hacia el runtime compartido.
