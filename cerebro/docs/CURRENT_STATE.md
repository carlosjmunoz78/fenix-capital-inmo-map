# CEREBRO OS · CURRENT STATE

Evidence anchors are scoped to the change they prove; they are not intended to mirror every later documentation-only `main` SHA. Structured evidence: `docs/EVIDENCE.json`. Phase 2 binding audit: `evidence/phase2-existing-bindings-audit.json`.

## HECHO

- FACT-001 Engine Factory V0: structural/reference green.
- GOV-001 Engine Registry V0: 177/177 canonical engine IDs registered; scaffold generation deterministic and reproducible.
- Phase 2 existing-engine wrapper registry: structural/read-only binding layer green.
- Phase 2 read-only evidence audit V0: complete for all nine bindings without activation or writes.
- `APP-001`: `CONFIRMED_OPERATIONAL` for the existing App surface only, based on exact-SHA successful PROD deploy/runtime smoke for `6bf6af92c1106884da87fb9a659f807093d47e0a` (`34293941974`, `34293942069`). This does not imply autonomous CEREBRO execution.
- Phase 4 multi-company bootstrap V0: structural/reference green for 17 canonical engines.
- Phase 5 Console/Gateway V0: structural/reference green for `CONSOLE-001`, `CHAT-001`, `CTX-001`, `CMD-001`, `ACTGW-001`.
- Governance V0: `POL-001` and `HEX-001` structural/reference green; merge `c523da8f11dbf1a2618982aeeb5940670317bb6e`, PROD Live Deploy `34330670776` and Runtime Smoke `34330670550` success on exact merge SHA.
- Persistent Events/Jobs V0: `EVT-001` and `JOB-001` structural/reference green as local/self-hosted PREPROD single-writer adapters. Reviewed HEAD `16484fdf50760afbd98e1d85824ed352dd3a5585`; PREPROD Factory `34337677363` and App `34337677429` success; merge `26fb9c75b9a7361afccccdc111761ad10aac5fa4`; PROD Live Deploy `34340279918` and Runtime Smoke `34340279922` success. The existing in-memory runtime remains preserved in parallel.

## EXISTENTE

- App Fénix and its current production pipeline/contracts are existing systems and were preserved by these additive CEREBRO changes.
- CEREBRO V0 code is additive and isolated under `cerebro/`; preservation does not imply live proof for every external integration.

## PARCIAL

- `CORE-001`, `SUP-001`, `TRN-001`, `DOC-001`: `DOCUMENTED_PARTIAL`; source/document/scope evidence exists but does not prove a complete live CEREBRO engine.
- `RUNTIME-001` and `FINOPS-001` have executable V0 reference implementations, not autonomous PROD engines.
- `EVT-001`/`JOB-001` persistence is green only for the additive PREPROD single-writer reference. Wiring into `SharedRuntime`, OLD-vs-NEW migration, multi-process/shared-worker coordination and autonomous PROD remain outside this completed scope.

## DEFINIDO

- `DBOFF-001`, `STOROFF-001`, `FREE-001`, `AIBUD-001` are V0 contracts/targets and must not be described as live operational services.
- Console/Gateway V0 defines the Gateway-only interaction boundary; it does not claim the final production Console UI is deployed as an autonomous CEREBRO control plane.

## POR AUDITAR

- `CRM-001`, `SEO-001`, `WEB-001`: `UNKNOWN_REQUIRES_AUDIT`; no stronger live claim is supported by this repository audit.
- `LAB-TRD`: `UNKNOWN_REQUIRES_AUDIT`, explicitly isolated and requiring a separate audit; no Trading integration with CEREBRO PROD is claimed.
- Real production autonomy per engine.
- `EVT-001`/`JOB-001` migration/wiring into `SharedRuntime` and scaling beyond the single-writer V0 reference.
- Promotion gates for each individual engine before autonomous PROD.
- Legacy `.github/workflows/one-shot-promote-899839d.yml`: historical exact-candidate promotion workflow. Its `paths` filter means it is triggered only when that workflow file itself changes; if triggered without the original promotion commit message, its promote job is skipped. It is not a required CEREBRO gate; do not modify or remove without inventory, dependency map, backup, contract, tests and rollback evidence.

