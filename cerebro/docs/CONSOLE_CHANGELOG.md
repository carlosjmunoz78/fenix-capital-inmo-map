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


## 2026-10-01 · Spoken Summary V1

- Aceptación física del propietario: la recuperación de memoria conversacional entre sesiones funciona en la prueba solicitada; el flujo de olvido físico sigue pendiente de prueba.
- La voz deja de leer literalmente todo lo que CEREBRO escribe: el texto completo permanece en pantalla y el TTS usa una síntesis determinista breve.
- Los enlaces ya no se pronuncian; CEREBRO dice que deja el enlace por escrito.
- Se eliminan del habla los prefijos de listas/viñetas para evitar «uno punto», «dos punto», etc.
- Las respuestas largas hablan solo las primeras unidades relevantes y remiten el detalle completo a pantalla.
- En acciones, se conserva verbalmente la confirmación final para no degradar la seguridad.
- PR #463: CEREBRO Session Context Regression Guard #128 SUCCESS y App Restoration Build Gate #377 SUCCESS; merge `1da8c6523c344257969fe7304ccdac900b0618e3`.
- Release PROD exacto `b64050f0320f31e1685fa028744e73e5920c8655`: Live Deploy #165 SUCCESS y Runtime Smoke #308 SUCCESS.
- `gh-pages/PROD_SOURCE_SHA.txt` verificado exactamente como `b64050f0320f31e1685fa028744e73e5920c8655`.
- Rollback frontend anterior preservado: `374bd89d7e8ee97a26b3bdcf1bb5249a613489be`.
- Coste adicional recurrente: 0 €.
- Estado: despliegue técnico HECHO; aceptación auditiva del resumen hablado PENDIENTE.


## 2026-10-01 · Spoken Summary V2

- Evoluciona el canal hablado de recorte V1 a resumen semántico determinista y consciente del tipo de respuesta.
- Usa metadatos estructurados del Gateway ya existentes para decidir qué merece ser hablado y qué debe permanecer escrito.
- Selección de contactos: habla cuántas opciones hay y para quién, dejando correos completos en pantalla.
- Propuesta de correo: habla destinatario y asunto, remite el cuerpo exacto a pantalla y conserva «¿Confirmas el envío?».
- Resultado de correo: confirma de forma breve el resultado y deja evidencia escrita.
- Próxima publicación social: verbaliza red y programación; texto, imagen y enlaces permanecen escritos.
- Memoria conversacional: responde en lenguaje natural en lugar de leer numeración y metadatos.
- Salud/estado técnico: evita recitar PR, SHA, runs y hashes.
- Fallos de ejecución: conserva explícitamente la parte negativa/crítica.
- Corpus de pruebas conductuales GREEN.
- PR #465: Guard #131 SUCCESS; Build Gate #379 SUCCESS; merge `20280fa5f3afc83723db19ca0fcd063a364d164f`.
- PROD `f670d65136b8a09630ab5183d23961fea098af24`: Live Deploy #168 SUCCESS; Runtime Smoke #311 SUCCESS.
- Coste adicional: 0 €.


## 2026-10-01 · Verbal Barge-in V1 + Spoken Digest V3

- V2 no obtiene aceptación física: el propietario reporta que el cambio hablado se percibe igual y que no existe interrupción verbal efectiva.
- Añadido listener STT dedicado durante TTS para barge-in.
- «para», «stop», «calla», «cállate», «silencio», «basta», «detente» y variantes acotadas cancelan `speechSynthesis` y devuelven CEREBRO a escucha.
- Matching exacto reduce falsos positivos con expresiones como «para Belén».
- El habla genérica pasa de varias frases seleccionadas a una idea principal por defecto.
- Añadidos digests específicos por intent para SEO, financiación, marketing, social, newsletter, autonomía, plataforma, Trading y multiempresa.
- Corpus conductual de barge-in y resumen V3 GREEN.
- PR #467: Guard #134 SUCCESS; Build Gate #381 SUCCESS.
- PROD `d8b89b4f1f541d5d7ebea1ab5fd5cd8446a4bc43`: Live Deploy #171 SUCCESS; Runtime Smoke #314 SUCCESS.
- Coste adicional: 0 €.
- Aceptación física: PENDIENTE.


## 2026-10-01 · Local VAD Barge-in V2

- Se registra como fallido físicamente el enfoque V1 de interrupción por `SpeechRecognition` simultáneo con TTS.
- Nueva estrategia: VAD local sobre micrófono durante TTS; cualquier voz sostenida del usuario interrumpe la respuesta y reactiva escucha normal.
- Filtrado con cancelación de eco, supresión de ruido, ganancia automática, umbral adaptativo y frames consecutivos.
- El botón visible de interrupción se conserva como fallback.
- PR #469: Guard #139 SUCCESS; Build Gate #385 SUCCESS.
- PROD `96eb6effb4ab4077ccdc6158858c5158e3be825e`: Live Deploy #174 SUCCESS; Runtime Smoke #317 SUCCESS.
- Coste adicional: 0 €.
- Aceptación física: PENDIENTE.


