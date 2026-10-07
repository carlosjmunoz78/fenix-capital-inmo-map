# CEREBRO OS · Skill Supply Chain · Dependency Map V0

Estado: HECHO documental / PROD READ-ONLY CANARY GREEN / PROD WRITES DISABLED
Fecha: 2026-10-07

## Ownership

`cap:skill-supply-chain → FACT-001`.

No se crea un `engine_id` nuevo. La capability reutiliza runtime, eventos, observabilidad, evaluación y gobierno existentes.

## Dependencias CEREBRO

`FACT-001 → GOV-001/INT-001 → SEC-001/SEC-002/IAM-001/POL-001 → QA-001/REG-001/EVA-001/JDG-001 → FINOPS-001/FREE-001/ROUTE-001 → OBS-001 → LRN-001/UPD-001/SUP-001`.

Bindings funcionales candidatos no cambian ownership de App, CRM, Supabase, SEO, WordPress, Training ni Trading.

## Dependencias externas acotadas

- GitHub: procedencia, exact commit, CI y artifacts.
- Fuentes de discovery: solo descubrimiento/referencia; nunca autoridad de confianza por sí solas.
- Gemini free: solo evaluación sintética acotada; `paid_fallback=false`.
- PREPROD: `SharedRuntime` y ledgers CEREBRO existentes; coste 0 €.
- PROD read-only canary: `https://app.fenixcapital.es/` y `fenix-app-gateway/health` exclusivamente mediante GET.
- Se reutiliza `PROD_SUPABASE_PUBLISHABLE_KEY` ya existente solo como clave pública del health endpoint; no se crea credencial nueva.

## Evidencia congelada

- Behavioral Supabase/Postgres: run `37642814017`, artifact `11492473830`.
- Behavioral agent-browser: run `37644374137`, artifact `11494440533`.
- PREPROD runtime: run `37647914902`, head `86369e0cd0d54c9c205bd39f309804a62b2c59d3`, artifact `11494354501`.
- Dark launch main: `a9b51ee98cdfbf674a02e9b68b15bbf0e455d19b`.
- PROD read-only canary: run `37662400743`, head `c84efac4b014aab873d4f484207cbce564792030`, artifact `11500917864`, digest `sha256:90f4f554e7e18fcb2ad22094956d5f5dfa3e0c8cad088c6efaf4cde9f2f0eecf`.

## PROD read-only probado

El canary realizó 2 lecturas reales sobre superficies PROD vivas: raíz pública de App y health del Gateway. Ambas respondieron 200; Gateway reportó `env=PROD` y `service=fenix-app-gateway`. Los wrappers se ejercitaron localmente bajo policy CEREBRO y conservaron `prod_authorized=false`.

## Fronteras de seguridad

- Datos cliente: NO.
- Código externo de skills ejecutado: NO.
- Escritura PROD: NO.
- Trading: NO.
- Paid fallback: NO.
- Coste adicional: 0 €.
- App deploy por este canary: NO.

## Próximo gate

No existe bloqueo para operación read-only/advisory. Cualquier ampliación de permisos, write PROD, uso de datos cliente, nuevas credenciales o side effects vuelve a `HUMAN_REQUIRED=HIGH_RISK` o al motivo de excepción aplicable.