## Non-negotiable boundaries

- `company_id`, `engine_id`, `environment`, `version` remain canonical context.
- Cross-company access defaults to deny.
- HUMAN_REQUIRED_SET: `["LEGAL_REQUIRED","SIGNATURE_REQUIRED","LOW_CONFIDENCE","HIGH_RISK","POLICY_CONFLICT","SECURITY_INCIDENT","MONEY_LIMIT","CUSTOMER_HUMAN_REQUEST"]`.
- Trading remains isolated.
- Additional cost target remains 0 €.
- No engine becomes autonomous PROD solely because its scaffold/reference implementation or read-only evidence audit is green.


## Update 2026-10-01 · CEREBRO Voice / Explicit Learning

### HECHO
- VOICE-001 V1.1 se encuentra desplegado en la App previa a este release y tuvo aceptación física básica del usuario.
- Explicit Learning V1 superó PREPROD con la migración exacta ejecutada dentro de una transacción y rollback completo: `GREEN_EXACT_MIGRATION_PREPROD_ROLLBACK`.
- PR #457 validado por CEREBRO Session Context Regression Guard #120 y App Restoration Build Gate #371; merge `b3b920bb5af4ce08b1a1a4d0a2925a00169a87f6`.
- La persistencia PROD `fenix_prod.cerebro_user_preferences` está creada, RLS activo, 0 filas iniciales, acceso SELECT anon/authenticated=false y service_role=true.
- El nuevo FK de auditoría `supersedes` está cubierto por índice tras PR #458, Guard #122 y Build Gate #372; merge `b29158e32889207ddc509a6b2853465c5413088c`.
- CEREBRO Gateway PROD V25 está ACTIVE con artefacto `12a0756ea113f8e4ba7c755e57a61704bac86417f553466c9ab6fd321d9d02b2`.
- Coste adicional recurrente introducido por esta capa: 0 €.

### PARCIAL
- La promoción frontend de Explicit Learning V1 se dispara mediante el release marcado `[DEPLOY_PROD]`; requiere Live Deploy + Runtime Smoke exactos antes de declararse desplegada.
- La persistencia física `corrección → guárdalo → recarga/nueva sesión → preferencia recuperada` requiere prueba humana real antes de `CONFIRMED_OPERATIONAL`.
- El carácter textual completo (por ejemplo preferred/avoid address y status-first en toda respuesta) está soportado como preferencia estructurada, pero no debe declararse aplicado universalmente hasta ampliar/verificar cada transformación.
- La interrupción por palabra hablada «para» mientras TTS está hablando permanece PLANIFICADA; el botón de interrupción sí existe.


### PROD deployment closure · 2026-10-01
- Frontend Exact PROD Source: `7fad08ac3225e89cbf3aa5a732674201dc67a8e6`.
- PROD Live Deploy #159: SUCCESS.
- PROD Runtime Smoke #302: SUCCESS.
- `gh-pages/PROD_SOURCE_SHA.txt` verificado exactamente como `7fad08ac3225e89cbf3aa5a732674201dc67a8e6`.
- Explicit Learning V1 pasa de promoción pendiente a **PARCIAL desplegado en PROD**.
- Falta únicamente la aceptación física del flujo persistente entre sesiones para poder elevar ese flujo a `CONFIRMED_OPERATIONAL`.


## Update 2026-10-01 · Conversational Learning + Dynamic Prosody V1

