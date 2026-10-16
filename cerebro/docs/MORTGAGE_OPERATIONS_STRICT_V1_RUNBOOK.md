# LOTE 4 · Mortgage Operations · Strict PREPROD V1

## Objetivo
Consolidar y cerrar en una ruta gobernada los contratos hipotecarios históricos `VIA-001`, `BNK-001..006` y `OFR-001`, reutilizando conocimiento/documentos existentes y sin crear una vía paralela de CRM, decisión crediticia o comunicación bancaria.

## Principio aplicado
`CONSERVAR -> ENTENDER -> ENVOLVER -> PROBAR -> MEJORAR -> MIGRAR`.

Los PR históricos 313–320 se consideran evidencia de diseño/contrato, no evidencia viva suficiente. Este bloque reconstruye una implementación estricta PREPROD sobre `main` y la somete a consumo semántico, OLD vs NEW, tribunal, replay, observabilidad, FinOps, backup, rollback y rebuild.

## Motores
- `VIA-001`: viabilidad hipotecaria preliminar determinista. Nunca decisión crediticia ni compromiso bancario.
- `BNK-001`: conocimiento bancario con `source_refs`, fecha efectiva, confidence y case_count. No promoción automática de reglas.
- `BNK-002`: ranking explicable por aprobación, coste, velocidad, encaje y experiencia.
- `BNK-003`: routing/reintento limitado. El límite agota en `HUMAN_REQUIRED/HIGH_RISK`.
- `BNK-004`: preparación de dossier y plantillas. No presentación real al banco.
- `BNK-005`: planificación SLA/seguimiento. No envío real.
- `BNK-006`: objetivo de negociación dentro de rango aprobado. No contacto real.
- `OFR-001`: comparación TIN/TAE/costes/seguros/bonificaciones/flexibilidad. No decisión crediticia.

## Cadena objetivo
`DOC/COH/KNW/RSH/UPD/PRV -> VIA/BNK/OFR -> SALE/COM/C360/NOTIF -> LRN/OBSERV/FINOPS`.

## Gates obligatorios
1. contexto multiempresa + PREPROD;
2. fuentes/evidencia obligatorias;
3. no PII cruda ni secretos en artefactos del runtime;
4. `credit_decision=false` y `lender_commitment=false`;
5. `bank_submission_authorized=false`;
6. `external_communication=false`;
7. `crm_write_authorized=false` y `provider_write_authorized=false`;
8. consumo semántico real de los ocho motores;
9. OLD vs NEW;
10. tribunal independiente;
11. feedback LRN;
12. observabilidad + auditoría + FinOps 0 EUR;
13. backup + rollback + rebuild;
14. idempotencia/restart;
15. exact-head CI + Governed Main + RSI antes de merge;
16. replay automático en `main` antes de certificar.

## Autoridad
- `prod_authorized=false`
- `prod_write_authorized=false`
- `db_mutation_authorized=false`
- `crm_write_authorized=false`
- `provider_write_authorized=false`
- `bank_submission_authorized=false`
- `credit_decision_authorized=false`
- `external_communication_authorized=false`
- `spend_authorized=false`
- `trading_access=false`
- `external_code_execution=false`
- coste adicional: `0 EUR`

## Skills
Las skills aplicables a hipotecas/banca/documentos/conocimiento/comunicación no se consideran terminadas por existir en catálogo. Deben quedar posteriormente enlazadas mediante el Skill Capability Router a estos motores, con consumo verificable en PREPROD y tests de que la skill mejora o amplía una capacidad existente sin saltarse Gateway/políticas. Este runbook no declara todavía ese cierre global de skills.

## Rollback
El bloque es aditivo. Si falla el gate, cerrar/revertir el candidato. No sustituir App, CRM, tablas Supabase, conocimiento Notion ni contratos existentes. La promoción a autoridad real bancaria queda fuera de este bloque.
