# CEREBRO OS · Skill Supply Chain · Backup / Rebuild V0

Estado: HECHO para código/config/LAB/PREPROD/PROD read-only canary, incluido GitHub; PROD writes deshabilitados
Fecha: 2026-10-07

## Backup

- Código, workflows, wrappers, contratos y documentación: historial Git + SHA exacto.
- Behavioral baseline: `135fc29a9b41d7257381c08efea49015db1e71d9`.
- PREPROD evidence head genérico: `86369e0cd0d54c9c205bd39f309804a62b2c59d3`.
- Dark launch main previo: `a9b51ee98cdfbf674a02e9b68b15bbf0e455d19b`.
- Supabase artifact: `11492473830`.
- agent-browser artifact: `11494440533`.
- PREPROD artifact genérico: `11494354501`.
- GitHub Behavioral LAB: run `37666101006`, head `08d46dd25ee40376bf4f548f4f2f6083c53e93f0`, artifact `11502662046`, digest `sha256:5d2054116652c980866fe0c11a89d239151299d7e4a1bcdc1b3e19071359540e`.
- GitHub PREPROD: run `37668271189`, head `feff48e1764474db0aa118af152b23d816edd00d`, artifact `11503718236`, digest `sha256:d6e0fddf4932db4939b78802ee24bd104f1f6775ebe9877657849efdc284130d`.
- GitHub PROD read-only canary: run `37670597824`, head `7ee76db7a44b7e3c1153fd3b35365fc2e2ca5554`, artifact `11505096443`, digest `sha256:7837d90b4a12c2b1d61faf9db1ac2c3300fc166a554d8b2e3057098c08acf387`, `main` observado `3304c93b3aceed338fc2bb7d377c4d562d2d18b2`.
- PROD read-only canary existente: run `37662400743`, head `c84efac4b014aab873d4f484207cbce564792030`, artifact `11500917864`, digest `sha256:90f4f554e7e18fcb2ad22094956d5f5dfa3e0c8cad088c6efaf4cde9f2f0eecf`.

Los artifacts de Actions tienen retención temporal; Git y la documentación canónica son la fuente reproducible.

## Rebuild

Checkout del SHA autorizado → tests → registry/contract → wrappers disabled → LAB/PREPROD según necesidad → canary explícito si aplica → evidencia → binding final `DISABLED`.

Para GitHub, reconstruir desde el wrapper interno y upstream fijado (`openclaw/openclaw`, `skills/github/SKILL.md`); no ejecutar código externo del upstream. Revalidar primero Behavioral LAB, después PREPROD y, para read-only PROD, el canary específico con GET únicamente.

## Rollback PREPROD genérico · HECHO

Baseline → candidate wrapper → rollback físico → re-ejecución por hash → rebuild → `DISABLED`. GREEN para ambos packages existentes.

## Rollback GitHub PREPROD · HECHO

Flujo físico probado:

1. rebuild inicial a `DISABLED`;
2. binding `BASELINE` y ejecución de 3 fixtures;
3. binding `GITHUB_WRAPPER` y ejecución de los mismos 3 fixtures;
4. rollback físico a `BASELINE` y re-ejecución de 3 fixtures;
5. comparación por SHA de outputs baseline vs rollback;
6. rebuild final a `DISABLED`.

Resultado run `37668271189`: 9 ejecuciones, `rollback_ready=true`, audit chain válida, `final_binding_state=DISABLED`, coste 0 €.

## Rollback PROD read-only canary · HECHO para lane existente

El canary existente usa binding local/efímero y no despliega App ni modifica backend. Flujo:

1. estado inicial `DISABLED`;
2. habilitación temporal `PROD_READONLY_CANARY_ENABLED`;
3. dos GET read-only reales;
4. wrappers locales;
5. restauración a `DISABLED` incluso en error;
6. evidencia persistida y artifact.

Resultado: `rollback_proven=true`, `binding_after=DISABLED`.

## Rollback GitHub PROD read-only canary · HECHO

Flujo probado:

1. estado local inicial `DISABLED`;
2. habilitación temporal `GITHUB_PROD_READONLY_CANARY_ENABLED`;
3. GET de metadata del repositorio;
4. GET de `refs/heads/main`;
5. wrapper GitHub ejercitado localmente, sin ejecutar código externo;
6. restauración a `DISABLED` incluso ante fallo;
7. artifact inmutable del resultado.

Resultado run `37670597824`: `GREEN_GITHUB_PROD_READONLY_CANARY`, `rollback_proven=true`, `binding_after=DISABLED`, GitHub write/merge/push/mutaciones = NO, coste 0 €.

## Límite

No existe rollback de write PROD porque esta capability no tiene writes PROD/GitHub autorizados ni ejecutados. Cualquier futura mutación requerirá su propio backup/snapshot, canary, rollback probado y gate de riesgo antes de promoción.

## Coste

No se introduce servicio de backup de pago. Coste adicional observado: 0 €.
