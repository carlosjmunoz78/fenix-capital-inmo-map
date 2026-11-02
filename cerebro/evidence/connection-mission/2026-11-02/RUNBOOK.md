# RUNBOOK · CONNECT_EXISTING_ENGINES_AND_ENRICH_CANONICAL_DEPENDENCIES

Estado: GREEN · LAB/PREPROD.

## Alcance cerrado

- Registry canónico: 179 motores, sin mutación.
- Primera ola auditada: 67 motores — L0=13, L1=14, L2=15, L6=25.
- Bindings físicos demostrados: 34.
- Scaffold-only en esta ola: 33.
- Relaciones runtime verificadas detectadas: 15.
- Grafo efectivo acíclico: 14 relaciones.
- Relación preservada fuera del grafo por cycle guard: 1.
- Candidatas no canónicas: 515.
- Assertions de misión: 381/381 GREEN.
- Rebuild: GREEN, hash reproducible `95a4345319182459707a979c42cf17c01ce4eede2e66af2d4dd2f6a2f259dc88`.
- Coste adicional: 0 EUR.

## Reglas operativas

1. El overlay es `ADVISORY_ONLY`; no gobierna runtime ni PROD.
2. Tests, Registry, missions y workflows no prueban por sí solos implementación física.
3. Solo relaciones runtime con evidencia explícita pueden entrar en el grafo efectivo.
4. Si una relación verificada cerraría un ciclo, se conserva como candidata `cycle_guard_candidate`; no se borra ni se activa.
5. El Registry y FACT-001 se consideran fuentes canónicas preservadas.
6. No tocar Trading LAB, PROD, secretos ni datos de clientes en esta fase.

## Rollback

La misión es aditiva. Para revertirla, retirar los artefactos/overlay de esta rama. El Registry canónico, FACT-001 y las implementaciones existentes no fueron modificados por la misión.

## Rebuild

Ejecutar `.github/workflows/cerebro-connect-existing-engines.yml` en la rama aislada. El runner `cerebro/missions/connect-existing-engines-v3.mjs` reconstruye bindings y dependencias desde Registry + evidencia del repositorio y exige igualdad de hashes en dos pasadas independientes.

## P23

`POR_AUDITAR`. No existe evidencia de una integración física P23 Live Audit en este repositorio; no se afirma escritura live.

## Siguiente misión

`IMPLEMENT_PRIORITY_ENGINES_L0_L1_L2_L6_WAVE_1`.
