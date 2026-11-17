# CEREBRO SEO-001 · D13 → D31 → D32 · Segunda iteración cloud Free

**Fecha:** 06-11-2026. **Compañía:** fenix. **Motor:** SEO-001. **Ambiente:** LAB/PREPROD. **PR:** #22 **DRAFT**. **Estado comprobado:** `QUALITY_GATES_GREEN_PROVIDER_503_HOLD`.

## Objetivo y criterio del propietario

Convertir la primera generación real cloud en un bucle de mejora que reconozca títulos antinaturales, SEO forzado, tono genérico y frases jurídicas/hipotecarias absolutas, sin depender de un PC local, sin API de pago y sin publicar material sin revisión.

Normativa de copy ya vigente: H1 cortos, H2 atractivos no numerados, evitar dos puntos y `además`/`en conclusión` en texto, 6 FAQ por artículo y 8 por landing, audiencia y CTA claros. Prohibida la falsa certificación de `huella de IA=0` por un detector de patrones.

## Cambios físicos implementados

1. Mejorada `runtime/seo-d13-free-project-one-shot-canary-v0.mjs` con un prompt que contrasta los fallos del primer borrador real y exige naturalidad y puntuación. Se ejecutan `auditOwnerEditorialCopy` y `auditSeoHumanVoiceAndRisk` **en el mismo resultado del modelo**, de forma que pasar las 6 FAQ sin superar el tono ya no devuelve un verde editorial ficticio.
2. `tests/seo-d13-free-project-one-shot-canary-v0.test.mjs` contiene regresión con el HTML auténtico rechazado por el propietario/evaluación y casos de errores, seguridad, límites y costes.
3. `.github/workflows/cerebro-seo-d13-gemini-free-one-shot-real-lab-v0.yml` ahora requiere simultáneamente PR #22 del propio repositorio, primera ejecución del workflow, tests correctos y el **mensaje exacto del último commit de rama** `seo(d13): ONE_SHOT_FREE_35_QUALITY_V2_20261106`. GitHub Checkout apunta a la SHA real del head, no al merge temporal. Esto evita que cambios ordinarios reactiven la API por efecto de filtros `paths` de una PR acumulativa.
4. Nuevo `runtime/seo-d32-cloud-editorial-result-router-v0.mjs` procesa recibos reales y borradores. Clasifica HTTP 503/502/504 como proveedor temporalmente no disponible, 429 como cuota/rate limit, 404 como modelo no encontrado y 401/403 como IAM; no mezcla un fallo técnico con calidad del copy, **no reintenta**, no publica ni envía datos a UMS.
5. `tests/seo-d32-cloud-editorial-result-router-v0.test.mjs` verifica el recibo 503, revalida byte por byte el primer artículo auténtico como fallo editorial, usa la versión V3 previa para demostrar `TECHNICAL_PRECHECK_PASS_RELEASE_HOLD` sin adjudicar QA humana y prueba alteraciones de hash, HTML malicioso y cambios de empresa.

## Evidencia de GitHub Actions

- **D31**, [42220871777](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42220871777), `4/4 PASS`.
- **JOB-001 + tribunal**, [42220872124](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42220872124), `4/4 PASS`, dos V3 conservados, `TECHNICAL_PRECHECK_PASS_RELEASE_HOLD`.
- **Primer CI de V2**, [42220871977](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42220871977), falló `1/6` por un literal del test que esperaba `EXACTAMENTE seis` y el prompt decía `exactamente seis`. **No hubo llamada real a Gemini en ese run**.
- **Segundo CI de V2**, [42221068088](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42221068088): `6/6 PASS`, **una sola petición real a `gemini-3.5-flash-lite`**, respuesta del proveedor **HTTP 503**, `PROVIDER_HTTP_REJECTED`, `provider_calls=1`, `0` reintentos, sin candidato nuevo. Recibo físico en GitHub artifact `seo-d13-gemini-free-real-one-shot-evidence` (ID `13503457028`). Copia ZIP conversacional `CEREBRO_SEO_D13_QUALITY_V2_HOLD_EVIDENCE.zip`.
- **Protección contra repetición verificada**, [42221470216](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42221470216): `6/6 PASS`, salida explícita `ONE_SHOT_NOT_REQUESTED=HOLD`, **cero llamadas Gemini** aunque la PR desencadenó el workflow de nuevo.
- **Nuevo D32 de aprendizaje**, [42221470498](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42221470498): `5/5 PASS`, `EXTERNAL_MODEL_CALLS=0`, distingue 503 de rechazo editorial.

## Interpretación honesta

**HECHO**: primer borrador cloud real histórico y su hash intacto, prompt V2 corregido, control D31 conectado, D32 de aprendizaje implementado, protección one-shot verificada, pruebas y evidencias.

**NO HECHO**: la segunda versión del artículo NO fue generada, porque Google devolvió HTTP 503. No debe afirmarse que mejoró el copy en una segunda muestra real.

**PENDIENTE**: una nueva prueba explícita y segura cuando el proveedor vuelva a estar disponible (con nivel Free confirmado), evaluación editorial cualitativa independiente, fuentes e intención de búsqueda verificadas, generación real de imagen UMS sin textos/logos, backup/rebuild/rollback WordPress y autorización exacta de versión.

**NO AUTORIZADO**: calendario de inferencias permanente, publicación automática, gasto API de pago, reutilización del Gemini de nivel 1. No declarar coste financiero liquidado de 0 € sin comprobar el extracto del proveedor. Sí se confirma que no hubo ruta de pago ni nuevas suscripciones desde estos workflows.

Conservar intactos los textos V3 de compradores e inmobiliarias, su cola PREPROD y todo App/CRM/PROD y WordPress. La PR sigue sin fusionar.
