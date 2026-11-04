# B9 · Registro de decisiones arquitectónicas · 2026-11-04
- ADR-B9-001: Reusar el clasificador B9 ya existente, `bounded-recovery-supervisor`, B6 journal, SUP/JDG/B3; crear únicamente el adapter de admisión de evidencia LAB.
- ADR-B9-002: Admitir recuperación candidata, **no ejecutarla** ni crear un trabajador/cola nuevo. B9 no tiene capacidad de firma, pagos ni producción.
- ADR-B9-003: Denegar acción si hay 3 fallos de la misma familia; no reintentar si claim está `IN_PROGRESS` o commit incierto.
- ADR-B9-004: Veredicto por tribunal independiente, hashes verificables, OLD vs NEW y holdout sin fugas; no auto-certificar ni saltar requisitos.
- ADR-B9-005: Solo pruebas de rollback con archivos temporales, restauración byte-idéntica; no extrapolar a bases productivas.
- ADR-B9-006: Reutilización multiempresa sin datos brutos/secretos y siempre con validación local; no promoción automática.
- ADR-B9-007: Seguridad de herramienta impidió crear workflow dedicado PG17 B9. No eludir control; mantener script como candidato no ejecutado, documentar bloqueo y seguir pasos remotos seguros.
- ADR-B9-008: Coste nuevo 0 en suscripciones/IA de pago; consumos reales de minutos Actions aún desconocidos. No declarar 0 € facturados sin conciliación.
- ADR-B9-009: B8 y anteriores permanecen DRAFT. B9 se basa en B8, nunca en main.
