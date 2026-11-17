# SEO-D32 · Nueva norma editorial del propietario para artículos y landings

**Fecha:** 2026-11-06 · **empresa:** fenix · **motor:** SEO-001 · **entorno:** PREPROD · **PR:** #22 DRAFT.

## Nueva directriz

El propietario insiste en que los artículos y las landings de Fénix **no pueden parecer piezas cortas o poco trabajadas**. Esta directriz reemplaza las metas de 240–710 palabras usadas para las dos primeras revisiones V3. No deroga normas anteriores de H1/H2 naturales, 6 FAQ por artículo, 8 FAQ por landing, buyer persona, evitar dos puntos y muletillas, ni las garantías de protección del CMS.

Se establecen como **mínimos operativos propuestos para la firma Fénix**, ajustables únicamente mediante modificación auditada de la política.

| Contenido | Mínimo total visible | Mínimo de desarrollo fuera de FAQ | Objetivo de cobertura recomendado | FAQ mínimas |
|---|---:|---:|---:|---:|
| Artículo informativo | **1.000** | **750** | 1.200–1.800 | 6 |
| Landing de captación | **900** | **600** | 1.000–1.600 | 8 |

El contenido no debe rellenarse para alcanzar números. No hay un máximo automático que penalice una investigación más profunda. El auditor verificará profundidad sustancial, estructura, distinción por intención, párrafos no duplicados, claridad, evidencia, consultas prácticas de clientes y validez de las llamadas a la acción.

**No confundir con una regla de Google.** Google Search Central indica que no existe una longitud mínima o máxima preferida para posicionar y recomienda contenido útil, fiable y centrado en personas. Los mínimos aquí responden a un estándar interno de Fénix, no a una promesa de tráfico ni de indexación.

Fuentes públicas oficiales para el criterio: `https://developers.google.com/search/docs/fundamentals/seo-starter-guide?hl=es-419` y `https://developers.google.com/search/docs/fundamentals/creating-helpful-content?hl=es`.

## Evidencia física y matriz OLD vs NEW

Se crearon de forma **aditiva**, sin editar la versión original aprobada para QA, los siguientes contratos y validadores:
- `seo-owner-content-depth-policy-v1-2026-11-06.json`, política versionada multi-entorno.
- `runtime/seo-owner-content-depth-gate-v1.mjs`, conteo verificable con FAQ excluidas del desarrollo principal, comprobación de párrafos, encabezados y similitud, y `DEPTH_HOLD` cuando no pasa.
- `tests/seo-owner-content-depth-gate-v1.test.mjs`, pruebas de artículo, landing, 2 V3 históricas, hinchado artificial de FAQ, duplicados y debilitamiento de política.
- El redactor real `runtime/seo-d13-free-project-one-shot-canary-v0.mjs` ahora pide **1200–1550 palabras**, reserva **750+ para el desarrollo** y comprueba la longitud en su misma evaluación, junto con estilo y D31. Se ha ampliado el límite de salida del modelo para esa petición futura, **sin realizar ninguna llamada de IA por este cambio**.
- El contrato del escritor cloud general, que por seguridad sigue con inferencia deshabilitada, hereda el mínimo por tipo.
- `runtime/seo-d32-cloud-editorial-result-router-v0.mjs` aplica `DEPTH_` a muestras y recibos. Una salida incompleta ya no puede pasar `TECHNICAL_PRECHECK_PASS_RELEASE_HOLD` en el bucle nuevo solo por tener las 6 FAQ.
- El actual pipeline `runtime/seo-editorial-qa-job001-pipeline-v0.mjs` registra `content_depth_release_hold` como bloqueo **adicional** a la aprobación; sigue permitiendo comparar su antiguo `code_checks_passed` técnico y conservando hashes originales. El tribunal añade la puerta `OWNER_CONTENT_DEPTH_EXPANSION_REQUIRED` cuando corresponde.
- Regla heredada por el registro de roles `seo-owner-excellence-all-roles-policy-v1.json` con estado PREPROD.

Recuento visible de las dos fuentes V3 conservadas (HTML textual incluidas FAQ y encabezados, sin comentarios):

| Trabajo V3 | Palabras visibles | Desarrollo sin FAQ | Decisión de nueva política |
|---|---:|---:|---|
| Compradores Córdoba, B2C | **663** | **454** | `DEPTH_HOLD` |
| Inmobiliarias Córdoba, B2B | **599** | **400** | `DEPTH_HOLD` |

Ambas tienen sus 6 FAQ, pero **ninguna cumple** el nuevo umbral de contenido sustantivo. No se han modificado ni publicado; deben reescribirse como **V4 con nuevo SHA**, revisión editorial, fuentes y controles. No simular que alargar el borrador permite autorizarlo sin más verificaciones.

## Evidencia CI

- [GitHub Actions 42222696370](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42222696370) — nuevo auditor de profundidad `6/6 PASS`.
- [GitHub Actions 42223092305](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42223092305) — mismo auditor tras integración `6/6 PASS`.
- [GitHub Actions 42223092672](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42223092672) — D32 `5/5 PASS`.
- [GitHub Actions 42223092753](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42223092753) — JOB-001 `4/4 PASS`.
- [GitHub Actions 42223092377](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42223092377) — escritor `6/6 PASS` y confirmación `ONE_SHOT_NOT_REQUESTED=HOLD`, **0 llamadas reales** a Gemini.

## Estado y límites

**HECHO:** política nueva, gate, pruebas, seguridad, conexión al escritor, D32 y tribunal, reglas añadidas al registro de roles.

**NO HECHO:** aún no existen versiones V4 completas ni nuevos borradores generados de >=1000/900 palabras. No se ha probado la calidad de un nuevo texto largo con modelo cloud real.

**PENDIENTE:** investigación de intención y competencia, contenido útil de mayor profundidad, QA profesional, autoría final, media UMS original y permisos WP con backup/rollback.

**Sin cambios** a App, CRM, Supabase PROD, WordPress publicado, DNS, main o Trading. No se ha pagado ni activado ningún servicio, ni programado nuevas inferencias. PR #22 sigue en DRAFT. El gate no certifica calidad semántica, experiencia humana ni posicionamiento, exige revisión independiente antes de publicar.
