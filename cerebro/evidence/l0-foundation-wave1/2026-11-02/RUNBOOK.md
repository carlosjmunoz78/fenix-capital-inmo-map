# CEREBRO L0 Foundation Wave1 · Runbook

## Estado
GREEN en LAB/PREPROD. No autorizado para promoción a PROD por este cierre.

## Componentes nuevos
`cerebro/runtime/l0/` contiene runtime determinista para CORE-001, GOV-001, POL-001, DEC-001, SEM-001, OWN-001, OBJ-001, ADR-001, CFG-001 y VER-001. ORCH-001, HEX-001 y FACT-001 se conservan y se envuelven sin sobrescritura.

## Validación
Ejecutar `node --test cerebro/tests/l0-foundation-wave1.test.mjs`, la regresión CEREBRO y después `node cerebro/missions/connect-existing-engines-v3.mjs --out <dir>`.

El gate exige 13/13 L0 con evidencia física, rebuild determinista, Registry/Factory sin cambios, cero acceso PROD/Trading y coste adicional 0 €.

## Corrección de baseline
El histórico de 34 motores físicos contenía un falso positivo: CAN-001 coincidía con rutas de SCAN-001. El baseline corregido anterior es 33. La Wave L0 añade exactamente 10 motores y deja 43 físicos de 67 prioritarios.

## Rollback
Revertir únicamente los módulos aditivos `cerebro/runtime/l0/`, el test focal, el workflow de la Wave y la corrección del analizador de identidad de rutas. No modificar ORCH-001, HEX-001, FACT-001, Registry ni Factory.

## Rebuild
Reconstruir desde Registry + evidencia física del repositorio mediante el analizador corregido con límites de token. El rebuild debe producir hashes idénticos.

## Próximo bloque
L1_FOUNDATION: UPD-001, OBS-001, CON-001, CACHE-001 y TWIN-001, preservando los 9 motores L1 ya físicos.
