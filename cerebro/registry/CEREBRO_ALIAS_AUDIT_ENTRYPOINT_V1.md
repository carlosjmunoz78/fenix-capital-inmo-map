# CEREBRO OS · Audit Entry Point · Alias y catálogo vivo V1

Fecha de corte: 2026-10-15

Este documento es el punto de entrada humano para auditar nombres, aliases y clasificación de entidades CEREBRO sin confundir motores, capacidades y skills.

## Autoridad y conteos

- **179 motores canónicos**: autoridad `cerebro/registry/engine-registry.v1.json`.
- **184 capacidades normalizadas**: autoridad de convergencia `cerebro/skills/cerebro-184-live-convergence.v3.json` y los ficheros de reconciliación `cerebro-184-items-*-live-reconciliation.v2.json`.
- **73 skills ejecutables observadas**: ficheros actuales `cerebro/skills/skill-*.mjs` en el corte documentado.
- Main auditado al iniciar este trabajo: `96cf3c677284a219a9108e706bee4572e0d34660`.

## Catálogos de aliases

1. Motores: `cerebro/registry/cerebro-engine-aliases.es.v1.json`
2. Capacidades: `cerebro/registry/cerebro-capability-aliases.es.v1.json`
3. Skills ejecutables: `cerebro/registry/cerebro-skill-aliases.es.v1.json`

## Regla canónica

- El `engine_id` es estable e independiente del alias humano.
- Todo motor nuevo deberá nacer con `alias_es`, versión, procedencia y clasificación.
- Una **capacidad no es un motor**.
- Una **skill no es un motor**.
- Una skill no genera un `engine_id` nuevo salvo gap documentado y paso por FACT-001.
- El alias no modifica autonomía, permisos, estado físico ni autorización de PROD.
- Alias y catálogo mantienen coste adicional objetivo de `0 €` y no alteran Trading.

## Discrepancias que NO deben resolverse silenciosamente

### BRANDBOOT-001 — POR AUDITAR
Aparece como capacidad 176 y existe en el mirror de Notion como candidato/estado parcial, pero **no figura** en el registro canónico vivo de 179 motores. Debe mantenerse fuera del conteo canónico hasta reconciliación explícita.

### PLUGIN-UNIVERSAL-001 — POR AUDITAR
Existe en el mirror de Notion, pero **no figura** en `engine-registry.v1.json`. Debe determinarse si es plugin, capacidad, adapter o candidato antes de registrarlo como motor.

### AUDIT-001 frente a AUD-001 — POR AUDITAR
Existe una referencia histórica/documental a `AUDIT-001`. El ID canónico vigente en el Engine Registry es `AUD-001`. No renombrar ni fusionar automáticamente sin revisar dependencias.

## Regla de auditoría rápida

Ante cualquier auditoría:

1. Abrir este documento.
2. Verificar el SHA de `main` y el `engine-registry.v1.json` vivo.
3. Comparar conteos de motores, capacidades y skills por separado.
4. Revisar identificadores `POR AUDITAR` sin sumarlos a motores canónicos.
5. Verificar que cualquier entidad nueva dispone de alias ES, procedencia, versión y clasificación.
6. Si existe discrepancia, conservar el estado previo, abrir reconciliación y evitar promoción a PROD hasta pruebas y tribunal.

## Política de actualización

FACT-001/GOV-001 deberán tratar la ausencia de alias para una entidad registrable nueva como **deuda de registro**, no como permiso para inventar un motor. El catálogo de aliases es un sidecar de lenguaje humano y auditoría: no sustituye manifiestos, contratos, gates, observabilidad, rollback, backup ni rebuild.

## Límites de esta actualización

- No se toca PROD.
- No se toca Trading.
- No se promueve ningún motor ni capacidad.
- No se cambia el estado operativo de ninguna entidad.
- No se sustituye el Engine Registry; se lo envuelve con aliases y un punto de auditoría rápido.
