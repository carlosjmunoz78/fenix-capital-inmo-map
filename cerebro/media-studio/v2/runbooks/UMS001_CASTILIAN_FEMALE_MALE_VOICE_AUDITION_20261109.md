# UMS-001 · Pruebas de voces femeninas y masculinas de España · 2026-11-09

**company_id=fenix / engine_id=UMS-001 / environment=LAB / version=es-ES-piper-voices-v0 / PUBLISH=false**

## Ejecución y artefactos físicos
- Workflow: https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42573071257 · SUCCESS. Runner privado, sin credenciales de pago, ninguna contratación, 2 WAV en artifact `13654087238`.
- Voz **femenina** `es_ES-sharvard-medium`, speaker_id=1, 6.467s, SHA256 `86d74d5fb2a06f1eb706fd7b4a8d03c3d118920a2f221c34aa386d559e821db1` · https://drive.google.com/file/d/1xa4MHKfc-CX1AQqXbqoGkPvjKdHFkoft/view
- Voz **masculina** `es_ES-sharvard-medium`, speaker_id=0, 6.351s, SHA256 `df4ad93299e004573c40c230566c652eea2642cc96f11569f52abf6884c2794d` · https://drive.google.com/file/d/16XWyGMdjuKd858966_H-JSbz5DW38qHF/view
- Modelo https://huggingface.co/rhasspy/piper-voices/blob/main/es/es_ES/sharvard/medium/MODEL_CARD , lengua `es_ES (Spanish, Spain)`, 2 speakers (M/F), dataset licencia **CC BY 3.0**. Si se usa una voz comercialmente hay que respetar atribución y demás condiciones.
- Registro de QA interno y licencia: https://drive.google.com/file/d/1YeLCPxZ8milS5APFpv19zQMWf1kDI4kg/view .
- Notion audiciones: femenina https://app.notion.com/p/41381b1a756d81878c3ff1fe08f79441 , masculina https://app.notion.com/p/41381b1a756d81b19935fae4499860ff .

## Límites
- Estas muestras **NO se han montado ni sustituido en los Reels V5.3**. Los dos V5.3 llevan voz Kokoro original (etiqueta `es`, no verificable solo por metadatos el acento castellano).
- Pendiente selección editorial por escucha de acento peninsular, prosodia, énfasis, naturalidad y pronunciación de «Fénix Capital». Escoger por sonido real y adecuación a publicidad, no solo por campo locale.
- Si se aprueba Piper es_ES, generar 7 segmentos completos con control de speed/tiempos, versionar V5.4 sólo en LAB y reasentar subtítulos, conservando V5.3.
- `MODEL_LICENSE=CC BY 3.0 WITH ATTRIBUTION` no transfiere propiedad exclusiva de la voz a la empresa y no constituye aprobación de contenido.
- `MUSIC_RIGHTS=LICENSED` en V5.3 a través de Mixkit Stock Music Free License; el vídeo integral sigue sin pasar QA de claims, input/casting, meta preview y conversión.
- No producción/CRM/Supabase/WordPress/SEO/Buffer, no suscripciones nuevas, `PUBLISH=false`.
