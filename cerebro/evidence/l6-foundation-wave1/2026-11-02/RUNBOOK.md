# CEREBRO L6 Foundation Wave1 · Runbook

## Estado objetivo
Cerrar L6 en LAB/PREPROD con 25/25 motores físicamente evidenciados y cerrar la ola prioritaria L0 + L1 + L2 + L6 en 67/67.

## Preservación
- No modificar `engine-registry.v1.json`.
- No modificar `factory.mjs` ni `factory-v1.mjs`.
- No sobrescribir los 15 motores L6 ya físicos.
- No tocar PROD, Trading LAB, DNS, credenciales ni datos de cliente.

## Motores añadidos
`API-001`, `ARCH-001`, `DEBT-001`, `FF-001`, `CAN-001`, `LOCAL-001`, `AIBUD-001`, `DOCS-001`, `INT-001`, `STOROFF-001`.

## Gates
1. Sintaxis de todos los módulos L6.
2. Factory/Registry validation.
3. Tests focales L6.
4. Regresión CEREBRO preservando el worker pausado conocido.
5. Re-auditoría de bindings físicos mediante `connect-existing-engines-v3.mjs`.
6. OLD vs NEW: 57/67 físicos → 67/67 físicos.
7. Rebuild determinista GREEN.
8. Registry/Factory sin cambios.
9. Paquete de continuidad y artifact.

## Rollback
Eliminar únicamente los módulos aditivos de `cerebro/runtime/l6/`, el test focal y el workflow L6. Los 15 runtimes existentes permanecen intactos.

## Promoción
No autorizada. Esta ola produce foundation runtime en LAB/PREPROD, no autonomía PROD.
