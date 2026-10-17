# CEREBRO OS · B18 · BACKUP / REBUILD / AUTONOMY

Fecha: 2026-10-18

## Backup
Baseline de código fijado e inmutable para B18:
`f17fd6481c27d11df3442fb5764ba63c414bbfea`.

No hay migraciones de base de datos, secretos, datos cliente ni infraestructura nueva. La evidencia LRN del workflow se persiste únicamente en artifact/ledger PREPROD temporal y no escribe en PROD.

## Rollback
Si NEW no mejora, aparece regresión o falla Tribunal:
1. rechazar candidato;
2. restaurar `cerebro/platform/auto001-preprod-patch-planner-v0.mjs` al baseline B18 o revertir el commit de cambio;
3. ejecutar targeted tests;
4. ejecutar full CEREBRO regression;
5. registrar evidencia de rollback.

No se autoriza auto-merge ni promoción PROD desde este contrato.

## Rebuild
Rebuild determinista:
- checkout del exact PR head;
- worktree OLD en baseline B18;
- Node 24.x;
- ejecutar workflow `CEREBRO Universal Skill B18 LRN Measured Engineer Outcome Loop V1`;
- reconstruir report, ledger temporal y boundaries artifact.

No requiere servicio de pago ni dependencia nueva.

## Autonomía
Estado B18: `HECHO_PREPROD`.

Autonomía permitida:
- medir baseline/NEW;
- persistir learning PREPROD local;
- crear candidate de mejora;
- ejecutar Safe Engineering;
- OLD vs NEW;
- Tribunal independiente;
- decidir keep/rollback en PREPROD;
- aprender para el siguiente ciclo.

Autonomía NO concedida:
- PROD write;
- merge automático;
- ampliación de permisos;
- acceso Trading;
- uso de datos cliente;
- gasto adicional.

HUMAN_REQUIRED activo: ninguno.

Siguiente bloque autorizado dentro de PREPROD: `B19_UNIVERSAL_E2E_REAL`.
