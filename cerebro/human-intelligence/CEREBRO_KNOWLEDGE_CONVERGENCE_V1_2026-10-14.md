# CEREBRO · Knowledge Convergence V1

**Fecha:** 2026-10-14  
**Estado de este cambio:** IMPLEMENTACIÓN AISLADA / PENDIENTE DE CI Y PREPROD  
**Ámbito:** conocimiento + memoria + aprendizaje conversacional para Console, Telegram y App Fénix/Ana, texto y voz.

## 1. Objetivo

Cerrar el hueco entre superficies conversacionales multicanal, conocimiento/contexto/memoria existentes y aprendizaje continuo `LRN-001` con OLD vs NEW, tribunal, PREPROD y rollback.

Regla: **ningún canal posee una copia privada del conocimiento**. Console, Telegram y Ana son superficies. La autoridad del conocimiento sigue en los owners y backends canónicos ya existentes.

## 2. Baseline vivo recuperado

Baseline Git de esta misión: `main@8fcc1926a8e3c012193ffdb4c14d58b7c863cdc6`.

Se conservan:

- seis superficies en `cerebro/multichannel/channel-registry.v1.json`;
- `cerebro-console-gateway-v0`, `cerebro-telegram-gateway-v0`, `cerebro-telegram-voice-v1` y `fenix-app-gateway`;
- `fenix_prod.cerebro_user_preferences` y `fenix_prod.cerebro_conversation_memory`;
- `cerebro/runtime/universal-learning-ingress.mjs`;
- el subscriber PREPROD existente `cerebro/registry/rsi-learning-subscribers.v0.json`, que ya acepta `METRIC_OBSERVATION`, `HUMAN_CORRECTION` y `TRIBUNAL_DECISION`;
- `LRN-001` y su pipeline durable PREPROD;
- Human Intelligence V1 con 60 situaciones Fénix × 4 variantes = 240 pares de evaluación OLD vs NEW;
- Trading aislado, 0 € adicional y sin autoridad nueva de escritura PROD.

No se reconstruye ninguno.

## 3. Implementación V1

### Mapa canónico

`cerebro/human-intelligence/knowledge/knowledge-surface-map.v1.json`

Clases:

- `CANONICAL_STRUCTURAL` → `KNW-001 / RAG-001 / PRV-001 / UPD-001`;
- `LIVE_OPERATIONAL` → backends vivos existentes;
- `EPISODIC_MEMORY` → memoria/preferencias existentes;
- `LEARNING_CANDIDATE` → evidencia real pendiente de validación;
- `SYNTHETIC_EVALUATION` → conversación ficticia/sintética LAB/PREPROD.

No crea tablas ni duplica Notion, Supabase, App, CRM o conocimiento.

### Aprendizaje de conversaciones reales

`cerebro/human-intelligence/integration/conversation-learning-convergence-v1.mjs`

Produce únicamente señales derivadas seguras:

- `METRIC_OBSERVATION`;
- `HUMAN_CORRECTION` si existe corrección humana explícita.

Bloquea de forma fail-closed contenido bruto como `message`, `text`, `transcript`, prompt/completion, audio y equivalentes. El ledger de aprendizaje no recibe una copia de la conversación.

### Aprendizaje sintético/ficticio

Produce:

- `METRIC_OBSERVATION` para el episodio evaluado;
- `TRIBUNAL_DECISION` solo con `hard_gates_green=true` y `NEW_BETTER`.

No se trata como hecho real y no puede escribir reglas canónicas directamente.

### Seis superficies

- Console texto/voz → `FULL_OWNER`;
- Telegram texto/voz → `FULL_OWNER`;
- App Fénix/Ana texto/voz → `FENIX_OPERATIONAL`.

Se preservan RBAC, HUMAN_REQUIRED, límites de secretos y aislamiento de Trading.

## 4. Flujo objetivo

Real:

`canal -> CHAT/VOICE -> CTX/permisos -> conocimiento/RAG/memoria -> respuesta/acción -> resultado observable -> señal derivada segura -> Universal Learning Ingress -> LRN-001 -> candidato -> OLD vs NEW -> tribunal -> PREPROD -> mantener/rollback -> UPD/KNW/RAG`

Sintético:

`scenario -> Synthetic HumanProfile -> conversación -> EVA/JDG -> replay OLD vs NEW -> REG -> evidencia -> Universal Learning Ingress -> LRN-001 -> PREPROD candidate`

## 5. No hace

- no sustituye gateways;
- no cambia acciones;
- no añade permisos PROD;
- no toca Trading;
- no expone secretos;
- no crea motor ni memoria paralela;
- no modifica el subscriber LRN existente porque ya soporta las familias necesarias;
- no mete training pesado en Supabase;
- no declara E2E físico de micrófono/interfaz sin prueba real;
- no promociona reglas por una conversación.

## 6. Tests

`cerebro/tests/human-intelligence-conversation-learning-convergence-v1.test.mjs`

Verifica mapa común, seis canales, corrección explícita, bloqueo de contenido bruto, evidencia sintética, normalización PREPROD, reutilización del subscriber LRN existente y enlace desde Channel Registry.

Además deben seguir verdes las regresiones Human Intelligence, multicanal y Universal Learning existentes.

## 7. Gate y rollback

`rama aislada -> tests -> CI -> PREPROD -> OLD vs NEW -> tribunal -> rollback -> integración gobernada`.

Antes de integrar: cerrar PR. Después: revertir el merge exacto. Todo es aditivo/versionado.

## 8. Cierre físico pendiente

No declarar 100 % E2E hasta probar autenticadamente:

- Console texto;
- Console voz/micrófono;
- Telegram texto;
- Telegram voz;
- Ana texto en App Fénix;
- Ana voz/micrófono en App Fénix;
- contexto/memoria/conocimiento coherentes en los seis;
- señales reales derivadas a LRN-001 sin contenido bruto;
- evaluación sintética reproducible;
- OLD vs NEW + tribunal + PREPROD + rollback;
- cero regresiones de permisos, acciones, secretos, Trading y coste.

Hasta entonces: **PARCIAL / CONTRATO E IMPLEMENTACIÓN**, no `CONFIRMED_OPERATIONAL` end-to-end.
