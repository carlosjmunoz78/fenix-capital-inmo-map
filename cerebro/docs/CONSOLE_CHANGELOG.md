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


## 2026-10-01 · VOICE-001 V1.1 + Explicit Learning V1

- VOICE-001 mejorado con hasta tres alternativas de reconocimiento, unión de segmentos y hints contextuales cuando el navegador los soporta.
- Añadido control visible `Parar respuesta y hablar`; el barge-in puramente verbal diciendo «para» sigue pendiente.
- Perfil hablado por defecto: cercano, cariñoso, natural y profesional; velocidad 0.96, pitch 1.04 y respuesta hablada concisa.
- Las correcciones compatibles se aplican en sesión sin escribir memoria durable.
- `guárdalo`, `recuérdalo` y órdenes equivalentes permiten persistencia explícita y auditable.
- Nueva tabla `fenix_prod.cerebro_user_preferences`, versionada y actor/company scoped, con acceso directo anon/authenticated denegado.
- Gateway PROD actualizado a V25 con `EXPLICIT_ONLY_V1`; SHA de artefacto `12a0756ea113f8e4ba7c755e57a61704bac86417f553466c9ab6fd321d9d02b2`.
- Migración exacta validada en PREPROD con rollback completo antes de PROD.
- El advisor detectó el FK `supersedes` sin índice; se corrigió con índice dedicado y el aviso nuevo desapareció.
- Estado: backend y almacenamiento HECHO; frontend validado y en promoción; aceptación física de persistencia entre sesiones PENDIENTE.


## 2026-10-01 · Conversational Learning + Dynamic Prosody V1

- Corregido el objetivo vocal: se conserva el ritmo base; no se ralentiza globalmente la voz.
- Añadida prosodia contextual por frase/cláusula: variación ligera de ritmo y tono en preguntas, confirmaciones, enumeraciones y mensajes de riesgo.
- CEREBRO empieza a aprender automáticamente de cada turno significativo y no sensible del propietario, sin exigir «guárdalo» para el conocimiento conversacional ordinario.
- La memoria conversacional es persistente entre sesiones, buscable y deduplicada; distingue `USER_TURN`, `FACT`, `DECISION` y `CORRECTION`.
- Se excluyen audio y valores sensibles de la memoria conversacional general.
- Las respuestas de CEREBRO no se convierten automáticamente en conocimiento del propietario.
- Añadido olvido explícito por tema: «olvida lo que te dije sobre …».
- El conocimiento conversacional se usa como evidencia propia; el estado vivo/canónico mantiene prioridad para datos operativos.
- PR #461: Guard #123 SUCCESS y App Restoration Build Gate #373 SUCCESS; merge `99552a134cb29c0f53cbb2693683354a10d9b4d4`.
- Migración exacta PREPROD con rollback completo: `GREEN_CONVERSATIONAL_MEMORY_EXACT_MIGRATION_ROLLBACK`.
- Gateway PROD actualizado a V26, artefacto `fa441dba9e32d48a12554117efbf28e5fae3991f4a8add2d9015493dbd4e2c08`.
- PROD Live Deploy #162 SUCCESS; Runtime Smoke #305 SUCCESS.
- Frontend PROD exacto: `374bd89d7e8ee97a26b3bdcf1bb5249a613489be`.
- Coste adicional recurrente: 0 €.
- Estado: despliegue técnico HECHO; aceptación física de memoria entre sesiones y naturalidad de prosodia PENDIENTE.
