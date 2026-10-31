# CEREBRO Loan Queue Migration V2

Estado: PREPROD
Fecha: 2026-10-31

## Objetivo
Desbloquear la transición de las loan lanes PRIORITY 232..281 hacia la definición actual de `main`, donde esas 50 lanes usan runners estándar macOS, sin depender de una plaza macOS para ejecutar el propio control de migración.

## Conservación
V1 se conserva sin modificación. V2 se añade en paralelo.

## Contrato
- Control plane: `windows-latest` estándar.
- Repo público: coste adicional de runner = 0 EUR.
- Concurrency separada por `github.event_name` para que validación PR y migración post-merge no se bloqueen entre sí.
- Solo cancela runs no ejecutándose (`queued`, `pending`, `waiting`, `requested`) de lanes 232..281 con SHA distinto de `main` actual.
- Nunca cancela `in_progress`.
- Si NEURONAL está activo, respeta la reserva de 25 runners y reduce `priority_target` de 282 a 257.
- Si ya existe una ejecución current-main de la lane, no la duplica.
- Relanza sobre `main` con el workflow PRIORITY existente.
- Paid AI OFF.
- PROD write false.
- Trading false.

## Aceptación
1. PR validation GREEN en Windows.
2. Merge exacto tras GREEN.
3. Push migration GREEN.
4. Evidencia de `stale_queued_runs_cancelled` / `migrated_lanes`.
5. Evidencia física de lanes 232..281 en current main y medición `in_progress` posterior.
