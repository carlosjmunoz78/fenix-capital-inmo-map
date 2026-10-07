# CEREBRO OS · Skill Supply Chain · Dependency Map V0

Estado: HECHO documental / PROD READ-ONLY ADVISORY GREEN / GITHUB MONITOR GREEN / PROD WRITES DISABLED
Fecha: 2026-10-07

## Ownership

`cap:skill-supply-chain → FACT-001`.

No se crea un `engine_id` nuevo. La capability reutiliza runtime, eventos, observabilidad, evaluación y gobierno existentes.

## Dependencias CEREBRO

`FACT-001 → GOV-001/INT-001 → SEC-001/SEC-002/IAM-001/POL-001 → QA-001/REG-001/EVA-001/JDG-001 → FINOPS-001/FREE-001/ROUTE-001 → OBS-001 → LRN-001/UPD-001/SUP-001`.

Bindings funcionales candidatos no cambian ownership de App, CRM, Supabase, SEO, WordPress, Training ni Trading.

## Dependencias externas acotadas

- GitHub: procedencia, exact commit, CI, artifacts, canary y monitor read-only mediante API GET.
- GitHub Actions standard public runner: ejecución de checks/monitor a coste adicional 0 €; token efímero con `contents: read` exclusivamente para el monitor.
- Fuentes de discovery: solo descubrimiento/referencia; nunca autoridad de confianza.
- Gemini free: solo evaluación sintética acotada; `paid_fallback=false`.
- PREPROD: `SharedRuntime` y ledgers CEREBRO existentes; coste 0 €.
- Candidato GitHub: upstream fijado `openclaw/openclaw`, manifest `skills/github/SKILL.md`; guidance subordinada por `skillwrap:cerebro-github-v0.1.0`. Código externo: NO ejecutado.
- Monitor GitHub: reutiliza `skill-github-prod-readonly-canary.mjs` como observador bounded y mantiene un workflow paralelo propio; no altera el canary histórico.
- PROD read-only canary existente: App pública y `fenix-app-gateway/health` exclusivamente mediante GET.

## Evidencia congelada

- Behavioral Supabase/Postgres: run `37642814017`, artifact `11492473830`.
- Behavioral agent-browser: run `37644374137`, artifact `11494440533`.
- Behavioral GitHub: run `37666101006`, artifact `11502662046`, digest `sha256:5d2054116652c980866fe0c11a89d239151299d7e4a1bcdc1b3e19071359540e`.
- PREPROD GitHub: run `37668271189`, artifact `11503718236`, digest `sha256:d6e0fddf4932db4939b78802ee24bd104f1f6775ebe9877657849efdc284130d`.
- GitHub PROD read-only canary: run `37670597824`, artifact `11505096443`, digest `sha256:7837d90b4a12c2b1d61faf9db1ac2c3300fc166a554d8b2e3057098c08acf387`.
- GitHub read-only advisory main promotion: PR #488, `main=257ba1b9f6d757866a67240c64c7300b6c5de223`.
- Post-merge Gate `37671631421`, Runtime Smoke `37671631622`, Live Deploy `37671631338` SKIPPED, Discovery `37671631072` SUCCESS; artifact `11505407332`, digest `sha256:a0c83328273ce7d7598c34b88487e8dadc781bb3908b28821ab8564d32f3e8cd`.
- Primer monitor read-only: run `37679202506`, head `0a128fac3df39120d1d7f9fcda30857c18694969`, artifact `11508121977`, digest `sha256:0f7fa772e09434acabcf9180ac5eab7a9b640f68bfc2c27f07c0da4cb5b04672`; `main` observado `257ba1b9f6d757866a67240c64c7300b6c5de223`.
- PROD read-only canary genérico: run `37662400743`, artifact `11500917864`.

## Runtime probado

GitHub PREPROD: 9 operaciones locales baseline/candidate/rollback; observabilidad/audit/FinOps 9/9/9; rollback físico GREEN; rebuild `DISABLED`; Judge/Tribunal GREEN.

GitHub canary/monitor: cada iteración permitida usa exactamente 2 GET reales, wrapper local, permisos read-only, coste 0 € y rollback a `DISABLED`. No hubo merge, push, mutación de issues/PR, workflow dispatch ni writes.

## Fronteras de seguridad

- Datos cliente: NO.
- Código externo de skills ejecutado: NO.
- Escritura PROD: NO.
- GitHub write/merge/push/mutaciones: NO.
- Trading: NO.
- Paid fallback: NO.
- Coste adicional: 0 €.
- App deploy por promoción/monitor GitHub: NO.
- GitHub read-only/advisory: GREEN detrás del wrapper CEREBRO.

## Próximo gate

Mantener MONITOR → LEARN → RECHECK y seleccionar el siguiente candidato desde evidencia Discovery. Cada candidato reinicia gates y no hereda confianza. Cualquier ampliación de permisos, write PROD/GitHub, merge automático, push, datos cliente, credenciales nuevas o side effects vuelve a `HUMAN_REQUIRED=HIGH_RISK` o al motivo aplicable.
