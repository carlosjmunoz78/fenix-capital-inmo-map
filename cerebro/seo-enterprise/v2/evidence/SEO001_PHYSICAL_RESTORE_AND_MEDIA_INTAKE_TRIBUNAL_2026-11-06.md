# SEO-001 · Contrato físico y tribunal común · 2026-11-06

**company_id:** fenix · **engine_id:** SEO-001 · **environment:** PREPROD · **version:** 0.1.0 · **PR:** #22 DRAFT.

## Evidencia física verificada

### 1. Backup y restauración en MariaDB aislada

El flujo `.github/workflows/cerebro-seo-wordpress-isolated-restore-v0.yml` levanta **MariaDB 11.8 en Docker efímero sin red** (`--network none`). No introduce credenciales ni archivos de WordPress de producción.

Se crearon **tres registros sintéticos representativos** en `wp_posts` (uno publicado protegido y dos borradores de ejemplo con slugs de los pilotos), y su metadato de SHA de artículo en `wp_postmeta`. Se realizó backup SQL real `mariadb-dump --single-transaction`, luego se alteraron registros y metadatos deliberadamente y se **restauraron los bytes originales dos veces**. La segunda restauración demostró comportamiento idempotente para este conjunto de prueba.

- [GitHub Actions run **42247533380**](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42247533380), **SUCCESS**, **3/3 tests PASS** más restauración real de fixture.
- Recibo de ejecución `SYNTHETIC_MARIADB_PHYSICAL_BACKUP_RESTORE_PASS`.
- Archivo ZIP `seo001-isolated-wordpress-fixture-restore-no-prod-snapshot`, artifact ID `13518237189`. Incluye SQL sintético y recibo con SHA256.
- **No se ha importado la base real de Fénix**. No se han restaurado todos los esquemas de WordPress Core, plugins, usuarios reales, archivos multimedia ni configuraciones. Es una prueba física de recuperación **del procedimiento**, no una prueba de recuperación integral de producción.
- El validador `seo-wordpress-isolated-restore-receipt-v0.mjs` prohíbe marcar como VERDE la puerta de restore real del sitio basándose en esta prueba.

### 2. Recepción física de imagen con FFmpeg en nube

La tarea `.github/workflows/cerebro-seo-ums-photo-physical-intake-v0.yml` instala FFmpeg open-source solo en el runner temporal de GitHub y crea un fixture WebP original de prueba. Después **lee** una imagen pública ya existente de la biblioteca propia de WordPress `obra-nueva-cordoba-card-cerebro.webp`, genera una derivación técnica de 1200×630 WebP para **comprobar la ingesta**, y calcula SHA256 más pHash DCT-8×8 de los píxeles. Esto no usa PC local.

- [GitHub Actions run **42248337759**](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42248337759), **SUCCESS**, **5/5 tests PASS** y comprobación real de la imagen descargada.
- La imagen derivada tiene SHA256 `4fcc6c09b587fd9b49034b92008ea86f9af18d259ab50ae499c9b5d0ad247187`; no se considera candidata publicable ni fotografía original UMS.
- Recibo `PHYSICAL_WEBP_PIXEL_PREFLIGHT_PASS_PUBLICATION_HOLD`, artifact ID `13518628463`.
- El validador `seo-ums-photo-physical-intake-v0.mjs` impide que un GIF/PNG/PDF, un tamaño incorrecto, un archivo fuera de la zona de trabajo, una huella duplicada, una licencia autoafirmada o una entrega fotográfica con QA visual pendiente autoricen subir a WordPress.
- **NO se ha conectado un proveedor de generación fotográfica ni generado una imagen original para los artículos.** No se ha comprobado su limpieza visual ni la licencia por un profesional. No se ha editado ninguna imagen de producción.

### 3. Tribunal real de artefactos de distintos motores

El flujo `.github/workflows/cerebro-seo-physical-release-tribunal-v0.yml` descarga **tres artefactos reales e independientes**: los dos V4.1 corregidos, la restauración SQL sintética y el recibo técnico de imagen. Exige hashes exactos de los artículos y verifica integridad física del SQL, esquema de permisos y estados de origen.

- [GitHub Actions run **42248914390**](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42248914390): **4/4 tests PASS** y ejecución física de tribunal, artifact ID `13519123892`.
- SHA256 del informe JSON `5aec40e9196955728960d3c1979e4ba5528f531573c9dd8dca46c597d1917da9`.
- Veredicto **`PHYSICAL_EVIDENCE_COMPLETE_FOR_TESTS_RELEASE_HOLD`**.
- Las V4.1 superan verificaciones deterministas de 1.000+ palabras, 750+ fuera de FAQ, seis FAQ, H1/H2 y coincidencia exacta del SHA.
- **No se atribuye** revisión humana o jurídica independiente, derechos de fotografías, restauración integral del sitio, aprobación del titular ni autorización de escritura. La prueba incluye rechazos de SHA alterados, media falsa y recibos de backup con falsos indicadores de PROD.

## Puertas reales que siguen pendientes

1. **UMS-001 imagen original**: proveedor fotográfico cloud autorizado, credencial con IAM, modelo y coste por operación verificables; dos imágenes **realmente distintas**, sin texto ni logos, con derechos de uso acreditados y QA de píxeles.
2. **WordPress restore integral**: obtener backup **reciente y verificable** del propio WordPress real mediante canales seguros, copiarlo a un entorno aislado, restaurar allí toda la base y uploads, probar integridad, permisos mínimos para *draft only* y rollback, sin tocar PROD.
3. **Tribunal editorial/YMYL**: revisión independiente del contenido V4.1 y de sus afirmaciones, fuentes, canibalización, enlaces y cumplimiento legal. La corrección de nueve expresiones anteriores no asegura que el resto esté perfecto.
4. **Promoción y automatización**: firma de exactos SHA, comprobación del slug en WordPress real y las políticas de coste, un borrador físico controlado, y solo después evaluar publicación autónoma.

## Seguridad y coste

`GITHUB_ACTIONS_PREPROD=HECHO`; `WP_FIXTURE_RESTORE=HECHO`; `UMS_BYTE_INGEST=HECHO`; `CROSS_ENGINE_TRIBUNAL=HECHO`; `REAL_WP_BACKUP_RESTORE=NO`; `UMS_ORIGINAL_PHOTO=NO`; `PROD_AUTONOMY=NO`.

Sin nuevas suscripciones. No se han activado APIs de generación de pago, ni nuevas llamadas a Gemini, ni escrituras a WordPress. Se han usado minutos de GitHub Actions y paquetes open-source en runners efímeros; su facturación depende de los límites existentes del repositorio, por lo que no se afirma un extracto de gasto 0 € sin comprobar consumos. El WordPress real conserva Core Guard y su bloqueo de escrituras.
