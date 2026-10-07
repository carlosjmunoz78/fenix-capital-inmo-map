# CEREBRO OS · Skill Supply Chain · Backup / Rebuild V0

Estado: HECHO para código/config/LAB/PREPROD/PROD read-only/advisory + monitor; PROD writes deshabilitados
Fecha: 2026-10-07

## Backup

- Código, workflows, wrappers, contratos y documentación: historial Git + SHA exacto.
- Behavioral baseline: `135fc29a9b41d7257381c08efea49015db1e71d9`.
- PREPROD evidence head genérico: `86369e0cd0d54c9c205bd39f309804a62b2c59d3`.
- Dark launch main previo: `a9b51ee98cdfbf674a02e9b68b15bbf0e455d19b`.
- GitHub Behavioral LAB: run `37666101006`, artifact `11502662046`, digest `sha256:5d2054116652c980866fe0c11a89d239151299d7e4a1bcdc1b3e19071359540e`.
- GitHub PREPROD: run `37668271189`, artifact `11503718236`, digest `sha256:d6e0fddf4932db4939b78802ee24bd104f1f6775ebe9877657849efdc284130d`.
- GitHub PROD read-only canary: run `37670597824`, artifact `11505096443`, digest `sha256:7837d90b4a12c2b1d61faf9db1ac2c3300fc166a554d8b2e3057098c08acf387`.
- GitHub read-only/advisory promotion: PR #488, main `257ba1b9f6d757866a67240c64c7300b6c5de223`.
- Post-merge Discovery: run `37671631072`, artifact `11505407332`, digest `sha256:a0c83328273ce7d7598c34b88487e8dadc781bb3908b28821ab8564d32f3e8cd`.
- Primer GitHub monitor: run `37679202506`, head `0a128fac3df39120d1d7f9fcda30857c18694969`, artifact `11508121977`, digest `sha256:0f7fa772e09434acabcf9180ac5eab7a9b640f68bfc2c27f07c0da4cb5b04672`.
- PROD read-only canary genérico: run `37662400743`, artifact `11500917864`, digest `sha256:90f4f554e7e18fcb2ad22094956d5f5dfa3e0c8cad088c6efaf4cde9f2f0eecf`.

Los artifacts de Actions tienen retención temporal; Git y la documentación canónica son la fuente reproducible.

## Rebuild

Checkout del SHA autorizado → tests → Registry/Contract → wrappers disabled → LAB/PREPROD según necesidad → canary read-only si aplica → promoción únicamente del alcance GREEN → monitor/recheck → evidencia → binding final `DISABLED`.

Para GitHub, reconstruir desde wrapper interno + upstream fijado (`openclaw/openclaw`, `skills/github/SKILL.md`); no ejecutar código externo. Revalidar Behavioral LAB, PREPROD, canary y estado canónico antes de habilitar monitor.

## Rollback PREPROD · HECHO

Baseline → candidate wrapper → rollback físico → re-ejecución por hash → rebuild → `DISABLED`. GitHub PREPROD run `37668271189`: 9 ejecuciones, audit chain válida, rollback GREEN, `final_binding_state=DISABLED`, coste 0 €.

## Rollback GitHub PROD read-only · HECHO

Canary y monitor usan binding local/efímero:

1. estado `DISABLED`;
2. habilitación temporal read-only;
3. exactamente 2 GET permitidos;
4. wrapper local sin código externo;
5. restauración a `DISABLED` incluso ante fallo;
6. artifact inmutable.

Canary run `37670597824`: GREEN, rollback GREEN, binding `DISABLED`.

Monitor run `37679202506`: GREEN, 4/4 tests, 2 GET, `main=257ba1b9f6d757866a67240c64c7300b6c5de223`, rollback GREEN, binding `DISABLED`, coste 0 €.

## Recuperación del monitor

Si el monitor falla:

- no reintentar ampliando permisos;
- no usar credenciales distintas ni fallback de pago;
- conservar el último GREEN como evidencia histórica, no como sustituto del fallo actual;
- inspeccionar el rojo exacto;
- mantener binding `DISABLED`;
- corregir en rama paralela y volver a ejecutar tests + monitor antes de promover.

## Límite

No existe rollback de write PROD porque esta capability no tiene writes PROD/GitHub autorizados ni ejecutados. Cualquier futura mutación requiere backup/snapshot propio, canary, rollback probado y gate de riesgo antes de promoción.

## Coste

No se introduce servicio de backup de pago. Coste adicional observado: 0 €.
