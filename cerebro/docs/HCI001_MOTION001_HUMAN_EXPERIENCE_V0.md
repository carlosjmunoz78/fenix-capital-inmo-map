# HCI-001 + MOTION-001 · Human Experience Layer V0

## Estado

`SCAFFOLD / LAB ONLY`. Esta especificación no habilita ejecución autónoma en PROD.

## Regla de preservación

La ampliación parte del registro canónico V0 de 177 motores y no modifica, elimina ni sustituye ninguno. `engine-registry.v1.json` conserva los 177 IDs en el mismo orden y añade únicamente `HCI-001` y `MOTION-001`. FACT-001 V1 envuelve a FACT-001 V0 para generar los motores existentes y solo fabrica en paralelo los dos scaffolds nuevos.

## HCI-001 · Human ↔ CEREBRO Experience Engine

Objetivo: que cada interacción humano↔CEREBRO sea más clara, natural, rápida y de menor esfuerzo que la versión anterior, independientemente de si ocurre por Console, chat, voz, Telegram o email.

HCI-001 no entrega mensajes ni sintetiza voz. `COM-001` conserva la propiedad de canales; `VOICE-001` conserva STT/TTS y calidad de voz; `VOICEUI-001` conserva la mecánica de la superficie de voz. HCI-001 mide fricción, genera hipótesis de mejora, ejecuta comparaciones OLD vs NEW en entornos seguros y entrega candidatos a la cadena de aprendizaje/evaluación.

Métricas V0: tiempo hasta comprensión, tasa de aclaraciones, correcciones, repeticiones, éxito de interrupciones, adecuación de longitud, cambio de modalidad, proxy de esfuerzo, preferencia explícita y comprensión al terminar la tarea.

No puede inferir rasgos sensibles, manipular al usuario, ampliar permisos, ejecutar acciones de negocio ni autopromocionarse. Toda mejora pasa por evidencia, evaluación independiente, tribunal y PREPROD antes de cualquier promoción.

## MOTION-001 · CEREBRO Presence & Motion Engine

Objetivo: que CEREBRO tenga una presencia visual premium y coherente que comunique estado y responda al audio sin convertirse en una dependencia funcional.

Estados V0: `IDLE`, `LISTENING`, `PROCESSING`, `SPEAKING`, `HUMAN_REQUIRED`, `DEGRADED`, `ERROR`.

La implementación prioriza CSS/transforms, Canvas y Web Audio API; WebGL solo cuando esté justificado. Coste adicional objetivo: 0 €. La interfaz debe seguir siendo plenamente utilizable con animaciones desactivadas.

Métricas V0: latencia input→visual, error de sincronía voz/visual, frames perdidos, frame time p95, proxies CPU/batería, cumplimiento `prefers-reduced-motion`, reconocimiento correcto del estado visual y preferencia explícita.

Debe respetar reducción de movimiento, evitar flashes rápidos y no codificar secretos, contenido sensible o supuestas emociones internas en la animación.

## Loop de mejora continua

`interacción -> telemetría minimizada -> HCI-001 / MOTION-001 -> candidato -> LRN-001 -> EVA-001 -> JDG-001 -> PREPROD -> OLD vs NEW -> promoción gradual o descarte`.

Una mejora perdedora no sustituye la versión aceptada. Rollback y rebuild permanecen obligatorios. Los motivos `HUMAN_REQUIRED` continúan limitados al catálogo canónico.

## Gates antes de PREPROD/PROD

Scaffold FACT-001 verde no equivale a motor operativo. Antes de PREPROD se requiere implementación real, contratos ejecutables, permisos, tests conductuales, observabilidad, evaluación, tribunal, backup, rollback, rebuild y coste medido. Antes de PROD se requiere además comparación OLD vs NEW y promoción gradual.
