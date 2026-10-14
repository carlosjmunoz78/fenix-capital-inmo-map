# CEREBRO · Knowledge Convergence V1

**Fecha:** 2026-10-14  
**Estado de este cambio:** CANDIDATO LIMPIO DESDE MAIN / PENDIENTE DE CI  
**Ámbito:** conocimiento + memoria + aprendizaje conversacional para Console, Telegram y App Fénix/Ana, texto y voz.

## 1. Objetivo

Cerrar el hueco entre superficies conversacionales multicanal, conocimiento/contexto/memoria existentes y aprendizaje continuo `LRN-001`, sin crear un cerebro paralelo ni duplicar fuentes de verdad.

Regla: **ningún canal posee una copia privada del conocimiento**. Console, Telegram y Ana son superficies. La autoridad factual continúa en los owners y backends canónicos ya existentes.

## 2. Baseline vivo

Este candidato parte del `main` posterior a FASE 15 (`bde0e91f5e3fca2939c826211dc94b0f737ed49c`). Reemplaza, no acumula, el antiguo candidato #654 que había quedado 84 commits por detrás de main.

Se conservan:

- las seis superficies ya registradas en `cerebro/multichannel/channel-registry.v1.json`;
- gateways y backends existentes;
- preferencias/memoria existentes;
- `cerebro/runtime/universal-learning-ingress.mjs`;
- subscriber PREPROD existente de `LRN-001`;
- Human Intelligence / OLD vs NEW / tribunal existentes;
- Trading aislado, 0 € adicional y sin autoridad nueva de escritura PROD.

No se reconstruye ninguno.

## 3. Implementación

### Mapa común

`cerebro/human-intelligence/knowledge/knowledge-surface-map.v1.json` describe las seis superficies Fénix actuales y conserva las autoridades de `KNW-001`, `RAG-001`, `PRV-001`, `UPD-001`, `CTX-001`, `CHAT-001`, `VOICE-001`, `LRN-001`, `TRN-001`, `SIM-001`, `EVA-001`, `JDG-001` y `REG-001`.

### Aprendizaje real

`conversation-learning-convergence-v1.mjs` produce únicamente señales derivadas seguras `METRIC_OBSERVATION` y, cuando existe una corrección humana explícita, `HUMAN_CORRECTION`.

Bloquea contenido bruto (`message`, `text`, `transcript`, prompt/completion, audio y equivalentes). El ledger de aprendizaje no recibe una copia de la conversación.

### Aprendizaje sintético

Produce `METRIC_OBSERVATION` y solo produce `TRIBUNAL_DECISION` con `hard_gates_green=true` + `NEW_BETTER`. Nunca convierte evidencia sintética en verdad PROD.

### Multiempresa

El runtime no hardcodea `fenix`: exige `company_id` en cada observación, incluye el tenant en la identidad/hash y rechaza un batch que mezcle empresas. El mapa sigue declarando correctamente que las seis superficies físicas auditadas en este bloque son las de Fénix; añadir una empresa nueva requiere su onboarding/registry/context/knowledge/subscriber gobernado, no copiar datos Fénix.

## 4. Flujo

Real:

`canal -> CHAT/VOICE -> CTX/permisos -> conocimiento/RAG/memoria -> resultado observable -> señal derivada segura -> Universal Learning Ingress -> LRN-001 -> OLD vs NEW -> tribunal -> PREPROD -> mantener/rollback -> UPD/KNW/RAG`

Sintético:

`scenario -> Synthetic Human -> EVA/JDG -> OLD vs NEW -> evidencia -> Universal Learning Ingress -> LRN-001 -> PREPROD candidate`

## 5. Límites

- no sustituye gateways;
- no amplía acciones o permisos;
- no escribe conocimiento canónico desde una conversación;
- no toca Trading;
- no expone secretos;
- no crea engine_id;
- no crea memoria paralela;
- no añade suscripciones;
- no declara E2E físico sin prueba real;
- no promociona reglas por una sola conversación.

## 6. Gate

El workflow dedicado exige exact-head, superficie de cambio acotada, tests de convergencia + Universal Learning + multicanal + Human Intelligence, aislamiento tenant, coste 0, no PROD-write y no Trading.

CI verde demuestra contrato/código, no demuestra micrófono ni transporte físico de los seis canales.

## 7. Rollback y rebuild

Rollback: revertir el merge de este cambio. Rebuild: regenerar mapa/runtime/tests desde los contratos actuales de Channel Registry + Universal Learning + Human Intelligence, sin tocar datos.

## 8. Cierre físico pendiente

Antes de declarar 100 % E2E deben probarse autenticadamente Console texto/voz, Telegram texto/voz y Ana texto/voz; coherencia de contexto/memoria/conocimiento; señal derivada real hacia LRN sin contenido bruto; OLD vs NEW + tribunal + rollback; y cero regresiones de permisos, secretos, Trading y coste.

Hasta esa prueba física: **PARCIAL / CONTRATO E IMPLEMENTACIÓN**, no `CONFIRMED_OPERATIONAL` end-to-end.
