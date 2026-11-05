# CEREBRO SEO · Biblioteca histórica de URLs, copy e imágenes

**05-11-2026 · Fuentes verificadas, sin repetir auditoría de toda la web.**

GitHub repo `carlosjmunoz78/fenix-capital-inmo-map`, rama `cerebro/seo001-staging-audit-v5-20261018`.

ZIP V4 `docs/web-baseline/2026-10-18-v4/CEREBRO_FENIX_STAGING_BASELINE_2026-10-18.zip`, SHA256 `59944be1aba38d15a29991e7aa27579941382fc6dae701ef6032adfeae2f2b04`.

El `manifest.json` enumera 204 URLs, HTML/texto/JSON de copy exacto por URL, imágenes y usos (680 imágenes), enlaces internos (42.073) y árbol de dependencias. La copia previa de los CSV permanece en `docs/web-baseline/2026-10-18/`.

Notion: [inventario SEO](https://app.notion.com/p/3ad3ba78c8b9449986bbcddc06bff687), [arquitectura AS-IS](https://app.notion.com/p/3b481b1a756d81029a0cfa76a35cade3), [auditoría V4](https://app.notion.com/p/3fd81b1a756d8119b558c4dc9c4f6548).

**Obligatorio para planificar marketing:** consultar activos históricos, copy, imágenes, ALT, usos, derechos conocidos, enlaces, canónicos, CTAs, buyer persona y funnel. Proponer delta incremental sin inventar un inventario nuevo ni recrawlear la web. Las landings de pueblos se armonizarán una a una, usando ciudades de referencia.

**Limitación:** ZIP y manifest verificados por presencia en GitHub, pero no se han materializado 204 copys ni 680 imágenes en JOB-001. STAGING octubre no equivale a PROD noviembre; reconciliar exclusivamente la URL seleccionada antes de cualquier cambio. Esta recuperación NO autoriza WordPress PROD, publicación ni gastos.

## Lectura física del ZIP en un runner LAB

El nuevo lector `cerebro/seo-enterprise/v2/runtime/seo-historical-web-assets-reader-v1.py` comprueba el SHA256 del ZIP original, rechaza rutas peligrosas y duplicados, lee `urls.csv`, `images/images.csv` e `images/image_usage.csv`, y construye un índice URL→imágenes con nombre, ALT, uso y presencia o ausencia de derechos. Conserva la referencia de las copias HTML/TXT/JSON sin regenerarlas ni capturar páginas de WordPress. El workflow se ha extendido para hacer checkout **de solo lectura** de la rama histórica e invocar el lector desde GitHub Actions. El indexado es una reconstrucción puntual en CI; **no es todavía montaje persistente ni producción de 32 especialistas**. Hasta obtener la prueba verde, el estado físico de esta etapa es PENDIENTE VERIFICACIÓN.

La fase de marketing utilizará el registro y las rutas para planificar, y solo abrirá una URL concreta para correcciones cuando se ordene. No se hará recrawl global ni se modificarán imágenes, CSS o páginas.
