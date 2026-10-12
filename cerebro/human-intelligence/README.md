# CEREBRO Human Intelligence System V1

> Estado: **DEFINIDO / LAB-PREPROD ONLY**. Esta carpeta es aditiva. No crea un nuevo engine_id, no sustituye App/CRM/Supabase/Notion/Training/SEO/WordPress y no autoriza PROD.

## Propósito

Convertir la conversación humana de CEREBRO en una capacidad medible y mejorable: comprender contexto, hablar de forma natural, preguntar mejor, gestionar desacuerdo y fricción, aprender de correcciones y practicar en LAB mediante simulación controlada, sin auto-reforzar errores ni convertir una sola edición humana en regla universal.

El sistema es **compuesto**. Reutiliza owners canónicos existentes:

- `CHAT-001` / `CTX-001`: entrada y contexto.
- `KNW-001` / `PRV-001` / `RAG-001` / `UPD-001`: conocimiento y procedencia.
- `COM-001` / `CX-001` / `VOICE-001`: interacción por canal.
- `LRN-001` / `TRN-001`: aprendizaje y training.
- `SIM-001`: simulación/Human Simulator/Conversation Gym.
- `EVA-001` / `JDG-001` / `REG-001`: evaluación, tribunal y no regresión.
- `RED-001`: adversarial conversacional.
- `POL-001` / `HEX-001`: política y Human Exception.
- `QA-001` / `SELF-001` / `SUP-001`: QA, planes reversibles y supervisión.

FACT-001 solo debe proponer un engine_id nuevo si una auditoría posterior demuestra una responsabilidad sin owner real.

## Flujo real

`HUMAN -> CHAT-001 -> CTX/permissions -> knowledge router -> human policy -> ResponsePlan -> text/voice/action -> observable outcome -> HumanSignal -> Universal Learning Ingress -> LRN-001`

Una acción material sigue pasando por `ACTGW-001`, política, permisos, idempotencia y HUMAN_REQUIRED cuando corresponda.

## Flujo LAB

`scenario -> synthetic HumanProfile -> candidate actor -> conversation -> EVA/JDG -> exact replay OLD vs NEW -> REG -> learning candidate -> PREPROD candidate`

No es conversación infinita de CEREBRO consigo mismo. El simulador conserva estado privado que el actor no puede leer; los jueces evalúan con evidencia independiente y el mismo caso se reproduce contra OLD.

## Reutilización física obligatoria

Ya existen:

- `fenix_prod.cerebro_user_preferences`: preferencias explícitas pequeñas, versionadas y supersedibles.
- `fenix_prod.cerebro_conversation_memory`: memoria episódica/candidata/verificada, con búsqueda, olvido/desactivación y supersesión.
- chat/conversation persistence existente.
- Universal Learning Ingress con señales `HUMAN_CORRECTION`, `TRIBUNAL_DECISION`, métricas, errores y resultados.

Por tanto, V1 **no** crea tablas `human_intelligence_*`.

Simulación masiva, replays, datasets sintéticos, evaluaciones y logs pesados deben vivir fuera de Supabase por defecto.

## Contratos V1

`contracts/human-interaction-contracts.v1.json` define siete objetos lógicos:

1. `ConversationEnvelope`
2. `ConversationState`
3. `HumanSignal`
4. `ResponsePlan`
5. `LearningEvent`
6. `SimulationEpisode`
7. `ConversationEvaluation`

Los contratos lógicos no obligan a persistir cada objeto.

## Baseline OLD

`baseline/old-baseline.v1.json` congela el primer contrato de comparación sobre `main` SHA `3b6b3f45fb3eea624b1834d0c592c6b6f6550e1e`.

El corpus inicial usa como fuente canónica la Biblioteca Notion de **60 situaciones humanas Fénix**. Cada caso tendrá cuatro variantes reproducibles, objetivo inicial 240 episodios OLD:

- normal/cooperativa;
- ambigua/incompleta;
- fricción/alta carga;
- adversarial/contradictoria.

Los umbrales estadísticos de mejora no se inventan antes de medir la distribución OLD.

## Hard gates

Todo NEW debe mantener 100 % en:

`TRUTH`, `AUTHORITY`, `CONTEXT`, `PERMISSION`, `ACTION`, `HUMAN_REQUIRED`, `PRIVACY`, `NO_HIDDEN_LEAK`, `ETHICS`, `TRACEABILITY`.

Un fallo crítico rechaza la candidatura aunque el lenguaje sea más agradable.

## Calidad humana

Se puntúan conductas observables, no diagnósticos psicológicos: escucha, claridad, relevancia, empatía sustentada, timing de preguntas, adaptación de brevedad, continuidad contextual, calibración de incertidumbre, reparación del desacuerdo, naturalidad, siguiente paso y cierre de bucle.

## Señales humanas

`HumanSignal` representa observables como corrección, repetición, contradicción, interrupción, no respuesta, aceptación/rechazo o petición explícita de humano.

Ejemplo válido: “la misma duda se repitió tres veces”.
Ejemplo inválido sin evidencia: “el usuario está enfadado al 87 %”.

No toda señal se aprende. Solo la evidencia útil se adapta al ingress canónico.

## Límites

HUMAN_REQUIRED se limita a:

- `LEGAL_REQUIRED`
- `SIGNATURE_REQUIRED`
- `LOW_CONFIDENCE`
- `HIGH_RISK`
- `POLICY_CONFLICT`
- `SECURITY_INCIDENT`
- `MONEY_LIMIT`
- `CUSTOMER_HUMAN_REQUEST`

Además:

- `prod_write_authorized=false`
- `prod_promotion_authorized=false`
- `trading_access=false`
- customer data/secrets prohibidos en LAB
- coste adicional objetivo `0 €`

## Secuencia

`F0 baseline/contracts -> F1 science/source map -> F2 Knowledge Foundry -> F3 Human World Model -> F4 MicroSkills -> F5 Human Simulator -> F6 Conversation Gym -> F7 EVA/JDG/REG -> F8 Red Team -> F9 continuous improvement -> F10 text PREPROD -> F11 voice -> F12 gradual promotion`

Nada salta directamente de LAB a PROD.

## Rebuild

Esta capa inicial se reconstruye desde los JSON versionados de esta carpeta y las fuentes canónicas ya existentes. No depende de una nueva suscripción ni de un proveedor de modelo concreto.
