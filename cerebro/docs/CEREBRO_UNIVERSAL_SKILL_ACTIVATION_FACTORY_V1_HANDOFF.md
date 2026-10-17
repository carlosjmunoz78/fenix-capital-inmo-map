# CEREBRO OS · Universal Skill Activation Factory V1 · HANDOFF TOTAL

Fecha: 2026-10-17
Repositorio: `carlosjmunoz78/fenix-capital-inmo-map`
Rama de trabajo: `cerebro/universal-skill-activation-factory-v1-20261017`
PR: `#784`
Último HEAD de código certificado: `48feedf2e932d38ce74bf5c9663e53ed69a10d98`
Entorno: `PREPROD`
Coste adicional: `0 €`
PROD write: `NO`
Trading: `AISLADO / NO ACCESS`

## MISIÓN

Convertir FACT-001 en una fábrica de activación real: una skill, repositorio o URL pública entra una sola vez y CEREBRO la descubre, normaliza, clasifica, conecta a todos los motores pertinentes, genera/reutiliza adapters, ejecuta OLD vs NEW, QA/EVA/Tribunal, LRN/OBSERV/FINOPS, rollback/rebuild y termina de forma autónoma en `FULL_SAFE_PREPROD` o en un bloqueo terminal veraz.

No cuenta como integrada por estar descargada, catalogada, normalizada o documentada. Solo cuenta cuando los consumidores relevantes usan funcionalmente su salida y la evidencia física/semántica requerida es GREEN.

## ESTADO REAL

### HECHO
- FACT-001 y Registry canónico de 179 motores preservados.
- Safe Engineering Profile reutilizado por FACT-001, sin crear un motor Ingeniero duplicado.
- Planner genérico `skill/repo -> dominios -> motores`.
- Contratos semánticos reutilizables por dominio.
- Factory de adapters evidence-grounded.
- Binding real genérico, OLD vs NEW, QA/EVA/JDG, LRN, OBSERV, FINOPS, backup/rollback/rebuild e idempotencia.
- Cola durable y batch; una candidata bloqueada no congela las demás.
- Catálogo legacy 184 reconciliado sin afirmar falsamente que las 184 están activas.
- Repo no preparado previamente -> `FULL_SAFE_PREPROD` sin código por candidate-id.
- URL GitHub pública -> ingestión read-only pinned -> `FULL_SAFE_PREPROD`.
- B10 source queue / `repository_dispatch`: el chat deja de ser conductor obligatorio.
- B11 inferencia legacy corregida; no quedan los dos rojos anteriores.
- Especialista `MATH` V1 determinista: estadística, valor esperado/probabilidad, optimización acotada con restricciones y forecast lineal. Reutiliza `OPT-001`, `SIM-001`, `DATA-001`, `FINOPS-001`, `EXP-001`, `QA-001`; no crea motor nuevo.
- Auto Engineering ya tiene providers genéricos de familia para `finance-accounting-payments` y `math-optimization-simulation`.

### EVIDENCIA EXACT-HEAD EN `48feedf...`
GREEN:
- Universal Skill Activation Factory V1 #63
- Universal Skill Activation Scale184 V1 #16
- Universal Skill Activation Scale184 V2 #12
- Universal Skill Repository E2E V1 #12
- Universal Skill GitHub Live E2E V1 #10
- Skill Supply Chain Gate #817
- Governed Main Integration V0 #633
- RSI Promotion Readiness Shadow V0 #799

### PARCIAL
- Auto Engineering universal: arquitectura real, pero los providers de familia todavía no cubren todos los dominios.
- Especialistas transversales pendientes de generalización: SYSTEMS, DATA y SECURITY; ARQUITECTO/CODE/QA/INTEGRATOR ya se apoyan en piezas reales pero deben quedar registrados como capa técnica única y coherente.
- Las 184 skills siguen teniendo estados reales distintos; no convertir referencias/HOLD/bloqueos físicos en falsos FULL.

## ALIAS TÉCNICOS PARA CARLOS

- `ARQUITECTO`: decide cómo encaja el cambio sin romper nada.
- `CODE`: programa, corrige, crea adapters y tests.
- `SYSTEMS`: runtime, Windows/Linux, Docker, red, CI/CD, procesos.
- `MATH`: matemáticas, estadística, probabilidad, optimización, simulación/forecast.
- `DATA`: SQL, schemas, ETL, Supabase/Postgres, calidad y migraciones seguras.
- `SECURITY`: permisos, IAM/RLS, secretos, amenazas, hardening.
- `QA`: demuestra que funciona y no regresa.
- `INTEGRATOR`: conecta skill/repositorio a motores y contratos.
- `TECH SCOUT`: descubre tecnologías/repositorios; ya existen superficies reales de scout.
- `PERFORMANCE`: optimización de latencia/CPU/RAM/coste; posterior.

