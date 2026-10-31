# CEREBRO PRIORITY Three-Pool Topology V1

Estado: PREPROD
Fecha: 2026-10-31

## Objetivo
Aumentar la concurrencia física efectiva sin aumentar el presupuesto lógico de 350 trabajos útiles ni introducir coste adicional.

## Topología objetivo
- SUSTAINED Ubuntu: 68 lanes.
- PRIORITY Ubuntu: lanes 0..131 y 182..231 = 182 lanes.
- PRIORITY Windows: lanes base 132..181 = 50 lanes.
- PRIORITY macOS: loan lanes 232..281 = 50 lanes.
- Total útil: 68 + 182 + 50 + 50 = 350.
- Reserva de control: 10.
- Techo gobernado: 360.

## Migración segura
Las lanes base 132..181 son persistentes y se autorrellenan. No se cancela ningún trabajo `in_progress`. Cada lease que finaliza se vuelve a despachar contra `main`; con la nueva definición, la siguiente ejecución pasa a `windows-latest`. La transición es gradual y reversible por rollback del workflow.

## Compatibilidad Windows
El runtime `portfolio-priority-sustained-v1.mjs` usa Node.js, Git y filesystem portable. El CI ejecuta el runtime real en Windows con cuatro slots y comprueba las evidencias producidas. El self-refill usa endpoints `gh api` sin slash inicial para evitar Git Bash path conversion.

## Invariantes
- PREPROD únicamente.
- Paid AI OFF.
- PROD write false.
- Trading false.
- 0 EUR de suscripción adicional.
- No se supera 350 útiles + 10 control.
- No se cancela trabajo útil `in_progress`.

## Aceptación
1. Smoke físico Windows GREEN con lane 132 y 4 slots.
2. Routing contract 132..181 -> Windows; 232..281 -> macOS; resto -> Ubuntu.
3. Merge solo tras gates GREEN.
4. Verificar lanes 132..181 físicamente en `main` sobre Windows después del autorrelleno.
5. Comparar `in_progress` físico antes/después.
6. Rollback: revertir el routing conserva el runtime y devuelve lanes al pool Ubuntu sin pérdida de contratos.
