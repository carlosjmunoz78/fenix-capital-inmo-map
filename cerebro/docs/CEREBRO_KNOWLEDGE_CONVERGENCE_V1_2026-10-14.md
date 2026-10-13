# CEREBRO · Knowledge Convergence V1

**Fecha:** 2026-10-14  
**Estado de este cambio:** IMPLEMENTACIÓN AISLADA / PENDIENTE DE CI Y PREPROD  
**Ámbito:** conocimiento + memoria + aprendizaje conversacional para Console, Telegram y App Fénix/Ana, texto y voz.

## 1. Objetivo

Cerrar el hueco entre tres piezas que ya existían por separado:

1. superficies conversacionales multicanal;
2. conocimiento/contexto/memoria existentes;
3. aprendizaje continuo `LRN-001` con OLD vs NEW, tribunal, PREPROD y rollback.

La regla de arquitectura queda explícita: **ningún canal posee una copia privada del conocimiento**. Console, Telegram y Ana son superficies. La autoridad del conocimiento sigue en los owners y backends canónicos ya existentes.

## 2. Estado vivo recuperado antes de cambiar nada

Baseline Git de esta misión: `main@8fcc1926a8e3c012193ffdb4c14d58b7c863cdc6`.

Ya existían y se conservan:

- `cerebro/multichannel/channel-registry.v1.json` con seis superficies y perfiles `FULL_OWNER` / `FENIX_OPERATIONAL`;
- `cerebro-console-gateway-v0`, `cerebro-telegram-gateway-v0`, `cerebro-telegram-voice-v1` y `fenix-app-gateway`;
- `fenix_prod.cerebro_user_preferences` y `fenix_prod.cerebro_conversation_memory` como memoria existente;
- `cerebro/runtime/universal-learning-ingress.mjs`;
- `LRN-001` confirmado operativo en PREPROD mediante pipeline hostless y durable;
- Human Intelligence V1 con 60 situaciones Fénix × 4 variantes = 240 pares de evaluación OLD vs NEW;
- Trading aislado, coste adicional objetivo 0 € y sin autorización nueva de escritura PROD.

No se reconstruye ninguno de esos componentes.

## 3. Qué añade V1

### 3.1 Mapa canónico de conocimiento

`cerebro/registry/knowledge-surface-map.v1.json`

Define cinco clases lógicas:

- `CANONICAL_STRUCTURAL` → `KNW-001 / RAG-001 / PRV-001 / UPD-001`;
- `LIVE_OPERATIONAL` → backends vivos existentes;
- `EPISODIC_MEMORY` → preferencias y memoria conversacional existentes;
- `LEARNING_CANDIDATE` → evidencia real pendiente de validación;
- `SYNTHETIC_EVALUATION` → conversación ficticia/sintética para LAB/PREPROD.

No crea tablas ni duplica Notion, Supabase, App, CRM o conocimiento existente.

### 3.2 Convergencia de aprendizaje conversacional

`cerebro/human-intelligence/integration/conversation-learning-convergence-v1.mjs`

Convierte observaciones derivadas de conversaciones reales en señales compatibles con el ingress existente:

- `METRIC_OBSERVATION` para resultados observables;
- `HUMAN_CORRECTION` cuando existe una corrección humana explícita.

**No copia texto, transcript, prompt, audio ni contenido bruto de la conversación al ledger de LRN-001.** Los campos de contenido bruto están bloqueados de forma fail-closed.

Las conversaciones sintéticas/ficticias producen:

- `METRIC_OBSERVATION` siempre que el episodio sea válido;
- `TRIBUNAL_DECISION` solo cuando `hard_gates_green=true` y el veredicto es `NEW_BETTER`.

Ni una conversación real ni una sintética puede convertirse directamente en regla canónica.

### 3.3 Misma política en las seis superficies

Se mantiene:

- Console texto/voz → `FULL_OWNER`;
- Telegram texto/voz → `FULL_OWNER`;
- App Fénix/Ana texto/voz → `FENIX_OPERATIONAL`.

`FULL_OWNER` no significa saltarse RBAC, secretos, HUMAN_REQUIRED ni aislamiento de Trading. `FENIX_OPERATIONAL` sigue denegando multiempresa, owner-private, secretos, Trading y datos privados cross-company.

## 4. Flujo final objetivo

### Conversación real

`canal -> CHAT/VOICE -> CTX/permisos -> conocimiento/RAG/memoria -> respuesta/acción -> resultado observable -> señal derivada segura -> Universal Learning Ingress -> LRN-001 -> candidato versionado -> OLD vs NEW -> tribunal -> PREPROD -> mantener/rollback -> UPD/KNW/RAG cuando proceda`

### Conversación ficticia/sintética

`scenario -> Synthetic HumanProfile -> conversación -> EVA/JDG -> replay OLD vs NEW -> REG -> evidencia -> Universal Learning Ingress -> LRN-001 -> PREPROD candidate`

La simulación nunca se trata como hecho real.

## 5. Qué NO hace este cambio

- no sustituye gateways;
- no toca rutas de acción existentes;
- no añade permisos de PROD;
- no habilita Trading;
- no expone secretos;
- no crea un engine_id nuevo;
- no crea otra memoria paralela;
- no mete entrenamiento pesado en Supabase;
- no declara E2E físico de micrófono/interfaz sin prueba real;
- no promociona reglas por una sola conversación.

## 6. Tests nuevos

`cerebro/tests/conversation-learning-convergence-v1.test.mjs` verifica:

1. mapa común para las seis superficies;
2. observación real segura desde cada canal;
3. corrección explícita → `HUMAN_CORRECTION`;
4. rechazo de contenido bruto;
5. conversación sintética acotada y fail-closed;
6. normalización real + sintética exclusivamente a `PREPROD_CANDIDATE`;
7. contrato LRN-001 actualizado;
8. Channel Registry enlazado al mismo mapa de conocimiento y convergencia.

Deben ejecutarse además las regresiones existentes de acceso por canal, Universal Learning Ingress, Human Intelligence y suite completa de CEREBRO.

## 7. Promoción

Este cambio debe seguir:

`rama aislada -> tests -> CI -> PREPROD -> OLD vs NEW -> tribunal -> rollback verificado -> integración gobernada`.

No hay big-bang ni cambio automático de autoridad.

## 8. Rollback / rebuild

El cambio es aditivo y versionado. Antes de integración, rollback = cerrar el PR. Después de integración, rollback = revertir el commit/merge que introduzca V1.

Rebuild = restaurar desde Git los dos registries, el mapa, el módulo de convergencia y sus tests; no requiere nueva suscripción ni proveedor adicional.

## 9. Criterio de cierre real

No declarar "todo el conocimiento está disponible y aprende en todos los canales al 100 %" solo porque los contratos estén en Git.

Para cerrar físicamente el bloque todavía debe existir evidencia de:

- Console texto autenticada;
- Console voz/micrófono;
- Telegram texto;
- Telegram voz;
- Ana texto dentro de App Fénix;
- Ana voz/micrófono dentro de App Fénix;
- recuperación coherente de contexto/memoria/conocimiento en los seis;
- emisión de señales derivadas reales hacia LRN-001 sin contenido bruto;
- ejecución sintética 60×4 o muestra representativa reproducible contra el contrato;
- OLD vs NEW + tribunal + PREPROD + rollback;
- cero regresiones de permisos, acciones, secretos, Trading y coste.

Hasta entonces el estado correcto es **PARCIAL / CONTRATO E IMPLEMENTACIÓN**, no `CONFIRMED_OPERATIONAL` end-to-end.
