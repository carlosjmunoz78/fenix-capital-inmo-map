# CEREBRO SEO-001 · FACT-001 premium OG + embudos · Evidencia de cierre PREPROD · 2026-11-06

> **Clasificación:** IMPLEMENTADO Y PROBADO EN RAMA PARALELA, NO DESPLEGADO / NO CERTIFICADO EN PROD.
>
> `company_id=fenix` · `engine_id=SEO-001` · `environment=PREPROD` · `version=v1` · PR #22 DRAFT.

## 1. CONTEXTO E INVARIANTES

Se parte del incidente ya cerrado: el renderizador ORIGINAL ejecutó `c4012f43-c12f-400b-9610-2e5f2e286000` con `SUCCEEDED`, imagen privada 1200×630, coste 0 €, pero QA editorial `HOLD` por Arial, logotipo no verificado y composición plana. La cadena PROD original permanece intacta, sin reencolar ese trabajo agotado ni sustituir la imagen WordPress del post 960.

Evidencia original: `cerebro/seo-enterprise/v2/evidence/SEO_MEDIA_PILOT_PRIVATE_QA_2026-11-06.md`. Worker PROD `cerebro-creative-job-runner-v1.yml` mantiene programación `disabled_manually`, sin dar lugar a gastos recurrentes.

## 2. COMPOSITOR PREMIUM V1 EN RAMA PARALELA

**Fuentes físicas de primera parte en el WordPress existente, confirmadas mediante HTTP HEAD 200:**
- Logotipo auténtico Fénix Capital, PNG transparente: `https://fenixcapital.es/wp-content/uploads/2026/10/Logo-Fenix-Capital-oficial-color-completo-scaled-1.png`.
- Tipografía Montserrat existente, WOFF2: `https://fenixcapital.es/wp-content/uploads/elementor/google-fonts/fonts/montserrat-49e242af.woff2`.

Código nuevo: `cerebro/seo-enterprise/v2/runtime/seo-premium-creative-v1.mjs`, sin modificar la productora LEGACY.
- Acepta exclusivamente un **brief Fénix SEO-001 post 960 PREPROD**, con `publish_authorized=false` y `paid_provider_requested=false`.
- Incorpora logotipo **original sin recrearlo**, fuente Montserrat cargada desde bytes físicos validados y una composición vectorial editable de producción propia.
- Paleta registrada de Fénix: `#222222`, `#FF5F00`, `#FFB71B`, `#870064` como detalle mínimo y blanco.
- No usa modelos de pago, fotografía de terceros, datos personales, nuevas URL ni APIs que publiquen.
- Protege tipo MIME, magic bytes, tamaño de asset, origen HTTPS exacto, dimensiones, alfa de logo, tipografía real cargada, número de imágenes y límites seguros del titular/subtítulo.
- Carga Playwright **diferida**, para que su importación en la arquitectura principal no requiera `npm ci` y no produzca regresiones.
- Tests: `cerebro/seo-enterprise/v2/tests/seo-premium-creative-v1.test.mjs`.
- CI: `.github/workflows/cerebro-seo-premium-creative-preprod-v1.yml`, solo `contents: read`, ejecuta `npm ci` y Chromium y almacena PNG+recibo en artefacto de GitHub Actions.

### Prueba técnica física (NO aprobación estética)

