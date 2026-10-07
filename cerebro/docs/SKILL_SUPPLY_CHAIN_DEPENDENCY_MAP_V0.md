# CEREBRO OS · Skill Supply Chain · Dependency Map V0

Estado: HECHO documental / PARCIAL operativo
Fecha: 2026-10-07

## Ownership

`cap:skill-supply-chain → FACT-001`.

No se crea un `engine_id` nuevo. La capability es transversal y reutiliza runtime, eventos, observabilidad, evaluación y gobierno existentes.

## Dependencias CEREBRO

`FACT-001 → GOV-001/INT-001 → SEC-001/SEC-002/IAM-001/POL-001 → QA-001/REG-001/EVA-001/JDG-001 → FINOPS-001/FREE-001/ROUTE-001 → OBS-001 → LRN-001/UPD-001/SUP-001`.

Bindings funcionales candidatos no cambian ownership de App, CRM, Supabase, SEO, WordPress, Training ni Trading.

## Dependencias externas acotadas

- GitHub: procedencia, exact commit, licencia, CI y artifacts.
- Fuentes de discovery: solo descubrimiento/referencia; nunca autoridad de confianza por sí solas.
- `google-gemini-api-free`: ruta de inferencia verificada exclusivamente para los LAB sintéticos cerrados aquí, con hard quota y `paid_fallback=false`. No constituye autorización general de uso gratuito ni de PROD.

## Evidencia Behavioral congelada

- Supabase/Postgres: run `37642814017`, head `1bbfc2250a8f27e8e767fa03ab11a4ddb7a833a7`, artifact `11492473830`.
- agent-browser: run `37644374137`, head `135fc29a9b41d7257381c08efea49015db1e71d9`, artifact `11494440533`.

## Fronteras de seguridad

- Datos PROD: NO.
- Datos cliente: NO.
- Código externo de skills ejecutado: NO.
- Escritura PROD: NO.
- Trading: NO.
- Paid fallback: NO.
- Merge/PROD/autopromotion: NO.

## Dependencia pendiente antes de promoción

El siguiente salto es PREPROD real: OLD vs NEW sobre integración controlada, observabilidad, rollback/rebuild y revisión `HIGH_RISK`. Ningún resultado de LAB sustituye este gate.
