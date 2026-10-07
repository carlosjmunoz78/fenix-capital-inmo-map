# CEREBRO OS · Skill Supply Chain · Dependency Map V0

Estado: HECHO documental / PREPROD GREEN / PROD NO AUTORIZADO
Fecha: 2026-10-07

## Ownership

`cap:skill-supply-chain → FACT-001`.

No se crea un `engine_id` nuevo. La capability es transversal y reutiliza runtime, eventos, observabilidad, evaluación y gobierno existentes.

## Dependencias CEREBRO

`FACT-001 → GOV-001/INT-001 → SEC-001/SEC-002/IAM-001/POL-001 → QA-001/REG-001/EVA-001/JDG-001 → FINOPS-001/FREE-001/ROUTE-001 → OBS-001 → LRN-001/UPD-001/SUP-001`.

Bindings funcionales candidatos no cambian ownership de App, CRM, Supabase, SEO, WordPress, Training ni Trading.

## Dependencias externas acotadas

- GitHub: procedencia, exact commit, CI y artifacts.
- Fuentes de discovery: solo descubrimiento/referencia; nunca autoridad de confianza por sí solas.
- `google-gemini-api-free`: usada únicamente en los LAB sintéticos cerrados, con hard quota y `paid_fallback=false`; no es dependencia del PREPROD runtime ejecutado en Step 4.
- PREPROD Step 4: runtime CEREBRO local/ephemeral y ledgers existentes; coste adicional medido 0 €.

## Evidencia congelada

- Behavioral Supabase/Postgres: run `37642814017`, head `1bbfc2250a8f27e8e767fa03ab11a4ddb7a833a7`, artifact `11492473830`.
- Behavioral agent-browser: run `37644374137`, head `135fc29a9b41d7257381c08efea49015db1e71d9`, artifact `11494440533`.
- PREPROD runtime OLD vs NEW: run `37647914902`, head `86369e0cd0d54c9c205bd39f309804a62b2c59d3`, artifact `11494354501`, digest `sha256:9dac9feec60dee265d3af9b2413f48394eaf54b7f4109f4ba96051f374770c10`.

## PREPROD probado

La integración ejecutó `SharedRuntime` real en `PREPROD`, 18 operaciones controladas sobre dos bindings y seis fixtures sintéticos no cliente. Se ejercitaron baseline, wrapper y rollback de binding físico local; el rebuild vuelve a `DISABLED`. Judge: `GREEN_FOR_PREPROD_TRIBUNAL`. Tribunal: `GREEN_FOR_HIGH_RISK_PROMOTION_REVIEW`.

No se ejecutó código externo de las skills ni se realizaron side effects contra Supabase/Browser externos: las skills siguen tratándose como guidance no confiable detrás de wrappers CEREBRO.

## Fronteras de seguridad

- Datos PROD: NO.
- Datos cliente: NO.
- Código externo de skills ejecutado: NO.
- Escritura PROD: NO.
- Trading: NO.
- Paid fallback: NO.
- Merge/PROD/autopromotion: NO.

## Próxima dependencia/gate

`HUMAN_REQUIRED=HIGH_RISK` antes de cualquier merge/promoción que pueda afectar PROD. PREPROD GREEN no equivale a autorización PROD.
