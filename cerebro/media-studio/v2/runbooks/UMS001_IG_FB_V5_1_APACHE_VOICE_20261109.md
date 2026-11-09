# CEREBRO OS · UMS-001 · IG/FB V5.1 Kokoro español open-licensed · 2026-11-09

## ENTREGADO FÍSICAMENTE · LAB / NO PUBLICAR
- Instagram V5.1: https://drive.google.com/file/d/1ejOReqRCnq_bW6IxTaFHlgmSlzKaSYic/view · 19.955s · 13,239,970 B · sha256 `125207c5da9684f32131b4c34e782e1d4b316fe4eee21dcd8d431a7eba9e9dbb`.
- Facebook V5.1: https://drive.google.com/file/d/1RWGqTOy9nmB_wshqnEBpq9mnbVuUz1ix/view · 22.262s · 18,846,735 B · sha256 `080693a342c26f8dc8f8d7b9f60930935e4a2a68f36899c34b0de3f9c24bf025`.
- QA físico: https://drive.google.com/file/d/1DKXdHjbA8HZvLEjqLgYtCTZuVoG49LQj/view · H264/AAC 1080x1920 30fps, video stream exact V4 image hash, −16.3 LUFS audio true peak −1.7/−1.6 dBFS; `technical_gate=PASS`.
- Entrega completa con 14 segmentos y manifest: https://drive.google.com/file/d/10Xr3OF-eHLEjC9KKwTnI7fSRrdcOuuwj/view.
- Archivo de origen de voces (14 segmentos, 2 actores) obtenido de Github Actions https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42539851459 · `success`; artifact `13640562873`. Audio fuente nuevo guardado en Drive: IG https://drive.google.com/file/d/1YtsPaCETQ6r_cjV4vf5uV1h7qnn20bok/view y FB https://drive.google.com/file/d/1gMDewfjutJ_4lRElzcs7W51fma95zukf/view.
- Notion Assets V5.1 como `Bloqueado` a espera de derechos/QA: IG https://app.notion.com/p/41381b1a756d81c98b39d1584f48cc15 · FB https://app.notion.com/p/41381b1a756d81c5b041df9e9d225aee.
- Estado README en Drive: https://drive.google.com/file/d/1gVGRaGDosfvdkeCT6I8kVB6143bcG0l4/view.
- app/CRM/Supabase/WordPress/SEO/DNS/Buffer, main, PROD: **intactos**. No publicación. No generación IA de pago ni compra de plan.

## Modelo y economía
- `hexgrad/Kokoro-82M` https://huggingface.co/hexgrad/Kokoro-82M, licencia publicada Apache-2.0; sintetizador libre: `kokoro==0.9.4`, `KPipeline(lang_code='e')`.
- Voces IG `ef_dora`, FB `em_alex`. Ambas del catálogo «Spanish (es)», **no garantizan acento peninsular**; exige escucha editorial.
- Se generaron siete WAV originales por vídeo en runner GitHub aislado; fueron descargadas y remezcladas localmente con banda sonora existente V0 (sin voz HeyGen). La **pista de voz HeyGen Free está ausente**. V4 y V2 originales preservados exclusivamente para QA interno y BLOQUEADOS para uso comercial.
- Control de gasto: `0` nuevas API de pago, `0` nuevas suscripciones. No se ha certificado facturación histórica ni rights de proveedores.
- Voz Kokoro ritmo 1.15x natural, cierre audio segment7 difiere aprox. +0.37s IG / +0.30s FB de las marcas de subtítulos de V4. Optimizar retiming en V5.2 antes de release.

## Contratos / QA / riesgos
- V4 imagen exacta conservada: encuadre vertical, hook desde primer segundo, subtítulos desde original en `MarginV=800px`, CTA visible de web `fenixcapital.es/contacto/`.
- VO TTS y mezcla: reconstituida desde 14 WAV Kokoro + banda V0, `loudnorm -16LUFS -1.8 TP`. Importante: música y clips Runway originales siguen sujetos a derechos pendientes; asset registry 8 planos dice literalmente `PROVIDER_COMMERCIAL_TERMS_REVIEW_REQUIRED`.
- `HUMAN_REQUIRED: LOW_CONFIDENCE` para audición de acento España y fonética «Fénix»/naturalidad, y sincronía de último subtítulo.
- `HUMAN_REQUIRED: LEGAL_REQUIRED` cuando se necesite revisión derechos/claims. Nunca presentar escenas IA como inmuebles reales.
- QA Meta preview en Instagram/Facebook y medición CTA/GA4 pendientes. No se puede declarar comercialmente aprobado.
- Casting 31 candidatos y cinco ediciones Kontext existentes; cero nuevos ángulos de 310 aprobados; familias C08/C14 y Marina pendientes.

## Continuidad
- Repo branch exclusiva `cerebro/ums001-kokoro-es-lab-v0-20261109`.
- Preparación `CONSERVAR → ENTENDER → ENVOLVER → PROBAR → MEJORAR → MIGRAR` aplicada. Los cambios quedan fuera de PROD y sin modificación destructiva.
- Próximo paso operativo: V5.2 reajustar subtítulos conforme a tiempos de Kokoro sin recomprimir/inventar voz; escuchar dos cortes; QA derechos música/Runway; después decidir paso comercial. Si la voz no parece española de España, sustituir por opción confirmada antes de aprobar.
