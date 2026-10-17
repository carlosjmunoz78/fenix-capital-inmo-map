# CEREBRO UNIVERSAL SKILL ACTIVATION FACTORY V1 · RUNBOOK

Fecha: 2026-10-17 · Issue #780 · PR #784 · LAB/PREPROD · PROD NO TOCAR · 0 EUR.

## Regla
Continuar automáticamente. Parar solo por HUMAN_REQUIRED canónico real o autoridad excedida. Conservar antes de modificar. Corregir fallos por familia/generador, no por skill.

## Ciclo
Evidencia viva → dependencias → implementación aditiva/wrapper → tests focales → regresión subsistema → regresión CEREBRO → OLD vs NEW → Tribunal → LRN/OBS/Audit/FinOps → rollback/rebuild → estado terminal.

## FULL
Nunca usar FULL para discovery/catálogo/normalización/wrapper/scaffold/simulación. `FULL_SAFE_PREPROD` requiere consumo semántico real por binding relevante, OLD vs NEW PASS, Tribunal PASS, no regresión, LRN/OBS/Audit/FinOps, backup/rollback/rebuild, idempotencia/restart, coste/política correctos y evidencia física donde aplique.

## Certificado
B0–B7 GREEN. B8 provider finance auto-engineering GREEN. B9 unseen repo + public GitHub URL real GREEN. B10 cola durable con JOB-001, concurrencia, duplicado/restart y trigger definitions GREEN en PREPROD control plane. HEAD certificado `876ae431e67b278b447fc21006c48c4bb94bb592`; Factory run `39032881903` incluye full regression SUCCESS.

## B11 activo
1. Corregir inferencia legacy de dominios para evitar sobre-binding por empates de owner overlap.
2. Preferir evidencia textual/manifest y compatibilidad con owners.
3. No inventar dominios con baja confianza: LOW_CONFIDENCE/HOLD.
4. Añadir auto-engineering providers solo por familia/domain contract, nunca candidate ID.
5. Reejecutar 47,48,57,62,101,130,157,176,181,183 y medir mejora.
6. Physical browser/media/device no puede ser FULL sin evidencia física.
7. Mantener code execution externo y dependency install deshabilitados salvo futura ruta explícitamente sandboxed y gobernada.

## Anti-loop
Tres fallos equivalentes => parar parcheo y volver a contrato/planner/normalizador/provider común.

## B12 plan
Certificación final: skill/repo/URL nueva → terminal verdadero sin chat conductor; pruebas multi-familia; SLO medido; restart/idempotencia; batch concurrente; promoción solo tras gates. Workflow continuo no se declarará activo en default branch hasta promoción gobernada.

## Continuidad
Antes de saturación o hito mayor: MASTER + STATE + RUNBOOK + HANDOFF con HEAD/runs/evidencia/next_block.
