# SEO-D32 · Primera generación REAL de CEREBRO mediante IA cloud gratuita

**Fecha:** 2026-11-06 · **company_id:** fenix · **engine_id:** SEO-001 · **environment:** LAB · **version:** V0 · **PR:** #22 DRAFT sin merge · **estado final:** `REAL_MODEL_GENERATION_VERIFIED_EDITORIAL_HOLD`

## Evidencia física

- Proyecto Google AI Studio `CEREBRO-GEMINI-FREE`, ID técnico `gen-lang-client-0458863116`, observado en sesión autenticada del propietario con **Nivel gratuito** y acción **Configurar la facturación** antes de ejecutar. No se utilizó el proyecto `Fenix Capital` de **Nivel 1 pagado**.
- Secret GitHub Actions **simbólico** `CEREBRO_GEMINI_FREE_API_KEY`, disponible en runner. Nunca se registró valor en código, chat, logs o artefactos.
- Primer intento [run 42218181999](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42218181999), modelo `gemini-2.5-flash-lite`: **una petición real HTTP 404**, sin candidato. Cero reintentos. Google [restringe acceso a modelos 2.5 para proyectos nuevos](https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash-lite). Se conserva la evidencia `SEO001_GEMINI_FREE_REAL_CANARY_20261106.zip` en el flujo conversacional y en artifacts temporales del run.
- Comprobación previa de nuevo modelo [run 42218526401](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42218526401) `gemini-3.5-flash-lite`: **metadatos reales verificados**, `generateContent` anunciado, 3/3 pruebas PASS y 0 tokens de inferencia.
- **Generación REAL** [run 42218675277](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42218675277): modelo **Gemini 3.5 Flash-Lite**, **1 POST real**, **0 reintentos**, **HTTP 200**, **5/5 tests PASS**, respuesta JSON con HTML auténtico. Usage declarado por Google `input_tokens=444`, `output_tokens=738`, `total_tokens=1182`. **Sin datos personales, sin WP y sin llamadas a imagen**.
- Trabajo del modelo `SEO001-FENIX-D13-REAL-FREE-LAB-003`. Copia original exacta (SHA256): `0306e2e5c126e6e34e8673dc7432188930f41406fce09ff4efb6d3c147e93a1c`.
- HTML físico histórico guardado (idéntico byte a byte) en `training-pilots/SEO_D13_GEMINI_35_FREE_REAL_LAB_003_UNAPPROVED.html`. Git blob SHA1 `b1d53f0e0a248ecfab21e6d290e299686388b7ed`.
- Artefacto `seo-d13-gemini-free-real-one-shot-evidence` artifact ID `13502865811`, expira según retención GitHub 14 días. El archivo contiene `receipt.json` y `candidate.html`. Copia adicional descargable `CEREBRO_SEO_D13_GEMINI_REAL_FREE_V0_2026-11-06.zip`.

## QA de contenido

La validación determinista básica `auditOwnerEditorialCopy` pasó `faq_count=6`, `word_count=403`, `style_issues=[]`, CTA propio, sin dos puntos ni palabras vetadas. **Esta prueba es real, pero insuficiente.**

La revisión editorial posterior detectó errores comerciales y riesgos que el primer lint no reconocía.

| Evidencia | Tipo de defecto | Resultado |
|---|---|---|
| H1 `Primera visita piso Córdoba` | Gramática SEO forzada, H1 no atractivo | RECHAZAR |
| H2 `Prepara tu primera visita piso Córdoba con calma` | Repetición de frase mal construida | RECHAZAR |
| `Da el siguiente paso con asesoramiento experto` | Sección comercial genérica y predecible | RECHAZAR |
| `marca la diferencia entre el acierto y el error` | Cliché publicitario, huella de plantilla | RECHAZAR |
| `Nunca debes firmar ni entregar dinero` | Consejo jurídico/inmobiliario categórico sin matiz | REVISIÓN YMYL |
| Párrafos con enumeraciones largas sin comas | Legibilidad mejorable | CORREGIR |

**Resultado correcto** `EDITORIAL_HOLD_BY_D31_SEMANTIC_AND_BUSINESS_REVIEW` — NO publicación, NO aceptación del propietario por SHA, NO marcado de experto independiente. El contenido no se debe reciclar para publicar automáticamente sin reescritura y nueva revisión.

La mejora está en el gate ejecutable `runtime/seo-d31-human-voice-risk-gate-v0.mjs`, incorporado a `runtime/seo-editorial-qa-job001-pipeline-v0.mjs`, conservando el contrato anterior y los dos V3 de compradores e inmobiliarias. Los tests negativos identifican el propio archivo real por SHA256 e impiden falsos verdes, además de prohibir instrucciones legales categóricas. Ningún regex permite afirmar que se ha detectado la autoría IA o que la calidad semántica está garantizada; siempre hace falta criterio editorial en el tribunal.

## Política permanente

- **Cloud-only.** Sin Ollama ni PCs. Reutilizar `ROUTE-001` e `IAM-001`, con `connector:seo-gemini-free-lab` en LAB, sin usar la clave del proyecto pagado.
- **Modelos con verificación real**. No escoger un modelo porque `models.get` exista únicamente. Una generación real puede devolver 404 por política de acceso. La versión 3.5 funcionó.
- **Free es un nivel de proyecto, no una propiedad del modelo ni el nombre de la clave**. No usar flags inventados para desbloquear facturación. El test de modelo real fue una **excepción manual aislada de una llamada**, respaldada por observación autenticada de la UI Free; no habilita facturación recurrente ni prueba observabilidad automática de cobros.
- **Coste adicional previsto cero**, sin subscripción nueva ni paid fallback. No afirmar cargo financiero liquidado de 0 € sin extracto posterior del proveedor; no se habilitó ninguna vía de pago.
- En nivel gratuito Google puede tratar el contenido conforme a sus condiciones del servicio; solo se enviaron textos de briefing y enlaces públicos, sin PII ni expedientes.
- La generación real acredita que **el motor SEO-D13 puede generar texto con IA cloud en LAB**. No acredita redacción profesional autónoma permanente ni publicación.
- Antes de habilitar horarios recurrentes: verificar de forma automática proyecto Free, presupuesto no facturable, cuota, identidad y expiración, evaluación editorial independiente, fuentes, no canibalización, UMS-001 con imagen sin logos/texto, metadatos WP, backup-restore físico, rollback y tribunal.

## Señales de estado verificables

`PROVIDER_FREE_PROJECT_UI_VERIFIED=HECHO`

`GITHUB_FREE_SECRET_PRESENT=HECHO`

`REAL_GEMINI_35_GENERATECONTENT=HECHO`

`OWNER_STYLE_BASIC_PRECHECK=PASS`

`D31_HUMAN_VOICE_PRECHECK=FAIL_FOR_SAMPLE`

`D31_PROFESSIONAL_INDEPENDENT_REVIEW=NO`

`IMAGE_PRODUCTION=NO`

`WORDPRESS_WRITES=0`

`SCHEDULER_AUTONOMOUS=NO`

`PUBLISH_AUTHORIZATION=FALSE`

`COST_ADDITIONAL_NO_PAID_ROUTE=0_EUR`.
