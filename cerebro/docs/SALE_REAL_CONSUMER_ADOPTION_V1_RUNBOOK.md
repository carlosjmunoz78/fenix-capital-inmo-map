# SALE-001 · Strict real-consumer adoption V1

## Estado objetivo
`FULL_E2E_REAL_PREPROD` únicamente. Este bloque no concede PROD, escrituras CRM, dispatch externo, gasto ni Trading.

## Cadena preservada
`LEAD-001 -> SALE-001 -> COM-001 -> adapter gate`

- `LEAD-001` permanece sin cambios y entrega señal comercial priorizada.
- `SALE-001` califica, decide siguiente acción, genera cadencia y construye un `delivery_intent` sin PII ni autorización de dispatch.
- `COM-001` reutiliza el router existente para permiso, quiet hours, dedupe, canal y adapter gate.
- ningún paso de este bloque envía mensajes ni escribe CRM/PROD.

## Consumidores estrictos
`COM-001`, `NBA-001`, `C360-001`, `CRM-001`, `LRN-001`, `OBSERV-001`, `FINOPS-001`.

No basta con recibir un objeto. Cada consumidor debe demostrar una decisión semántica y un `outcome_hash`.

## Gates obligatorios
1. runtime nativo determinista y multiempresa;
2. replay/idempotencia;
3. integración semántica con COM-001 existente;
4. OLD vs NEW;
5. tribunal independiente;
6. feedback a LRN-001;
7. observabilidad y auditoría;
8. FinOps = 0 EUR;
9. backup + rollback + rebuild;
10. exact-head CI;
11. replay gobernado sobre `main` antes de cualquier promoción posterior.

## Prohibiciones
- `prod_authorized=false`
- `prod_write_authorized=false`
- `crm_write_authorized=false`
- `provider_write_authorized=false`
- `spend_authorized=false`
- `trading_access=false`
- `external_code_execution=false`

## Rollback
El cambio es aditivo. Antes de merge, cerrar el PR elimina el candidato. Después de merge, el runtime sigue PREPROD-only y puede deshabilitarse retirando el binding/candidato sin alterar LEAD-001 ni COM-001.

## Política
CONSERVAR -> ENTENDER -> ENVOLVER -> PROBAR -> MEJORAR -> MIGRAR.
