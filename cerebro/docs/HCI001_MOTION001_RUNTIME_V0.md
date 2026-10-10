# HCI-001 + MOTION-001 · Behavioral Runtime V0

## Estado

`PREPROD CODE / NOT LIVE CONNECTED`.

Este bloque implementa la primera lógica conductual determinista de los dos motores sin conectar todavía telemetría viva ni sustituir ninguna interfaz existente.

## HCI-001 V0

Recibe eventos minimizados de interacción sin transcript ni contenido bruto. Calcula métricas de comprensión/fricción, genera candidatos deterministas de mejora y compara OLD vs NEW. Una variante puede ganar la comparación, pero el runtime nunca autoriza promoción: requiere EVA-001 + JDG-001 y gates posteriores.

Los candidatos cubren, entre otros, ambigüedad, correcciones, repetición de contexto, interrupciones, esfuerzo del usuario y longitud excesiva.

No infiere rasgos sensibles y no guarda contenido bruto.

## MOTION-001 V0

Implementa una máquina de estados explícita: IDLE, LISTENING, PROCESSING, SPEAKING, HUMAN_REQUIRED, DEGRADED y ERROR. Produce perfiles visuales acotados para escala, glow, pulso, órbita, espectro, partículas, blur y brillo. El nivel de audio puede modular SPEAKING.

`prefers-reduced-motion` elimina movimiento continuo. La animación nunca es una dependencia funcional y no transporta contenido ni secretos.

También analiza telemetría minimizada de rendimiento y genera candidatos de mejora para latencia, sincronía audio/visual, frames, presupuesto de recursos, accesibilidad y reconocimiento visual del estado.

## Aprendizaje

`hci-motion-learning-bridge.mjs` convierte métricas y candidatos de HCI-001/MOTION-001 en las familias ya aceptadas por LRN-001 (`METRIC_OBSERVATION` y `ENGINE_EVENT`). El bridge no publica ni promueve por sí mismo.

## Siguiente gate

1. CI y regresión del runtime V0.
2. LAB conectado con telemetría agregada/minimizada.
3. OLD vs NEW físico sobre Voice Experience.
4. EVA-001 + JDG-001.
5. PREPROD solo si gana y cumple rendimiento/accesibilidad.

PROD, Trading y gasto adicional permanecen desautorizados.
