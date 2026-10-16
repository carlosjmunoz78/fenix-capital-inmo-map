# LOTE 3 · COM-001 + NOTIF-001 + C360-001 · Strict PREPROD

## Objetivo
Cerrar el tramo `SALE -> COM -> NOTIF -> C360 -> NBA/LRN/OBSERV/FINOPS` sin duplicar CRM, sin reescribir COM y sin ejecutar efectos externos.

## Conservación
- `COM-001`: se conserva y envuelve `cerebro/communication/com-delivery-router-v1.mjs`.
- `NOTIF-001`: se implementa como planificador determinista de agrupación, prioridad, dedupe, quiet hours y escalado de excepciones canónicas.
- `C360-001`: se implementa como proyección read-only sobre señales existentes. No se convierte en nueva fuente de verdad.

## Gates
1. PREPROD exacto y multiempresa.
2. COM selecciona adapter permitido pero `adapter_dispatch_authorized=false`.
3. NOTIF agrupa/no duplica y nunca envía directamente.
4. C360 no contiene PII cruda y no escribe CRM/DB.
5. OLD vs NEW + tribunal independiente.
6. Feedback LRN.
7. Observabilidad + auditoría + FinOps 0 EUR.
8. Backup + rollback + rebuild.
9. Idempotencia/restart.
10. Exact-head CI + governed main + RSI antes de merge/certificación.

## Autoridad
`PROD=false`, `PROD_WRITE=false`, `CRM_WRITE=false`, `PROVIDER_WRITE=false`, `DISPATCH=false`, `SPEND=0`, `TRADING=false`, `EXTERNAL_CODE=false`.

## Rollback
Todo el cambio es aditivo. COM existente no se modifica. NOTIF/C360 pueden retirarse desactivando sus bindings/sidecars y eliminando el candidato antes de PROD, sin alterar LEAD/SALE ni CRM/App.
