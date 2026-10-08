# RSI-RECOVERY-009 · SUPERVISOR BOUNDED RECOVERY

Fecha: 2026-10-08
Estado: PARCIAL · CORE CONTRACT + DURABLE LEDGER IMPLEMENTADOS
Entorno: PREPROD exacto
Coste adicional: 0 EUR
PROD authority: false
Trading access: false

## Objetivo

Formalizar el patrón:

`FALLO → CLASIFICAR → PLAN SEGURO → INTENTO ACOTADO → TEST → RESOLVER / ROLLBACK / CAMBIO DE ESTRATEGIA → LEARNING`

sin convertir el supervisor en una autoridad de promoción ni en un agente capaz de ejecutar acciones arbitrarias.

## Implementación

`cerebro/runtime/bounded-recovery-supervisor.mjs`

- ledger durable mediante `AtomicV8Journal`;
- contexto exacto PREPROD;
- máximo 3 intentos;
- acciones permitidas cerradas:
  - `REFETCH_REMOTE_EVIDENCE`
  - `REOPEN_LOCAL_STATE`
  - `REBUILD_EPHEMERAL_WORKSPACE`
  - `RETRY_TRANSIENT_OPERATION`
  - `ROLLBACK_LAST_CANDIDATE`
- test GREEN obligatorio antes de marcar recuperación como resuelta;
- regresión detectada fuerza `ROLLBACK_LAST_CANDIDATE` como siguiente estrategia cuando todavía queda presupuesto de intentos;
- al agotar 3 intentos sin evidencia suficiente pasa a `HUMAN_REQUIRED=LOW_CONFIDENCE`;
- incidentes de seguridad, límites económicos, conflictos de política, riesgo alto, legal, firma o petición de humano pasan directamente al código canónico de `HUMAN_REQUIRED` correspondiente;
- cada outcome genera evidencia `RECOVERY_OUTCOME` apta para el learning pipeline;
- nunca concede PROD, PROD-write, Trading ni presupuesto adicional.

## Anti-loop

No puede repetir indefinidamente la misma familia de acción. Dos acciones iguales consecutivas fuerzan cambio de estrategia en el tercer plan. Si no existe alternativa segura o ya se agotaron tres intentos, el supervisor deja de ejecutar y mantiene el caso en excepción/hold.

## Lo que NO hace

- no modifica código por su cuenta;
- no ejecuta shell arbitrario;
- no borra ramas ni datos;
- no eleva permisos;
- no modifica gates;
- no se auto-promueve;
- no marca un fix como correcto sin test GREEN;
- no toca PROD.

## Estado de wiring

El contrato y la persistencia del supervisor están implementados. El wiring universal de cada motor a adaptadores de acción seguros queda incremental: un motor solo podrá usar una acción cuando exista un adapter explícito, testeado y con rollback. Hasta entonces el supervisor planifica/retiene, pero no inventa una reparación.

## Próximo bloque

`RSI-RECOVERY-010 · PROMOTION READINESS`: reconciliar exact HEAD con gates CURRENT de PREPROD, review/tribunal, rollback/rebuild, y separar qué puede promoverse a `main` de qué debe continuar HOLD hasta tener evidencia real post-merge.
