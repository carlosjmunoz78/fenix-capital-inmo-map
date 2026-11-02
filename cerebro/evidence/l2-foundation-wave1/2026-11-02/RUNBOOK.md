# CEREBRO L2 Foundation Wave1 · Runbook

## Estado
GREEN en LAB/PREPROD. No autorizado para promoción a PROD.

## Foundations nuevas
SUP-001, INC-001, SEC-002, RED-001, QAB-001, REG-001, DR-001, BCP-001 y CRS-001.

Todas son no destructivas. SEC-002 solo maneja metadatos; RED-001 solo casos sintéticos; DR-001 documenta manifiestos/3-2-1/pruebas de restore sin ejecutar backup/restore; BCP/CRS no ejecutan acciones externas.

## Motores preservados
OBSERV-001, SELF-001, SEC-001, IAM-001, QA-001 y RBLD-001 siguen en WRAP_PRESERVE.

## Validación
Ejecutar `node --test cerebro/tests/l2-foundation-wave1.test.mjs`, regresión completa y `node cerebro/missions/connect-existing-engines-v3.mjs --out <dir>`.

El gate exige 15/15 L2 físicos, 57/67 prioritarios físicos, rebuild determinista, Registry/Factory inmutables y cero PROD/Trading/coste adicional.

## Rollback
Retirar únicamente `cerebro/runtime/l2/`, test y workflow de esta Wave; no modificar implementaciones L2 preexistentes ni L0/L1.

## Próximo bloque
L6_FOUNDATION.