## 2026-10-01 · Local VAD Barge-in V2 · aceptación física confirmada

- El propietario confirma que «para» corta la locución de CEREBRO sin usar el botón.
- Estado del subflujo: CONFIRMED_OPERATIONAL dentro del alcance físico probado.
- Se mantiene fallback visual y rollback conocido.
- La aceptación no se extiende todavía a Spoken Digest V3 ni a una matriz exhaustiva de falsos positivos/dispositivos.


## 2026-10-01 · Natural Spoken Conversation V4

- Se conserva conversación continua sin cap de preguntas/turnos.
- La salida oral usa contexto de la pregunta actual, frases más cercanas y menos boilerplate de pantalla.
- Se prioriza voz `es-ES` femenina/natural cuando existe en el dispositivo, manteniendo fallback a cualquier voz española disponible.
- No se ralentiza el ritmo base; el tono cálido solo modula ligeramente la prosodia.
- PR #473: Guard #144 SUCCESS; Build Gate #388 SUCCESS.
- PROD `c12edfae5f65fdb95c1dbf6b6fcfd921509ca21e`: Live Deploy #179 SUCCESS; Runtime Smoke #322 SUCCESS.
- Coste adicional: 0 €.
- Aceptación auditiva: PENDIENTE.


## 2026-10-01 · Human Dialogue + Knowledge Map + Clarification V1

- Saludos cercanos y variados para el propietario: nombre Carlos + variantes con «guapo».
- Entradas habladas humanas y contextuales: «Claro», «Mira», «Vale» y «Te cuento», evitando repetir una muletilla fija.
- Las consultas amplias de conocimiento devuelven un mapa temático y una invitación a profundizar.
- Primer mapa canónico Legal/Inmobiliario: arras/compraventa, titularidad/cargas/Registro, Catastro, notaría/firma, herencias, donaciones, fiscalidad, riesgo del inmueble y AML/compliance.
- El mapa legal conserva las fronteras de validación: experiencia operativa ≠ norma jurídica automática; cuestiones sensibles requieren fuente vigente y/o profesional cuando proceda.
- Las consultas de baja confianza cambian de «no encontrado» a una pregunta de aclaración natural; no se completa el hueco por inferencia.
- Se preservan VAD, conversación sin cap de turnos, permisos y contrato de confirmación de acciones.
- PR #475: Guard #148 SUCCESS; Build Gate #391 SUCCESS; merge `fac3ea1141715af2ba9059e5afaf34948fcdb7fa`.
- Gateway PROD V27: `cccc3dce290dbf9530f185501341ca837058defcece06a862ee6fd805123e485`.
- PROD frontend `fbdbb99e22a821b578874157c86d73789f111e10`: Live Deploy #182 SUCCESS; Runtime Smoke #325 SUCCESS.
- Coste adicional: 0 €.
- Aceptación física conversacional: PENDIENTE.


## 2026-10-01 · Conversational Intelligence V2

- Contexto de conversación acotado: últimos 10 turnos / 8.000 caracteres máximos en Gateway.
- Resolución determinista de follow-ups cortos y referencias a puntos numerados.
- Memoria estructurada V2 con tipos de hecho, decisión, corrección, preferencia y conocimiento operativo.
- Trazabilidad de sustituciones mediante `superseded_by`; solo se activa con correcciones explícitas.
- Señal `REQUIRES_CURRENT_VERIFICATION` para conocimiento sensible al tiempo.
- PREPROD exact migration rollback GREEN; PROD migration aplicada sin pérdida de las 11 memorias existentes.
- PR #477: Guard #153 SUCCESS; Build Gate #395 SUCCESS; merge `a628102aeb05de05f8c145a5c94ea8520d2a00ce`.
- Gateway PROD V28 `4a6cf9ac3065b5ad8ab5283f0df99b8853490e4f6c941026d011e55cc03aa00b`.
- Frontend PROD `2d157dd4e74c101b25000bb64adf5bac5719a82e`: Live Deploy #185 SUCCESS; Runtime Smoke #328 SUCCESS.
- Coste adicional: 0 €.
- Aceptación física multi-turno: PENDIENTE.


## 2026-10-02 · Voice speed + Pause/Resume V1

- Preferencia de velocidad del propietario elevada a 1.08 y persistida en PROD.
- La velocidad base de voz se alinea a 1.08 para evitar regreso a un ritmo lento tras recarga.
- «para» pasa de cancelar la respuesta a pausarla.
- «continúa» / «sigue» reanuda la locución pendiente desde el mismo punto cuando el motor TTS del navegador lo permite.
- Una nueva pregunta mientras está pausado descarta el resto de la respuesta anterior y atiende la nueva petición.
- Se conservan VAD local, fallback visual, permisos y confirmación segura de acciones.
- PR #480: Guard #160 SUCCESS; Build Gate #400 SUCCESS; merge `9a9b3265f3e6ec1c8b841454d3174ea4e516bdf4`.
- Coste adicional: 0 €.
- Aceptación física: PENDIENTE.