**[Ejecución #42134348550](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42134348550)** · `SUCCESS`, 3/3 tests y render físico con recurso real de WordPress:
- Imagen `hipoteca-autonomos-cordoba-og-v2-preview.png`, PNG 1200×630, **309.280 bytes**.
- SHA256 PNG `2f042f9a5833560e6f693a76768d0a73eb22ef8267ddf07f0c24578bd5aa72a8`.
- SHA256 fuente `06b16db7a969135d48d38c49183be7fb88d4452e2a3011957c7851941f4e4879`.
- SHA256 logotipo `fae827a598c41645e36d593fa442a53f53f26a4549bb2c76b3686f1c498c498c`.
- `font_loaded=true`; `font_family=FenixMontserrat, sans-serif`.
- Logotipo 2560×1950; 77,54 % píxeles transparentes (medición real Chromium).
- Controles de safe area, dimensión, ausencia de imágenes externas adicionales: PASS.
- `additional_cost_eur=0`; `provider_calls=0`; `uploaded_to_wordpress=false`; `publish_authorized=false`; `tribunal_approved=false`.
- PNG + receipt en artefacto `cerebro-seo-premium-autonomos-preprod-v1` del run.

Comparación de metadatos OLD vs NEW: OLD 43.100 bytes, 1200×630, fuente Arial y marca tipográfica simple; NEW 309.280 bytes, 1200×630, fuente real Montserrat y logo auténtico en tarjeta blanca con composición naranja/amarillo original. **No se ha hecho ni certificado una evaluación comparativa de calidad por humanos o tribunal externo**: `VISUAL_QUALITY_HOLD`.

Un primer cambio hizo rojo el CI de arquitectura al cargar Playwright en fase de importación. Fue corregido con importación diferida y ajuste de sintaxis, sin cambiar el runtime legacy. Ejecución **[42134103160](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42134103160)** terminó `SUCCESS`; run premium **[42134102935](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42134102935)** también `SUCCESS`. Se mantuvieron todas las comprobaciones, sin saltarse tests.

## 3. FORMULARIOS B2B/B2C Y CHECKLIST · CONTRATO EN PREPROD

Datos comprobados del WordPress oficial, sin enviar leads:
- Página B2C `49114` = `/asesor-hipotecario-montilla/`.
- Página B2B `49128` = `/financiacion-compradores-inmobiliarias-montilla/`.
- Ambas contienen `[fenix_seo001_city_form city="Montilla" funnel="STUDY"]` y, en el plugin actual, el mismo recurso lógico `study_montilla`.
- El código del adaptador conserva `landing_url` y `landing_id`; la SQL de ingesta `fenix_prod_web_lead_ingest_server` conserva la carga completa en `source_payload`. Por tanto, **NO consta prueba de pérdida de datos o mezcla de clientes**. El riesgo detectado es falta de segmentación contractual independiente en la capa de formulario/entrega.
- El PDF `FENIX_CHECKLIST_VISITA_PISO_CORDOBA_BORRADOR_V1.pdf` está preparado como archivo de conversación y versión fuente markdown del repositorio, pero **NO está conectado a email ni a WordPress**.

Nueva lógica pura `cerebro/seo-enterprise/v2/runtime/seo-lead-segmentation-contract-v0.mjs`:
- Montilla B2C → `PARTICULARES`, `HIPOTECA_CASO_POR_PERFIL`, `study_b2c_montilla`.
- Montilla B2B → `INMOBILIARIAS`, `INMOBILIARIA_PARTNERS`, `partner_b2b_montilla`.
- Checklist 52656 → `PARTICULARES`, `checklist_b2c_visita-vivienda-cordoba`.
- Consentimiento de privacidad obligatorio para continuar; marketing y newsletter con checkbox independiente (no presumido). Emisiones, inserciones de CRM y entregas expresamente desactivadas.
- Rechaza PROD, otros tenants, staging, hosts falsos, URL con query/PII y solicitudes fuera de las tres rutas congeladas.

**[CI #42134348772](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42134348772)**: 5/5 pruebas `SUCCESS` sobre separación de persona, recurso, finalidad y consentimientos. **NO equivale a alta real en CRM ni newsletters ya segregadas**.

## 4. DIAGNÓSTICO REAL DEL CORREO Y DESCARGABLE

La Edge `fenix-web-lead` está activa y llama a `fenix_prod_web_lead_ingest_guarded_server` con idempotencia, ingestión y alertas. La Edge `fenix-web-lead-alert-worker` utiliza Brevo `/v3/smtp/email` para **avisos internos de lead** a personal Fénix; no hay evidencia de email transaccional con checklist a quien se registra, ni envío diferenciado a dos listas. Los endpoints heredados `fenix-brevo-lead-webhook` e `fenix-brevo-inventory-once` están retirados: HTTP 410 según su código. No reactivarlos.

**Acciones pendientes sin cambios invasivos:** diseño adaptador de entrega compatible con Brevo y consentimientos, contrato mail-template específico, pruebas en PREPROD con buzón de test autorizado, trazabilidad/retención, opt-out/listas de dos audiencias, deduplicación y rollback. No enviar mensajes de prueba a clientes reales.

## 5. MATRIZ DE ESTADO Y GATES

| Entregable | Resultado actual |
|---|---|
| Imagen V2 PREPROD con marca real | **HECHO/PROBADO TÉCNICAMENTE** |
| QA estética independiente D26/D31/tribunal | **PENDIENTE** |
| Importación SEO_IMAGE a WordPress | **BLOQUEADA / NO REALIZADA** |
| 200 URL intactas y ownership existente | **CONSERVADO** |
| Separación contractual B2C/B2B Montilla | **HECHO/PROBADO PREPROD** |
| Separación física en formularios/CRM | **NO VERIFICADA** |
| Checklist PDF preparado | **EXISTENTE SIN ENTREGA** |
| Newsletter y delivery personalizadas | **NO OPERATIVO DEMOSTRADO** |
| Suscripciones nuevas / gasto API | **0** |
| Código / motores de producción reemplazados | **0** |

**Rollback:** todas las capacidades son archivos nuevos en PR DRAFT; dejar sin fusionar las PRs y conservar su evidencia. Ninguna migración/endpoint/tabla/cron de PROD fue alterada. No abrir autonomía recurrente ni ejecutar proveedor IA de pago por esta rama. Proteger App/CRM/SEO/WordPress existentes.

**Siguiente gate recomendado:** revisión visual comparativa contra manual oficial; después PREPROD E2E de entrega transaccional+doble consentimiento y segmentación por lista, antes de cualquier publicación, corrección web o autonomía.
