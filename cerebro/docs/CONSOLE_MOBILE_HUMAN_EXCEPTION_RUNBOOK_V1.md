# Runbook · CEREBRO Console Mobile / Human Exception V1

## Flujo de lectura

`QUERY → AUTH/CTX → KNOWLEDGE/ENGINE READ → ANSWER → AUDIT`

Sin confirmación si no hay efectos secundarios.

## Flujo de acción

`ACTION_REQUEST → EXACT_PROPOSAL → CLARIFY/EXPLAIN/REVISE* → EXPLICIT_YES → POLICY → EXECUTOR → VERIFY → AUDIT → RESULT`

- Preguntas intermedias no consumen ni ejecutan la propuesta.
- Cambio de alcance invalida la propuesta previa.
- Confirmación válida solo para el `proposal_hash` vigente.
- Idempotency key obligatoria antes de ejecutar.

## Flujo de excepción

`EXECUTOR/POLICY → HUMAN_REQUIRED → EXPLAIN → RESOLUTION_UI/LINK → OWNER_DECISION/EVIDENCE → RESUME → VERIFY → AUDIT`

No pedir al usuario que busque manualmente una pantalla si CEREBRO conoce un enlace profundo o puede generarlo.

## Gate de implementación

Antes de conectar un ejecutor real:
1. inventario y dependencia;
2. contrato actual;
3. backup/rollback;
4. PREPROD;
5. test de propuesta/confirmación;
6. test de replay/idempotencia;
7. test de excepción humana;
8. OLD vs NEW si sustituye flujo existente;
9. promoción gradual;
10. evidencia física/E2E.

## Casos mínimos de aceptación

- «¿Qué está haciendo SEO?» responde sin activar nada.
- «Prepara Valencia en SEO» genera propuesta, no ejecución.
- «¿En qué consiste?» explica y conserva propuesta.
- «Sí» confirma la propuesta vigente una sola vez.
- «No, solo Valencia capital» invalida la propuesta y genera otra.
- Firma requerida devuelve enlace/acción exacta si el proveedor lo permite.
- Pago requerido devuelve importe y enlace/autorización si existe.
- Riesgo/policy conflict se explica antes de decisión.
- Un executor no enlazado nunca finge éxito.
