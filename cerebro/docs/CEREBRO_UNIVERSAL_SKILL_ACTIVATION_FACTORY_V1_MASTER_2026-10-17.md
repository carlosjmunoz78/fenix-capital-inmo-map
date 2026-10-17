# CEREBRO OS · UNIVERSAL SKILL ACTIVATION FACTORY V1 · MASTER

## Objetivo operativo

La Factory debe convertir skill/repositorio/URL en capacidad funcional de CEREBRO sin integración artesanal por candidata.

Flujo objetivo:
`SOURCE -> PROVENANCE/LICENSE -> CAPABILITY -> DOMAIN -> ENGINES -> CONTRACT -> ADAPTER -> REAL BINDING -> OLD/NEW -> QA/EVA/JDG -> LRN/OBSERV/FINOPS -> BACKUP/ROLLBACK/REBUILD -> FULL_SAFE_PREPROD | TERMINAL TRUTHFUL STATE`.

## Definición estricta de integrada

No son integración: descarga, inventario, normalización, manifest, wrapper plan-only, scaffold, binding declarado o test aislado.

Una candidata es `FULL_SAFE_PREPROD` solo si todos los bindings pertinentes tienen consumo semántico real dentro del alcance PREPROD, mejora/no-regresión demostrada, Tribunal independiente, learning feedback, observabilidad/FinOps, rollback/rebuild e idempotencia. Si exige browser/device/media físicos, la evidencia física correspondiente es obligatoria.

Estados terminales/operativos permitidos:
- `FULL_SAFE_PREPROD`
- `ABSORBED`
- `REJECTED`
- `BLOCKED_EXTERNAL`
- `HUMAN_REQUIRED`
- `ENGINEERING_TASK_REQUIRED` (no terminal final; deuda de ingeniería)
- `PARTIAL` (evidencia insuficiente; nunca contar como full)

## Arquitectura

FACT-001 dirige la integración y reutiliza runtime compartido. No se crea un servidor/agente por skill ni por profesión.

La capa técnica transversal usa perfiles lógicos:
`ARQUITECTO | CODE | SYSTEMS | MATH | DATA | SECURITY | QA | INTEGRATOR`.
Opcionales posteriores: `TECH SCOUT | PERFORMANCE`.

Los perfiles pueden tener múltiples jobs concurrentes y usan motores canónicos existentes.

## Estado certificado 2026-10-17

Rama: `cerebro/universal-skill-activation-factory-v1-20261017`
PR: `#784`
Código certificado: `48feedf2e932d38ce74bf5c9663e53ed69a10d98`

GREEN exact-head: Factory V1 #63, Scale184 V1 #16, Scale184 V2 #12, Repository E2E #12, GitHub Live E2E #10, Supply Chain #817, Governed Main Integration #633, RSI Shadow #799.

## HECHO

- Safe Engineering consumido por FACT-001.
- Routing genérico dominio->motores canónicos.
- Contratos semánticos por dominio.
- Adapter Factory evidence-grounded.
- Real Binding genérico.
- OLD vs NEW, QA/EVA/JDG, LRN/OBSERV/FINOPS, backup/rollback/rebuild.
- Durable batch + source queue/event trigger.
- 184 reconciliadas con resultados veraces, no falso “184 activas”.
- Repo desconocido y URL pública GitHub demostrados E2E.
- MATH V1 determinista y family provider conectado a Factory.

## MATH V1

No crea engine nuevo. Reutiliza `OPT-001` y `SIM-001` como principales y `DATA-001`, `FINOPS-001`, `EXP-001`, `QA-001` como consumidores.

Capacidades iniciales:
- estadística descriptiva;
- valor esperado / probabilidad discreta;
- optimización acotada sobre candidatos con restricciones;
- forecast lineal determinista.

Invariantes: PREPROD only, finite inputs/results, bounded resources, deterministic replay, calculation trace, zero additional cost, no external code, no payment/spend authority, no Trading.

## PARCIAL

El cuello de botella restante ya no es el planner ni el binding core: es ampliar `Auto Engineering` a familias adicionales. Actualmente existen family providers reales para `finance-accounting-payments` y `math-optimization-simulation`.

## next_block

`B13_TECHNICAL_SPECIALISTS_GENERALIZATION`

Orden:
1. SYSTEMS: auditar runtime/CI/OS/infra ya existente y envolverlo.
2. DATA: reutilizar DATA/MIG/DBOFF/STOROFF/API/CRM + reglas RLS/rollback existentes.
3. SECURITY: reutilizar SEC/IAM/DPO/RED y fail-closed authority.
4. Registrar capa técnica única y tests de alias/capability, sin engine-id nuevo.
5. Añadir providers de familia a Auto Engineering solo con evidencia consumida, nunca sintetizada desde el contrato.
6. Prueba ciega + full regression + exact-head workflows.

## Política

Siempre `CONSERVAR -> ENTENDER -> ENVOLVER -> PROBAR -> MEJORAR -> MIGRAR`.
Coste adicional 0 € por defecto. No PROD write, no auto-merge, no Trading, no customer-data en tests. Los ocho HUMAN_REQUIRED permanecen exactos.
