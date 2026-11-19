# OPERATIVA V3 · Acceso seguro a mandos LAB desde producción
Date: 2026-11-19 · CANDIDATO. Physical production baseline `914144a5d83d5ec79d1b8c77367a60f7c15d756f`; deployment `dpl_EXDsPFMDd5J7mD1WqpVasUsV6mvf`.

## Scope and safeguards
- Add explicit external LAB-access link in Motores/Trabajos for the Fénix operator, independently protected by LAB owner authentication. No privileged APIs, execution credentials, secrets, or bridge introduced to PROD.
- Restore allowlisted deep-link `op3_panel` handling from the existing PR #81 without bringing PR #81 or its SQL/migrations to PROD.
- Controls remain **LAB ONLY**: QA-001 and CERT-001 diagnostic scheduled jobs, CONSOLE-001 public read-only. FACT/UMS owner HOLD untouched; App/CRM unchanged.
- New subscription cost: 0 €. Provider marginal usage not measured.

## Test and rollback
1. Check commit diff and run `node --test cerebro/universal/v0/operativa-lab-access-prod.test.mjs`.
2. Build isolated Vercel preview. Validate direct Motores/Trabajos links, owner LAB controls, negative unauthenticated access, and static asset.
3. Promote only if unchanged production source mapping and backup READY.
4. Verify PROD `/PROD_SOURCE_SHA.txt` corresponds to deployment exact SHA. In the event of regression revert to `dpl_EXDsPFMDd5J7mD1WqpVasUsV6mvf`.

No certification of autonomous PROD engine execution is implied.
