# L14 · Web Engineering / Web Creator / WordPress

**Owner:** WEB-001 + WAUD-001 · **Auditoría:** HECHO · **Resultado:** ACCIONES

## Hallazgos
- Snapshot reproducible de 204 URLs; header/nav/footer presentes en todas.
- 29 URLs no exponen landmark `<main>`.
- HTML medio ~218 KB; CSS inline mediano ~104 KB; JS inline mediano ~31,7 KB.
- Persiste el crédito nativo Astra además del footer corporativo/legal.

## Acciones
- Converger a componentes/design system reutilizable sin reescritura destructiva.
- Normalizar landmarks y dependencias.
- Todo refactor con OLD vs NEW y rollback.