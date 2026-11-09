# CEREBRO OS · UMS-001 · Preflight editorial A/B voz y conversión · LAB · 09-11-2026

## Identificación y seguridad
- `company_id=fenix`; `engine_id=UMS-001`; `environment=LAB`; `version=5.4`; `APPROVED=false`; `PUBLISH=false`.
- Corte objetivo: resolver riesgo de voz peninsular/natural, claims, fuente de imágenes, preview Meta, E2E funnel y autorización. No tocar main, PROD, App, CRM, WordPress, Supabase, DNS, SEO ni Buffer.
- Gate determinista **fail-closed** ejecutado en local: `NO_GO` seis aprobaciones sin evidencias. Cuatro escenarios de tests PASS (estado inicial, true sin atestación, atestaciones completas sólo para revisión separada, hash alterado bloqueado). **El guard no tiene API de publicación**.

## Artefactos físicos y preservación
- V5.4 Instagram: https://drive.google.com/file/d/16MD3EPGc8Y7P_f1L29gSO-R7pdqmdyXh/view · SHA256 `96b6706fcf4b25c1a4d4d7b4ca4e54d02633533bfd331f2a497bf4c5a3741a2a`.
- V5.4 Facebook: https://drive.google.com/file/d/1tF1Ri4nJnh6T3FsRz12sNkNZwWRHRAq0/view · SHA256 `0719afaa934f7a3e5ec969f076fea67f41047ed3c6ebb761a1351c98d8052a14`.
- A/B audición **sólo voces**; 25.2 s cada archivo, primero 12s V5.3 Kokoro / silencio1.2s / 12s V5.4 Piper: IG https://drive.google.com/file/d/1eAz-9mXgS5-UjEbzENH-rWTX4aCJSxH8/view ; FB https://drive.google.com/file/d/1QtuJBUtEUFbwZjQpYKEudvYw5uZCGPmm/view . A/B **no contiene** la música licenciada Mixkit para evitar redistribuir pistas aisladas.
- Safe-zone simulación de 4 fotogramas **NO UI REAL de Meta**: https://drive.google.com/file/d/1KVfl5OV7pLEUPNIFqI6quoXXtjvwySnY/view . Margen de anuncios top 269 px / bottom 672px / lateral65px 1080x1920, previsualización nativa pendiente.
- Informe completo con riesgos / copys preparados: https://drive.google.com/file/d/1pUM7t-dJTxeMQEgYiNiuw6Bt1TGg3wrg/view .
- Salida guard 6 bloqueos: https://drive.google.com/file/d/1wIasb0vAUP-vixiM4xyrtLM21ojoMKXf/view .
- **Backup reproducible** ZIP (13 archivos, 1.61 MB): https://drive.google.com/file/d/125u4XXJb7Q3sUf94F0w_cqVFLtCP13hD/view, sha256 `6b5c7ec7a112c3b538440a088a07ff8f3c4d4bbeb851bac06c961312aa3fb637`; incluye `ums001_prepublication_guard_v0.py` (sha256 `20968a2bc22f379e44f92794a2f02766fbefdaa8a2c60612cec6a176cf0c0c09`), manifiesto, JSON NO_GO, script A/B y fotogramas. No incluye MP3 standalone Mixkit.
- Notion QA Asset: https://app.notion.com/p/41381b1a756d813a9c83fa1cd5f2e032 · **Bloqueado**, independiente de assets IG/FB V5.4 originales: https://app.notion.com/p/41381b1a756d8189aba0fbe512188144 y https://app.notion.com/p/41381b1a756d810691becef060e85e6e.

## Derechos y normativas verificados
- Música Mixkit permite posts sociales y marketing online comercial, pero prohíbe música standalone, Content ID, TV/radio/CDs/videojuegos y música sólo remix: https://mixkit.co/license/modal/musicFree/ . IG 'Dreaming Big' y FB 'Driving Ambition', Ahjay Stelino; licencias de otros assets NO cubiertas por Mixkit.
- Voces Piper Sharvard están identificadas `es_ES` y 2 speakers por model card (dataset CC BY 3.0): https://huggingface.co/rhasspy/piper-voices/blob/main/es/es_ES/sharvard/medium/MODEL_CARD . Etiqueta es_ES **NO** demuestra acento audible ni naturalidad. Conservar atribución; última revisión legal pendiente.
- Banco de España publicidad bancaria https://www.boe.es/buscar/act.php?id=BOE-A-2020-7869 ; afirmaciones financieras no engañosas, sin garantizar concesión de hipoteca.
- Meta contexto transparencia IA https://about.fb.com/es/news/2024/04/etiquetado-de-contenidos-generados-por-inteligencia-artificial-y-contenidos-manipulados/ y Ads AI https://about.fb.com/news/2025/02/gen-ai-transparency-metas-ads-products/amp/ . Criterio de divulgación del montaje específico por verificar en app.

## Embudo real: sólo lectura
- WordPress PROD página `contacto`, id 46037, publicada https://fenixcapital.es/contacto/; vídeo muestra ese URL. Formulario/consentimiento/tracking **NO** probados end-to-end.
- WordPress PROD página `pre-ok-hipotecario`, id 49152, publicada https://fenixcapital.es/pre-ok-hipotecario/; CTA 'Pedir mi Pre-OK' utiliza shortcode `[fenix_seo001_city_form city='Córdoba' funnel='STUDY']`; candidato más específico, **no** probado que el shortcode funcione en móvil ni envíe al CRM. No cambiar enlaces en PROD sin prueba.
- En Instagram orgánico generalmente la URL de pie de foto no es clicable. Verificar el enlace real de bio o usar sticker de Historia antes de publicar. No pagar por links. Las URLs UTM de borrador no acreditan eventos GA4/CRM.
- Intento de lectura Meta vía conexiones de navegador en chat: Browser requiere contexto original; dos Opera sin respuesta tras 30s. No se ha revisado Meta nativamente ni modificado cuenta alguna.

## Six gate owners (no automatizar approvals)
1. `LOW_CONFIDENCE` voz A/B castellano España, pronunciación Fénix, naturalidad, emoción.
2. `LEGAL_REQUIRED` claims y atribución; sin prometer aprobación.
3. `LEGAL_REQUIRED` fuentes/identidad de escenas y personas IA.
4. Meta preview comprobada orgánico / ads en interfaz.
5. Formulario Pre-OK/Contacto probado con dato sintético y tracking con evidencias, sin alterar CRM PROD.
6. `PUBLISH` requiere aprobación final versionada y por canal, separada de evaluación técnica.

## Economy and next action
- Nuevo gasto adicional de APIs IA = 0 €, suscripciones nuevas = 0; minutos GitHub/antiguos no conciliados.
- Antes de publicar: escuchar las A/B; autorizar sólo el mejor audio con QA, revisar jurídico, pruebas Meta/formulario; publicar únicamente tras gate específico. Originales V0-V5.3 conservados y rollback por versiones Drive, sin cambios destructivos.