### HECHO
- El requisito queda corregido: el ritmo base de VOICE-001 se mantiene; la variación se hace localmente por segmento para aportar entonación y naturalidad.
- La migración exacta de `cerebro_conversation_memory` superó PREPROD con escritura, deduplicación, búsqueda, olvido y rollback completos: `GREEN_CONVERSATIONAL_MEMORY_EXACT_MIGRATION_ROLLBACK`.
- PR #461 superó CEREBRO Session Context Regression Guard #123 y App Restoration Build Gate #373; merge `99552a134cb29c0f53cbb2693683354a10d9b4d4`.
- En PROD existe `fenix_prod.cerebro_conversation_memory` con RLS; acceso directo anon/authenticated denegado y RPCs de memoria reservados a service-role.
- Los advisors no muestran un nuevo FK sin índice ni una nueva función SECURITY DEFINER expuesta a authenticated atribuible a esta capa.
- CEREBRO Gateway PROD V26 está ACTIVE con artefacto `fa441dba9e32d48a12554117efbf28e5fae3991f4a8add2d9015493dbd4e2c08`.
- PROD Live Deploy #162 y Runtime Smoke #305: SUCCESS.
- `gh-pages/PROD_SOURCE_SHA.txt` verificado exactamente como `374bd89d7e8ee97a26b3bdcf1bb5249a613489be`.
- Coste adicional recurrente introducido: 0 €.

### PARCIAL
- La memoria conversacional automática está desplegada técnicamente, pero necesita aceptación física real de `dato nuevo → nueva sesión/recarga → recuerdo correcto` para declararla `CONFIRMED_OPERATIONAL`.
- La prosodia dinámica está desplegada técnicamente, pero su naturalidad requiere validación auditiva humana.
- Esta V1 es memoria episódica persistente y recuperable; no equivale a reentrenar los pesos de un modelo ni a convertir automáticamente cada frase en verdad canónica.
- La consolidación futura de recuerdos repetidos hacia conocimiento canónico exige reglas de contradicción, versionado y tribunal antes de automatizarse.
- La interrupción mediante la palabra hablada «para» mientras TTS está hablando sigue PLANIFICADA; el control visible de interrupción permanece disponible.


## Update 2026-10-01 · Spoken Summary V1

### HECHO
- El propietario confirmó físicamente que la memoria conversacional recupera el conocimiento aprendido tras el cambio de sesión/recarga en la prueba indicada.
- Spoken Summary V1 está implementado sin sustituir la respuesta escrita: el detalle completo continúa visible y la voz usa un canal resumido independiente.
- El TTS no pronuncia enlaces completos; comunica que el enlace queda escrito.
- Los marcadores de enumeración se suprimen del canal hablado.
- La confirmación final de acciones se conserva en modo hablado.
- PR #463: Guard #128 y App Restoration Build Gate #377 SUCCESS; merge `1da8c6523c344257969fe7304ccdac900b0618e3`.
- Release PROD `b64050f0320f31e1685fa028744e73e5920c8655`: Live Deploy #165 SUCCESS y Runtime Smoke #308 SUCCESS.
- `gh-pages/PROD_SOURCE_SHA.txt` coincide exactamente con `b64050f0320f31e1685fa028744e73e5920c8655`.
- Rollback frontend conocido: `374bd89d7e8ee97a26b3bdcf1bb5249a613489be`.
- Coste adicional recurrente: 0 €.

### PARCIAL
- Spoken Summary V1 requiere ahora aceptación auditiva humana para confirmar que el resumen se siente natural en el navegador real y no omite contexto útil.
- El flujo físico de «olvida lo que te dije sobre…» de la memoria conversacional no se considera confirmado hasta probarlo expresamente.
- La prosodia y el resumen hablado siguen siendo deterministas/browser-native; no se declara TTS neuronal expresivo.


## Update 2026-10-01 · Spoken Summary V2

### HECHO
- Se sustituye el recorte simple de las primeras frases por selección hablada contextual basada en `status`, `intent`, `action` y `read_context`.
- Hay tratamiento específico para selección de contactos, propuesta y resultado de correo, próxima publicación social, memoria conversacional y salud de CEREBRO.
- Listas se convierten en lenguaje conversacional; enlaces, correos, hashes largos y ruido de CI/PR/SHA quedan en pantalla y no se verbalizan literalmente.
- Los fallos de una acción confirmada conservan el aviso crítico audible y las propuestas mantienen la pregunta de confirmación.
- Se añadió corpus de comportamiento real del transformador hablado, además de assertions estáticas.
- PR #465: CEREBRO Session Context Regression Guard #131 SUCCESS y App Restoration Build Gate #379 SUCCESS; merge `20280fa5f3afc83723db19ca0fcd063a364d164f`.
- PROD exacto `f670d65136b8a09630ab5183d23961fea098af24`: Live Deploy #168 SUCCESS y Runtime Smoke #311 SUCCESS.
- `gh-pages/PROD_SOURCE_SHA.txt` verificado exactamente como `f670d65136b8a09630ab5183d23961fea098af24`.
- Rollback frontend preservado: `b64050f0320f31e1685fa028744e73e5920c8655`.
- Coste adicional recurrente: 0 €.

