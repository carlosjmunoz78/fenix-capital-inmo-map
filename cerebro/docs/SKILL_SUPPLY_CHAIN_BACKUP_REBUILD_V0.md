# CEREBRO OS · Skill Supply Chain · Backup / Rebuild V0

Estado: HECHO para código/config/evidencia referenciada; PARCIAL para PREPROD real
Fecha: 2026-10-07

## Backup

- Código, workflows, wrappers, contratos y documentación: preservados por historial Git y SHA exacto.
- Baseline behavioral congelado: `135fc29a9b41d7257381c08efea49015db1e71d9`.
- Supabase artifact: `11492473830`, digest `sha256:2837ab122a2efbab92536f32519c971d7967c071ada5594dff2258f78796c3e0`.
- agent-browser artifact: `11494440533`, digest `sha256:0a1f97bf1e7271454627eb7553147dfa5930c28a26fac20232fd1acd58e06d5c`.

Los artifacts de Actions tienen retención temporal; no son por sí solos un backup permanente. Los identificadores/digests quedan registrados para trazabilidad, y la fuente reproducible permanece en Git.

## Rebuild

Rebuild de la capability = checkout del SHA/branch autorizado → tests/validación → discovery exacto → reconstrucción de wrappers disabled → zero-cost route audit → quota → LAB sintético autorizado. Por defecto el rebuild no habilita wrappers ni PROD.

## Rollback

- LAB/wrapper: deshabilitar binding y volver al baseline; `GREEN_ROLLBACK_REBUILD_PROOF` ya está demostrado para scope `WRAPPER_BINDING_ONLY_SYNTHETIC`.
- Ese GREEN no demuestra rollback de efectos DB/filesystem/network/PROD futuros.
- PREPROD real debe ejecutar su propio rollback físico antes de promoción.
- Nunca borrar historia, force-push `main` ni sustituir sistemas existentes como mecanismo de rollback.

## Coste

No se introduce servicio de backup de pago. Objetivo adicional 0 €.
