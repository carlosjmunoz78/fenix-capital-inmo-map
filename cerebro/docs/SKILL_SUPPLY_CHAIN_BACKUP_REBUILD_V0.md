# CEREBRO OS · Skill Supply Chain · Backup / Rebuild V0

Estado: HECHO para código/config/LAB/PREPROD binding / PROD no autorizado
Fecha: 2026-10-07

## Backup

- Código, workflows, wrappers, contratos y documentación: preservados por historial Git y SHA exacto.
- Behavioral baseline: `135fc29a9b41d7257381c08efea49015db1e71d9`.
- PREPROD evidence head: `86369e0cd0d54c9c205bd39f309804a62b2c59d3`.
- Supabase artifact: `11492473830`, digest `sha256:2837ab122a2efbab92536f32519c971d7967c071ada5594dff2258f78796c3e0`.
- agent-browser artifact: `11494440533`, digest `sha256:0a1f97bf1e7271454627eb7553147dfa5930c28a26fac20232fd1acd58e06d5c`.
- PREPROD artifact: `11494354501`, digest `sha256:9dac9feec60dee265d3af9b2413f48394eaf54b7f4109f4ba96051f374770c10`.

Los artifacts de Actions tienen retención temporal y no sustituyen Git como fuente reproducible. IDs y digests quedan registrados para trazabilidad.

## Rebuild

Rebuild de la capability = checkout del SHA autorizado → tests → registry/contract → wrappers disabled → runtime PREPROD → binding baseline/new → judge → tribunal. El estado reconstruido debe quedar `DISABLED` por defecto hasta que un gate explícito lo habilite.

## Rollback HECHO en PREPROD

Step 4 ejercitó un binding físico local persistido en PREPROD:

1. baseline;
2. candidate wrapper;
3. rollback físico a baseline;
4. re-ejecución y comparación determinista por hash;
5. rebuild eliminando el binding persistido;
6. estado final `DISABLED`.

Resultado: GREEN para ambos packages. Esto demuestra reversibilidad del binding CEREBRO probado; no autoriza ni pretende demostrar rollback de efectos externos no ejecutados.

## PROD

No existe rollback PROD de esta capability porque no se ha promovido a PROD. Cualquier promoción futura debe mantener canary + rollback propio y no puede deducirse del PREPROD actual.

## Coste

No se introduce servicio de backup de pago. Coste adicional medido Step 4: 0 €.