### PARCIAL
- Falta aceptación auditiva humana de Spoken Summary V2 en navegador real antes de marcar este subflujo como `CONFIRMED_OPERATIONAL`.
- El TTS sigue siendo browser-native y la síntesis semántica es determinista; no se declara voz neuronal expresiva.


## Update 2026-10-01 · Verbal Barge-in V1 + Spoken Digest V3

### HECHO
- Feedback físico del propietario sobre V2: el resumen hablado seguía percibiéndose prácticamente igual y «para / stop / calla» no interrumpían la voz; solo funcionaba el control visible.
- Se añade un reconocedor dedicado mientras `speechSynthesis` está hablando. Escucha únicamente comandos cortos de interrupción y, al detectarlos, cancela TTS y vuelve a escucha normal.
- Comandos soportados: «para», «para ya», «CEREBRO para», «stop», «calla», «cállate», «silencio», «basta» y «detente».
- El matching es exacto/normalizado para no confundir frases de negocio como «para Belén» con una orden de silencio.
- Spoken Digest V3 reduce el habla ordinaria a una idea principal por defecto y añade resúmenes específicos para SEO, financiación, marketing, social, newsletter, autonomía, plataforma, Trading y multiempresa.
- La respuesta escrita completa no cambia; permisos, propuestas y confirmaciones permanecen intactos.
- PR #467: CEREBRO Session Context Regression Guard #134 SUCCESS y App Restoration Build Gate #381 SUCCESS.
- PROD exacto `d8b89b4f1f541d5d7ebea1ab5fd5cd8446a4bc43`: Live Deploy #171 SUCCESS y Runtime Smoke #314 SUCCESS.
- `gh-pages/PROD_SOURCE_SHA.txt` coincide exactamente con `d8b89b4f1f541d5d7ebea1ab5fd5cd8446a4bc43`.
- Rollback frontend: `f670d65136b8a09630ab5183d23961fea098af24`.
- Coste adicional recurrente: 0 €.

### PARCIAL
- El barge-in verbal necesita prueba física en el navegador real porque Web Speech puede variar según navegador/dispositivo y CI no puede demostrar que el micrófono oye al usuario durante TTS.
- Spoken Digest V3 necesita nueva aceptación auditiva humana; V2 no se considera aceptada por el propietario.


## Update 2026-10-01 · Local VAD Barge-in V2

### HECHO
- La prueba física confirmó que el enfoque anterior basado en `SpeechRecognition` concurrente con TTS no permitía interrumpir verbalmente la voz en el navegador real.
- Se cambia de estrategia: durante TTS, CEREBRO usa detección local de actividad de voz mediante `getUserMedia` + Web Audio API.
- Se solicitan `echoCancellation`, `noiseSuppression` y `autoGainControl`, se calcula umbral adaptativo con ruido/eco y se exige actividad sostenida para evitar picos aislados.
- Ya no hace falta reconocer literalmente «para»: empezar a hablar debe cancelar la locución y devolver CEREBRO a la escucha normal.
- El recognizer verbal anterior queda únicamente como fallback.
- PR #469: CEREBRO Session Context Regression Guard #139 SUCCESS y App Restoration Build Gate #385 SUCCESS.
- PROD exacto `96eb6effb4ab4077ccdc6158858c5158e3be825e`: Live Deploy #174 SUCCESS y Runtime Smoke #317 SUCCESS.
- Rollback frontend: `d8b89b4f1f541d5d7ebea1ab5fd5cd8446a4bc43`.
- Coste adicional recurrente: 0 €.

### PARCIAL
- Falta aceptación física en navegador real. CI confirma contratos, build y publicación, pero no puede certificar que el micrófono físico distinga la voz del usuario frente al audio reproducido.
