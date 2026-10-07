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
- Candidato GitHub: upstream fijado `openclaw/openclaw`, manifest `skills/github/SKILL.md`; se consume únicamente como guidance normalizada por `skillwrap:cerebro-github-v0.1.0`. Código externo del upstream: NO ejecutado.
- PREPROD GitHub: workflow aislado paralelo sobre `SharedRuntime`; binding local físico `DISABLED → BASELINE → GITHUB_WRAPPER → BASELINE → DISABLED`; sin tocar el PREPROD genérico existente.
- PROD read-only canary existente: `https://app.fenixcapital.es/` y `fenix-app-gateway/health` exclusivamente mediante GET.
- Se reutiliza `PROD_SUPABASE_PUBLISHABLE_KEY` ya existente solo como clave pública del health endpoint; no se crea credencial nueva.

## Evidencia congelada

- Behavioral Supabase/Postgres: run `37642814017`, artifact `11492473830`.
- Behavioral agent-browser: run `37644374137`, artifact `11494440533`.
- Behavioral GitHub: run `37666101006`, head `08d46dd25ee40376bf4f548f4f2f6083c53e93f0`, artifact `11502662046`, digest `sha256:5d2054116652c980866fe0c11a89d239151299d7e4a1bcdc1b3e19071359540e`.
- PREPROD runtime genérico: run `37647914902`, head `86369e0cd0d54c9c205bd39f309804a62b2c59d3`, artifact `11494354501`.
- PREPROD GitHub: run `37668271189`, head `feff48e1764474db0aa118af152b23d816edd00d`, artifact `11503718236`, digest `sha256:d6e0fddf4932db4939b78802ee24bd104f1f6775ebe9877657849efdc284130d`.
- Dark launch main: `a9b51ee98cdfbf674a02e9b68b15bbf0e455d19b`.
- PROD read-only canary existente: run `37662400743`, head `c84efac4b014aab873d4f484207cbce564792030`, artifact `11500917864`, digest `sha256:90f4f554e7e18fcb2ad22094956d5f5dfa3e0c8cad088c6efaf4cde9f2f0eecf`.

## PREPROD GitHub probado

El candidato GitHub ejecutó 9 operaciones locales sobre runtime PREPROD: 3 baseline, 3 candidate wrapper y 3 rollback baseline. Observabilidad/audit/FinOps registraron 9 eventos cada uno, coste 0 €, rollback físico GREEN y rebuild final `DISABLED`. Judge `GREEN_FOR_PREPROD_TRIBUNAL`; Tribunal `GREEN_FOR_HIGH_RISK_PROD_READONLY_CANARY_REVIEW`.

## PROD read-only probado

El canary previo realizó 2 lecturas reales sobre superficies PROD vivas: raíz pública de App y health del Gateway. Ambas respondieron 200; Gateway reportó `env=PROD` y `service=fenix-app-gateway`. Los wrappers Supabase/Postgres y agent-browser se ejercitaron localmente bajo policy CEREBRO y conservaron `prod_authorized=false`.

Ese canary existente no incluye ni autoriza al candidato GitHub.

## Fronteras de seguridad

- Datos cliente: NO.
- Código externo de skills ejecutado: NO.
- Escritura PROD: NO.
- Trading: NO.
- Paid fallback: NO.
- Coste adicional: 0 €.
- App deploy por PREPROD GitHub: NO.
- GitHub PROD read-only canary: NO autorizado todavía.

## Próximo gate

Para GitHub: `HUMAN_REQUIRED=HIGH_RISK` antes de `PROD_READONLY_CANARY`. Para la capability ya operativa, no existe bloqueo para mantener la operación read-only/advisory previamente autorizada. Cualquier ampliación de permisos, write PROD, uso de datos cliente, nuevas credenciales o side effects vuelve a `HUMAN_REQUIRED=HIGH_RISK` o al motivo de excepción aplicable.
