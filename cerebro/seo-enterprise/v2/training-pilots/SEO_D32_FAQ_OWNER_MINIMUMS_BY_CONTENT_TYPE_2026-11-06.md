# SEO-D32 · Estándar FAQ del propietario por tipo de contenido

**Fuente:** indicación directa del propietario, 6 noviembre 2026. **Motor:** SEO-001. **Empresa:** fenix. **Entorno:** PREPROD. **Versión:** 3.0.0.

## Regla empresarial obligatoria

- **Artículo:** al menos **6** preguntas frecuentes completas y pertinentes.
- **Landing:** al menos **8** preguntas frecuentes completas y pertinentes.
- Cada pregunta debe responder a la intención real de búsqueda de un buyer persona, no repetir preguntas de otras páginas ni forzar preguntas irrelevantes para llenar el cupo.
- Preguntas naturales, encabezados H3 debajo del H2 del bloque FAQ, sin numeración, sin dos puntos, sin «además» ni «en conclusión».
- Respuesta breve y útil, con afirmaciones hipotecarias o jurídicas sujetas a comprobación. No prometer resultados ni aprobación financiera.
- El H1 y los H2 principales permanecen breves, atractivos y distintos según el buyer persona. Las FAQ son parte del contenido visible del artículo, no texto superpuesto a imágenes.
- No crear ni prometer resultados enriquecidos de Google por incluir FAQ. El marcado FAQPage requiere verificación de política, elegibilidad y coherencia con el contenido visible; no se implementa aquí.

## Flujo de generación que debe terminar ejecutando CEREBRO

`SEO-D03` identifica buyer persona → `SEO-D05` intención y preguntas reales → `SEO-D13` redacta mínimo 6/8 Q+A según `content_type` → `SEO-D16` audita afirmaciones financieras → `SEO-D15` aplica el gate determinista `auditSeoFaqContract` → `SEO-D31` comprueba relevancia, duplicados y fuentes → `SEO-D32` registra correcciones → tribunal → autorización individual de revisión. La generación autónoma final **todavía requiere enlazar un agente escritor acreditado**; el gate y los tests de calidad ya existen, no equiparar eso a autonomía editorial completa.

Contrato de calidad ejecutable `runtime/seo-owner-editorial-visual-gate-v2.mjs`. Fuente de criterios `seo-owner-copy-visual-standard-v2-2026-11-06.json`. Política heredada por los roles SEO `seo-owner-excellence-all-roles-policy-v1.json`. Para futuras empresas usar `company_id`, `content_type` y reglas de marca por compañía; no forzar el estilo de Fénix en otras marcas.

## Piloto y evidencia física

- V3 B2C `drafts/2026-11-06-b2c-comparar-pisos-cordoba-v3-faq.draft.html`, **6 FAQ**, SHA256 `6d94b45a7fb7d9a4084ce48e5f430a6fc563a19c1d2a2148c94933212fb37b8f`.
- V3 B2B `drafts/2026-11-06-b2b-derivacion-comprador-cordoba-v3-faq.draft.html`, **6 FAQ**, SHA256 `7469190fb0302007c80ef02f65283ac2044b0f8d21efc5e94cff5c1f060784dd`.
- Prueba de landing sintética con 7 FAQ rechazada y 8 aceptada. No implica que exista una landing real nueva.
- Test ejecutado [GitHub Actions 42205648028](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42205648028) **8/8 PASS**.
- JOB-001/D15/D31/tribunal [42205648004](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42205648004) **4/4 PASS**; estado `TECHNICAL_PRECHECK_PASS_RELEASE_HOLD`.
- Supabase PREPROD `public.cerebro_seo_editorial_queue_preprod_v0`: 2 filas actualizadas a V3 tras verificar OLD vs NEW; `public.cerebro_seo_editorial_technical_qa_preprod_v0`: 2 recibos V3 nuevos, historial V1/V2 conservado. Ninguna fila autoriza publicar, modificar WordPress ni acreditar revisión profesional independiente.
- PR #22 DRAFT, no fusionar; no se han creado publicaciones ni modificado App, CRM o WP publicado.

## Modo de fallo correcto

Si no hay suficientes preguntas útiles y verificables, **HOLD y completar investigación**, nunca añadir relleno para aprobar el contador. Si cambia el texto aprobado, actualizar SHA256 y repetir revisión editorial y tribunal. Solo el propietario y los gates de IAM pueden conceder permisos, nunca el contador de FAQ.
