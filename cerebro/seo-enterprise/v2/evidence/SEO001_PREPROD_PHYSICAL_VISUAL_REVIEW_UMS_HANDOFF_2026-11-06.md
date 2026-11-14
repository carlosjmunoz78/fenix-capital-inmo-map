# CEREBRO SEO-001 · Vista previa y encargo UMS-001 · evidencia física

**Fecha:** 2026-11-06. **Empresa:** fenix · **motor:** SEO-001 · **ambiente:** PREPROD · **versión:** V3 FAQ.
**Resultado:** `PHYSICAL_HTML_PREVIEWS_GREEN_AND_PRODUCER_ORDERS_READY`; `PRODUCER_PHOTO_GENERATION_NOT_EXECUTED`.

## Reutilización comprobada

- Redacción V3 existente preservada y vinculada a JOB-001. Se utilizan los dos artículos con 6 FAQ cada uno, 12 FAQ en total, H1 y H2 naturales, cero numeración y expresiones prohibidas.
- `runtime/seo-editorial-preview-and-producer-handoff-v0.mjs` reutiliza `loadVerifiedWorkItem`, `auditOwnerEditorialCopy`, `buildSeoProducerImageOrder` y `validateSeoProducerOrder`, sin nuevo escritor SEO paralelo.
- El renderizador histórico `CREATIVE-PROGRAMMATIC-RENDER-V1` admite titulares y marcas de fabricante en gráficos, y **no es válido** para la nueva norma de imagen SEO fotográfica limpia. No se modifica ni desinstala. El encargo de foto se dirige a `UMS-001` y solo puede pasar a su adaptador fotográfico autorizado y separado, después de gates de identidad, costes, calidad, licencia y permisos.

## Prueba CI real

[Run 42207089272](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42207089272) — **SUCCESS**, 3 tests correctos, 0 fallidos.

Artefacto real `seo001-fenix-b2c-b2b-v3-visual-review-ums-orders`, GitHub artifact ID `13497585418`, tamaño comprimido 12.628 bytes. Retención GitHub 14 días, caduca 20-11-2026 si no se cambia. Archivo abierto desde la página de la ejecución en sección **Artifacts** (requiere acceso GitHub).

Seis archivos producidos físicamente por el código del motor en el runner, sin intervención de redacción de ChatGPT en ese proceso de composición.

1. `index.html` — índice móvil de revisión.
2. `compradores.html` — página final estructurada con las 6 FAQ B2C.
3. `inmobiliarias.html` — página final estructurada con las 6 FAQ B2B.
4. `compradores-ums-image-order.json` — solicitud de fotografía B2C, prompt visual y metadatos.
5. `inmobiliarias-ums-image-order.json` — solicitud de fotografía B2B totalmente diferente, metadatos propios.
6. `manifest.json` — huellas SHA-256 y límites de autorización.

Los archivos HTML tienen etiqueta robots `noindex,nofollow,noarchive` pero **no son URLs públicas**, solo artefactos descargables. La foto se muestra como marcador claramente identificado, no como resultado inventado.

## Conteo y hashes actuales

| ID | Rol | SHA256 HTML | FAQ |
|---|---|---|---|
| `SEO001-FENIX-B2C-EDITORIAL-001` | PARTÍCULAR | `6d94b45a7fb7d9a4084ce48e5f430a6fc563a19c1d2a2148c94933212fb37b8f` | 6 |
| `SEO001-FENIX-B2B-EDITORIAL-002` | INMOBILIARIAS | `7469190fb0302007c80ef02f65283ac2044b0f8d21efc5e94cff5c1f060784dd` | 6 |

## Seguridad y compatibilidad

- Sin modificación de WordPress, App, CRM, contenido SEO publicado ni Supabase PROD.
- Sin consumo de API de imágenes, nuevos servicios, envíos de newsletter ni datos personales.
- Sin fusionar PR #22, sin scheduler productivo nuevo y sin subir archivos a WordPress.
- Los briefs declaran imagen solo visual, sin texto, logo o marca de agua **dentro de los píxeles**. La generación, derechos, revisión visual y control de duplicados exigen evidencias del **archivo físico**, aún inexistente.
- No afirmar que CEREBRO redactó autónomamente los textos. CEREBRO ejecutó el ensamblaje físico, validaciones y órdenes a partir de dos borradores humanos/ChatGPT. Falta conexión del generador autónomo y del canal de recepción de la productora.

## Próximos gates reales

1. Configurar el escritor especializado SEO-D13 con el Model Router existente, usando preferentemente herramientas contratadas/locales. No usar plantillas huecas ni repetir contenido sin investigación.
2. Probar que un motor CEREBRO produce por sí mismo un tercer borrador desde brief y fuentes, y que D31 verifica buyer persona, claims, estilo, 6/8 FAQ y canibalización.
3. Enlazar pedidos UMS-001 a productor real fotográfico sin letras/logos, recibir binario+metadatos+licencia y auditar unicidad por hash perceptual contra inventario.
4. Probar snapshot, restauración y permiso de crear **borrador** en Cowboy/Core Guard antes de escribir en WordPress.
5. Solicitar aprobación editorial por versión y autorización de publicación independiente; probar medición antes de escalar o replicar a otra empresa.

**Conclusión de estado:** preview visual de estructura **HECHO**, productor foto **PARCIAL**, redacción autónoma **PENDIENTE**, publicación **BLOQUEADA**. Mantener historial V1 y V2.
