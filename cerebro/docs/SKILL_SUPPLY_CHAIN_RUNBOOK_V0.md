# CEREBRO OS · Skill Supply Chain · Runbook V0

Estado: HECHO LAB + PREPROD runtime / HUMAN_REQUIRED HIGH_RISK
Fecha: 2026-10-07

## Safe loop

1. CONSERVAR: fijar SHA, contratos, owner, evidencia y baseline existente.
2. ENTENDER: resolver upstream exacto, licencia, permisos, solapamiento y dependencias.
3. ENVOLVER: wrapper CEREBRO disabled/fail-closed; no reemplazar sistema existente.
4. PROBAR: static LAB → OLD vs NEW sintético → behavioral LAB → PREPROD runtime OLD vs NEW → judge → rollback/rebuild → tribunal.
5. MEJORAR: corregir solo el rojo exacto, sin rebajar umbrales ni permisos.
6. MIGRAR: únicamente después de PREPROD GREEN y revisión humana `HIGH_RISK`.

## HECHO · LAB

Supabase/Postgres y agent-browser alcanzaron `READY_FOR_PREPROD_PROMOTION_REVIEW` en LAB. agent-browser conserva intacto su raw `STATIC_LAB_HOLD`; el avance usa wrapper normalizado interno sin alterar thresholds.

## HECHO · PREPROD Step 4

Run `37647914902`, head `86369e0cd0d54c9c205bd39f309804a62b2c59d3`:

- `PREPROD_INTEGRATION_COMPLETE`.
- Runtime CEREBRO real en environment `PREPROD`.
- 18 ejecuciones OLD/NEW/rollback sobre 2 packages.
- Fixtures: sintéticos no cliente.
- Observabilidad + audit + FinOps persistentes locales activados.
- Coste adicional medido: 0 €.
- Rollback físico del binding: GREEN.
- Rebuild: vuelve disabled por defecto.
- Judge: `GREEN_FOR_PREPROD_TRIBUNAL`.
- Tribunal: `GREEN_FOR_HIGH_RISK_PROMOTION_REVIEW`.
- `HUMAN_REQUIRED=HIGH_RISK`.
- merge/PROD/autopromotion: false.

## Alcance exacto del PREPROD

Se probó la integración del wrapper dentro del runtime CEREBRO y su reversibilidad. No se ejecutó código externo de las skills ni side effects reales contra sistemas externos; esta exclusión es intencionada porque las skills admitidas son guidance no confiable, no ejecutables autónomos.

## Gate actual

STOP en `HIGH_RISK`. Antes de cualquier merge/promoción con impacto potencial en PROD se exige revisión humana explícita. No convertir el GREEN de PREPROD en autorización automática.

## Si se autoriza avanzar después del HIGH_RISK

Aplicar canary/binding gradual, conservar baseline, observabilidad activa y rollback inmediato; no ampliar permisos, datos o coste en el mismo cambio. Cualquier coste >0 → `MONEY_LIMIT`. Cualquier acceso no autorizado a datos PROD/cliente, write PROD, código externo o Trading → STOP.

## No hacer

No merge directo por inferencia. No activar wrappers en PROD sin gate humano. No copiar credenciales. No borrar/reemplazar App/CRM/Supabase/Notion/WordPress/SEO/Training/Trading. No reinterpretar PREPROD GREEN como PROD GREEN.
