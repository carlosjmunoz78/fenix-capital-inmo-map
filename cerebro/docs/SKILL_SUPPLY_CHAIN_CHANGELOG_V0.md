# CEREBRO OS · Skill Supply Chain · Changelog V0

## 2026-10-07 · GitHub candidate PROD read-only canary GREEN

- Autorización humana permanente registrada para mejoras seguras/reversibles que preserven lo existente; el alcance del canary quedó limitado a lectura GitHub.
- Runtime canary específico `skill-github-prod-readonly-canary.mjs`, paralelo al canary existente y fail-closed.
- Workflow run `37670597824`, head `7ee76db7a44b7e3c1153fd3b35365fc2e2ca5554`: SUCCESS.
- Artifact `11505096443`, digest `sha256:7837d90b4a12c2b1d61faf9db1ac2c3300fc166a554d8b2e3057098c08acf387`.
- 2 GET reales a GitHub: metadata del repositorio y ref `main`.
- Repositorio: `carlosjmunoz78/fenix-capital-inmo-map`; SHA `main` observado: `3304c93b3aceed338fc2bb7d377c4d562d2d18b2`.
- Tests canary 4/4 GREEN; evidencia PREPROD inmutable revalidada antes del canary.
- Wrapper `skillwrap:cerebro-github-v0.1.0` aplicado localmente; `prod_authorized=false` preservado.
- GitHub writes, merge, push, mutación issues/PR y workflow dispatch: NO.
- Datos cliente, credenciales expuestas, código externo de skills, Trading y paid fallback: NO.
- Coste adicional 0 €.
- Binding efímero restaurado a `DISABLED`; rollback GREEN.
- Estado GitHub: `PROD_READONLY_ADVISORY_ELIGIBLE`; cualquier expansión de permisos/write permanece gated.

## 2026-10-07 · GitHub candidate PREPROD GREEN

- Candidato `github`: `lobehub-skills:52441cd3d76607ffffab`, upstream fijado `openclaw/openclaw`, manifest `skills/github/SKILL.md`, wrapper `skillwrap:cerebro-github-v0.1.0`.
- Behavioral LAB previo: run `37666101006`, head `08d46dd25ee40376bf4f548f4f2f6083c53e93f0`, artifact `11502662046`, digest `sha256:5d2054116652c980866fe0c11a89d239151299d7e4a1bcdc1b3e19071359540e`.
- PREPROD aislado y paralelo para no alterar el workflow genérico existente.
- Primer intento PREPROD `37667783071`: FAIL-CLOSED antes de ejecutar el binding por una aserción documental que esperaba `merge_authorized`; el Registry canónico usa `prod_write_authorized`. No hubo ejecución PREPROD ni side effects en ese intento.
- Corrección mínima: alinear la aserción con el schema canónico sin modificar permisos ni umbrales.
- PREPROD run `37668271189`, head `feff48e1764474db0aa118af152b23d816edd00d`: SUCCESS.
- Artifact `11503718236`, digest `sha256:d6e0fddf4932db4939b78802ee24bd104f1f6775ebe9877657849efdc284130d`.
- 9 ejecuciones PREPROD: baseline + candidate + rollback baseline sobre 3 fixtures.
- Observabilidad: 9; audit: 9; FinOps: 9; audit chain válida; coste adicional 0 €.
- Tests focalizados: 5/5 GREEN.
- Judge: `GREEN_FOR_PREPROD_TRIBUNAL`.
- Tribunal: `GREEN_FOR_HIGH_RISK_PROD_READONLY_CANARY_REVIEW`, blockers 0.
- Rollback físico: GREEN; rebuild final: `DISABLED`.
- Datos PROD/cliente, código externo, writes PROD, Trading y paid fallback: NO.
- Próximo gate del candidato GitHub: `HUMAN_REQUIRED=HIGH_RISK` para `PROD_READONLY_CANARY`; no autorizado todavía en ese corte.

## 2026-10-07 · Step 5 dark launch + PROD read-only canary GREEN

- PR #486 fusionado a `main` en `a9b51ee98cdfbf674a02e9b68b15bbf0e455d19b` tras autorización humana `HIGH_RISK`.
- `PROD Live Deploy` quedó SKIPPED: no se usó `[DEPLOY_PROD]`; App no se redesplegó por este cambio.
- `PROD Runtime Smoke` post-merge: SUCCESS.
- Implementado runtime canary aislado `PROD_CANARY`, fail-closed, coste 0 € y sin writes.
- Canary run `37662400743`, head `c84efac4b014aab873d4f484207cbce564792030`: SUCCESS.
- Artifact `11500917864`, digest `sha256:90f4f554e7e18fcb2ad22094956d5f5dfa3e0c8cad088c6efaf4cde9f2f0eecf`.
- 2 GET reales: App pública + `fenix-app-gateway/health`.
- App 200; Gateway 200, `env=PROD`, `service=fenix-app-gateway`.
- Wrappers Supabase/Postgres y agent-browser ejercitados localmente; `prod_authorized=false` preservado.
- Datos cliente, credenciales expuestas, código externo, Trading, paid fallback y writes PROD: NO.
- Binding canary volvió a `DISABLED`; rollback GREEN.
- Estado canónico: `GREEN_PROD_READONLY_CANARY`; expansión de permisos continúa gated.

## 2026-10-07 · Step 4 PREPROD runtime integration GREEN

- Harness PREPROD separado del proxy sintético sobre `SharedRuntime` y ledgers existentes.
- Evidence head `86369e0cd0d54c9c205bd39f309804a62b2c59d3`.
- Workflow `37647914902`: SUCCESS.
- Artifact `11494354501`, digest `sha256:9dac9feec60dee265d3af9b2413f48394eaf54b7f4109f4ba96051f374770c10`.
- 18 ejecuciones, 2 packages, 3/3 tests focalizados GREEN.
- Rollback físico y rebuild default-disabled GREEN.
- Judge `GREEN_FOR_PREPROD_TRIBUNAL`; Tribunal `GREEN_FOR_HIGH_RISK_PROMOTION_REVIEW`.
- Sin datos PROD/cliente, sin código externo, writes PROD, Trading ni paid fallback.

## 2026-10-07 · Step 3 behavioral evidence closure

- Behavioral baseline `135fc29a9b41d7257381c08efea49015db1e71d9`.
- Supabase/Postgres run `37642814017`: SUCCESS; artifact `11492473830`; Gemini free; Judge/rollback/Tribunal GREEN.
- agent-browser run `37644374137`: SUCCESS; artifact `11494440533`; raw `STATIC_LAB_HOLD` preservado; wrapper normalizado GREEN; thresholds no relajados.
- Coste adicional: 0 €; paid fallback=false.
