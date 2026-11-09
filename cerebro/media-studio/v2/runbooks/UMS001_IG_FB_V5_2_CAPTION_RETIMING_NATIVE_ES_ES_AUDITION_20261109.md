# CEREBRO OS · UMS-001 · Instagram/Facebook V5.2 · LAB

Fecha 2026-11-09. `company_id=fenix`, `engine_id=UMS-001`, `environment=LAB`, `version=5.2`.

## HECHO · Entrega física, idempotencia, backup
- Instagram V5.2: https://drive.google.com/file/d/1xftL42cdrRpBEc84vF8yfox40UMirqoH/view · 19.955s · 16,189,088 bytes · SHA256 `207d7a81cef8aa034191fb0d038ec6fc5608be9b155216dbd5b32c98ded89797`.
- Facebook V5.2: https://drive.google.com/file/d/1yBqtgKnQ7RobrZSG8StpKGZGyQkPplDs/view · 22.262s · 23,620,766 bytes · SHA256 `86c56062fa0987f541aa1bbaaf3abb9a7292f7fd4c912766a201604420adac7c`.
- QA y derechos documentados: https://drive.google.com/file/d/1ac61WrukMdBAR36yn52yGuusJn6DwjM3/view
- Paquete ZIP con 2 MP4, 2 ASS, manifiestos de QA, montaje reproducible y muestras Piper es_ES: https://drive.google.com/file/d/1iFG5lFp2eAWdpje89aja0iKFtNbnuDF0/view · SHA256 `89fc84a40d9a18013aef8ff5c5d4077a8789436e7892b6d0cc891c988ca4d90e`.
- Notion IG V5.2: https://app.notion.com/p/41381b1a756d810fa544e1813cf56a2d; Facebook V5.2: https://app.notion.com/p/41381b1a756d81148ceddd39cccd0ccc.
- Ambos registros son `Estado del asset=Bloqueado`, `Entorno=TEST` (Notion carece de etiqueta LAB; LAB consta en metadatos), sin publicación.

## Corrección técnica en V5.2
- La V5.1 Kokoro 82M contenía 7 frases por canal, con desplazamiento de última frase aprox. +0.37s IG, +0.303s FB. V5.2 re-rendea el cuerpo desde **clips originales sin subtítulos** y ajusta ASS a tiempos efectivos del manifiesto de voz. Además aplica un guardrail de al menos 50ms entre frases, para **0 superposiciones** de diálogos.
- No parchea texto sobre texto anterior. Conserva encuadre 1080×1920, H.264 30fps, 800 px de margen inferior, gancho desde primer segundo, outro V4 con CTA a `fenixcapital.es/contacto/`.
- El audio AAC **es idéntico bit a bit** a V5.1 para ambos: IG SHA256 stream `3814d18efeacb49ec2772494cf5d1c085fefbf4d55ca47f111ce293663306b46`; FB `14b70468acfde4eed75503afa50bb4e031f4d62bf7fb127e62fea3469f4f3e85`. Son voz Kokoro y música V0, ninguna voz HeyGen Free.
- Validado `ffprobe` y decodificación completa FFmpeg. Imágenes de QA del inicio, mitad, último subtítulo y logo incluidas. **Técnico PASS**, no equivale a clearance editorial/comercial.
- Los originales Runway RAW y las versiones V0–V5.1 permanecen intactos, sin tocar App/CRM/Supabase/WordPress/SEO/DNS/main/PROD/Buffer.

## Comparación gratuita de voces nativas de España, NO INSTALADAS en el Reel
- Workflow aislado GitHub Actions https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42542341098 · SUCCESS · artifact 13641263522, sin tokens ni generación pagada.
- Voz masculina `Piper es_ES-davefx-medium`, español de España explícito según MODEL_CARD, dataset CC0; muestra 6.525 s, SHA256 `f6769215baa0595ba2dde4b7d20090d2e6c1a8ecc53410050d1ee3d5d4feeec6`, https://drive.google.com/file/d/1cvpzmkIiORpOIWjH0h78H-9WQTZzQ7VJ/view . Prueba de escucha, no aprobada.
- Voz femenina `Piper es_ES-mls_9972-low` (CC BY 4.0 con atribución), muestra 31.344 s para una frase corta, duración incompatible con Reel; RECHAZADA para estos guiones sin reautorizar ni reentrenar; https://drive.google.com/file/d/1rz93XyGCkJrBgmrZDJNPOhcNIc8bWpem/view .
- Kokoro `ef_dora` / `em_alex` son voces `es` genéricas, sin etiqueta ni validación específica `es_ES`; **audición de acento España PENDIENTE**. No afirmar que suenan peninsulares porque el texto esté en castellano.
- Referencias licencia: https://huggingface.co/rhasspy/piper-voices/blob/v1.0.0/es/es_ES/davefx/medium/MODEL_CARD ; https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md .

## GATE DERECHOS / LEGAL · PARCIAL, NO PUBLICAR
- Runway aclara que generalmente permite uso comercial de outputs generados: https://help.runwayml.com/hc/en-us/articles/18927776141715-Usage-rights . Replicate asigna output al cliente con reservas por derechos de terceros: https://replicate.com/terms . Esto REDUCE la duda sobre licencia de salidas Runway pero no verifica derechos de todos los inputs ni accuracy arquitectónica.
- **La banda sonora orquestal de 44s NO tiene procedencia y licencia documentadas** en los traspasos disponibles. El archivo WAV carece de tags sobre creación/licencia; no equivale a que esté libre de derechos. `MUSIC_RIGHTS=UNKNOWN` = NO PUBLICAR. Se debe encontrar proyecto fuente/registro de autoría o sustituir por obra cuyo origen y permisos consten; no silenciar el riesgo.
- Pendientes: revisar casting y consentimiento si personas reales; evidencias de prompts, música, licencias de marcas/logos, claims hipotecarios, derechos, inspección visual en Meta y tracking de formulario/UTM.
- `COMMERCIAL_RELEASE=BLOCKED`; `PUBLISH=false`; `AUTOPUBLISH=false`, `MONEY_LIMIT=0€` adicionales.

## Siguiente bloque exclusivo
1. Escuchar voz Kokoro vs muestra Piper es_ES; no sustituir si la voz Piper resulta robótica. Buscar voz femenina es_ES con fuente y derechos claros, coste cero, si es necesario.
2. Resolver origen/licencia de la música o crear/reutilizar pieza musical propia con trazabilidad y calidad suficiente para no degradar el montaje.
3. Si todo es apto, V5.3 solo nueva voz/música conforme derechos; QA de preview Meta y CTA; registrar hash, costes y aprobación. Si no, mantener el bloqueo.
