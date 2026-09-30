# CEREBRO Console Changelog

## 2026-09-30 · Owner Decision by Exception V1

- Define lectura libre dentro de conocimiento y permisos autorizados.
- Sustituye doble confirmación repetitiva por propuesta exacta + una confirmación explícita.
- Preguntas/explicaciones no ejecutan ni consumen la propuesta.
- Un cambio de alcance invalida la propuesta anterior.
- HUMAN_REQUIRED pasa a ser un punto de resolución guiada: explicación + decisión/enlace/acción mínima + reanudación.
- Distingue aprobación puntual de cambio permanente de política.
- Registra decisiones humanas como precedentes para aprendizaje y futura automatización.
- Mantiene requisitos legales, permisos externos y contención de incidentes como condiciones que no pueden fingirse resueltas.
- Gateway PROD actualizado a V3 con Owner Decision by Exception V1.
- Adaptador Notion de conocimiento general solo lectura para Dirección, con evidencia/fuentes y fail-closed.
- Entrada canaria móvil `/cerebro/` publicada desde artefacto probado por CI.
- Estado: lectura/conversación/propuesta-confirmación HECHO; ejecución de acciones confirmadas PARCIAL y sujeta a bindings E2E por motor.