Son perfiles lógicos transversales, no diez servidores ni diez modelos. Pueden ejecutar muchos jobs concurrentes mediante runtime/workers compartidos.

## SIGUIENTE BLOQUE EXACTO

`B13 · TECHNICAL SPECIALISTS GENERALIZATION`
1. Auditar y reutilizar primero lo existente para SYSTEMS / DATA / SECURITY.
2. Crear perfil transversal solo donde haya gap real; no inventar engine-id.
3. Añadir providers genéricos de familia a Auto Engineering para que una nueva skill de esos dominios pueda cerrar `ENGINEERING_TASK_REQUIRED` sin código por candidata.
4. Ejecutar prueba ciega y exact-head CI.
5. Solo después ampliar PERFORMANCE u otras familias.

## REGLAS DE COMUNICACIÓN CON CARLOS

Carlos no quiere una narración continua. Trabajar de forma autónoma y no pedir confirmación para pasos ordinarios seguros dentro del alcance aprobado.

Comunicar únicamente hitos relevantes, de forma MUY BREVE y con alias comprensibles. Formato preferido:

`Hito GREEN: [qué hemos conseguido en palabras claras]; sigo con [siguiente bloque].`

No informar cada dos minutos. No enviar relleno, logs, listas técnicas largas ni preguntar “¿procedo?” cuando el siguiente paso ya está autorizado. Si aparece un rojo ordinario, diagnosticar, corregir y continuar. Interrumpir a Carlos solo por uno de los ocho `HUMAN_REQUIRED` canónicos o por una decisión estratégica realmente nueva.

Cuando Carlos pregunte estado, responder primero en lenguaje claro y después, solo si aporta valor, el detalle técnico. Usar alias (`MATH`, `CODE`, `SYSTEMS`, etc.).

## HUMAN_REQUIRED EXACTO
`LEGAL_REQUIRED`, `SIGNATURE_REQUIRED`, `LOW_CONFIDENCE`, `HIGH_RISK`, `POLICY_CONFLICT`, `SECURITY_INCIDENT`, `MONEY_LIMIT`, `CUSTOMER_HUMAN_REQUEST`.

## PROMPT EXACTO PARA EL SIGUIENTE CHAT

```text
CONTINÚA CEREBRO OS · UNIVERSAL SKILL ACTIVATION FACTORY SIN RECONSTRUIR ESTADO POR MEMORIA.

Lee primero:
1. cerebro/docs/CEREBRO_UNIVERSAL_SKILL_ACTIVATION_FACTORY_V1_HANDOFF.md
2. cerebro/docs/CEREBRO_UNIVERSAL_SKILL_ACTIVATION_FACTORY_V1_MASTER_2026-10-17.md
3. cerebro/docs/CEREBRO_UNIVERSAL_SKILL_ACTIVATION_FACTORY_V1_RUNBOOK_2026-10-17.md
4. cerebro/registry/universal-skill-activation-factory-v1.state.json

Repositorio: carlosjmunoz78/fenix-capital-inmo-map
Rama: cerebro/universal-skill-activation-factory-v1-20261017
PR: #784

Verifica únicamente la evidencia viva mínima: HEAD de rama, estado de PR y CI exact-head. No repitas auditorías cerradas si la evidencia no ha cambiado. Entra directamente en `next_block` del state.

OBJETIVO: que una skill/repo/URL pase automáticamente a integración funcional real en todos los motores pertinentes, con contratos, adapters, pruebas, OLD vs NEW, QA/EVA/JDG, LRN/OBSERV/FINOPS, rollback/rebuild y estado veraz FULL_SAFE_PREPROD/ABSORBED/REJECTED/BLOCKED_EXTERNAL/HUMAN_REQUIRED. Nunca cuentes catalogación como integración.

Mantén CONSERVAR -> ENTENDER -> ENVOLVER -> PROBAR -> MEJORAR -> MIGRAR. No tocar PROD, no auto-merge, coste adicional 0 €, Trading aislado. No crear motor nuevo si una capacidad transversal puede reutilizar motores existentes.

COMUNICACIÓN CON CARLOS: trabaja sin parar y no pidas confirmaciones ordinarias. Comunica solo hitos importantes, muy escuetos, con alias sencillos, preferentemente una frase: “Hito GREEN: X; sigo con Y.” No informes cada pocos minutos. Si un test ordinario falla, corrígelo y continúa. Solo interrumpe por HUMAN_REQUIRED canónico real o una decisión estratégica nueva.

Antes de saturar el chat, actualiza estos cuatro documentos/estado con HEAD, PR, CI, HECHO/PARCIAL/POR AUDITAR, next_block y un nuevo prompt exacto de continuidad.
```
