# CEREBRO OS · Skill Supply Chain · Backup / Rebuild V0

Estado: HECHO para código/config/LAB/PREPROD/PROD read-only canary; PROD writes deshabilitados
Fecha: 2026-10-07

## Backup

- Código, workflows, wrappers, contratos y documentación: historial Git + SHA exacto.
- Behavioral baseline: `135fc29a9b41d7257381c08efea49015db1e71d9`.
- PREPROD evidence head: `86369e0cd0d54c9c205bd39f309804a62b2c59d3`.
- Dark launch main: `a9b51ee98cdfbf674a02e9b68b15bbf0e455d19b`.
- Supabase artifact: `11492473830`.
- agent-browser artifact: `11494440533`.
- PREPROD artifact: `11494354501`.
- PROD read-only canary: run `37662400743`, head `c84efac4b014aab873d4f484207cbce564792030`, artifact `11500917864`, digest `sha256:90f4f554e7e18fcb2ad22094956d5f5dfa3e0c8cad088c6efaf4cde9f2f0eecf`.

Los artifacts de Actions tienen retención temporal; Git y la documentación canónica son la fuente reproducible.

## Rebuild

Checkout del SHA autorizado → tests → registry/contract → wrappers disabled → LAB/PREPROD según necesidad → canary explícito → evidencia → binding final `DISABLED`.

## Rollback PREPROD · HECHO

Baseline → candidate wrapper → rollback físico → re-ejecución por hash → rebuild → `DISABLED`. GREEN para ambos packages.

## Rollback PROD read-only canary · HECHO

El canary usa binding local/efímero y no despliega App ni modifica backend. Flujo:

1. estado inicial `DISABLED`;
2. habilitación temporal `PROD_READONLY_CANARY_ENABLED`;
3. dos GET read-only reales;
4. wrappers locales;
5. restauración a `DISABLED` incluso en error;
6. evidencia persistida y artifact.

Resultado: `rollback_proven=true`, `binding_after=DISABLED`.

## Límite

No existe rollback de write PROD porque esta capability no tiene writes PROD autorizados ni ejecutados. Cualquier futura mutación requerirá su propio backup/snapshot, canary y rollback probado antes de promoción.

## Coste

No se introduce servicio de backup de pago. Coste adicional observado: 0 €.
