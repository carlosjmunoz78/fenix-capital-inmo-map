# UMS-001 · Entrega IG/FB V4 · Safe-zone + CTA + QA técnico (LAB, 2026-11-09)

## Identidad, aislamiento y gate
- company_id: fenix; engine_id: UMS-001; environment: LAB; version: V4; publish: false.
- HUMAN_REQUIRED solo ante LOW_CONFIDENCE (acento/QA), LEGAL_REQUIRED (licencias/claims), MONEY_LIMIT si presupuesto no autorizado.
- Prohibido modificar App/CRM/Supabase/WordPress/DNS/SEO/PROD/main, Buffer o activar publicación; versiones V0/V1/V2/V3 y RAW preservadas.

## Artefactos físicos entregados y verificados por lectura de vuelta
| Canal | Archivo Drive | Duración | Tamaño | SHA256 |
|---|---|---|---|---|
| Instagram | https://drive.google.com/file/d/1rZhqbX6T9sXXU47x2P6dnq1-khClP0Ae/view | 19.955s | 13236383 bytes | 9a061d54b74aec004e65259f789399cdbc6d666f4a47f21153784a1e4e22dde4 |
| Facebook | https://drive.google.com/file/d/1yxiEgFs3rMdkQgUQF8nxg7Wp_O7Ki-AU/view | 22.262s | 18847390 bytes | b22fc67e49fa446374a7223e8ab785b9a619f597a8a060538406f4f0b505ed83 |

- Notion Instagram V4 QA pendiente: https://app.notion.com/p/41381b1a756d81939162f0ab2fc8889a
- Notion Facebook V4 QA pendiente: https://app.notion.com/p/41381b1a756d81d1b517e3536974e154
- Evidencia JSON QA: https://drive.google.com/file/d/1c3F6RF4Tw9_cVndkLWRYQoDdcS7fJbox/view
- Copy + URLs UTM previstas (SIN PUBLICAR): https://drive.google.com/file/d/1mS3TaPvbEf2qA2QPfW8smXyeLlKWe4Nl/view
- Casting QA dirigido: https://drive.google.com/file/d/1A0k64TMMqC1rjRA4nMMx_EDoVf4gn3SR/view
- Separación de órdenes reales: https://drive.google.com/file/d/1XVTglNhic9RbS2jRABd00I4jV3yMLylo/view

## Control de calidad técnico superado
- Meta Reels Ads referencia de safe-zone: 14% top (269px), 35% bottom (672px), 6% sides (~65px) en 1080×1920. Referencia de 40% para disclaimers (~768px). Original V2 tenía margen inferior de 430px = insuficiente para safe-zone Ads.
- V3 nueva recompuesta a partir de **vídeo fuente sin subtítulos incrustados**, NO se movieron subtítulos sobre V2 horneada; estilo ASS nuevo: Sub MarginL/R=80px; MarginV(bottom)=800px.
- V4 añade en el outro CTA visual 'SOLICITA TU PREESTUDIO' + 'fenixcapital.es/contacto/' a partir de la entrada de logo, posicionado en banda superior dentro de safe-zone. URL destino verificada por lectura web 2026-11-09; destino de GA4/UTM real aún sin prueba.
- H264/AAC, 1080×1920, 30fps, duración igual a V2. Hash SHA-256 del stream AAC V4 idéntico a V3 y V2 para cada canal: no se redigitalizó la voz.
- Audio preexistente en es-ES, mezcla música+locución, sin regeneraciones; sonoridad integrada V3: -16.4 LUFS (IG), -17.0 LUFS (FB). Grabación castellano peninsular solo configurada; **acento no auditado por oído**, pendiente.
- Movimiento de vídeo detectado en primer segundo: IG diferencias medias 21.13/19.69 niveles en muestras; FB 17.46/18.86. Gancho tipográfico desde fotograma 0, capturas revisadas.
- Modelo de coste en este bloque: FFmpeg reutilización física (0 llamadas IA), 0 € de nuevas generaciones. Facturación real de proveedores anteriores no conciliada.

## Bloqueos de publicación
1. HUMAN_REQUIRED: LOW_CONFIDENCE · audición integral de voz y verificación CASTELLANO DE ESPAÑA (no inferir por etiqueta es-ES), pronunciación Fénix y prosodia.
2. HUMAN_REQUIRED: LEGAL_REQUIRED cuando proceda · derechos de voz/modelo, fuente musical, escenas y claims de asesoramiento hipotecario; no prometer aprobaciones automáticas.
3. Prueba real de UI Instagram/Facebook (orgánico y anuncio si se contrata); en Ads Manager la previsualización es obligatoria.
4. Verificar formularios y URL de conversión en sitio con consentimientos y eventos (no inferir GA4 por UTM).
5. Casting aún SIN APROBAR: Lucía + 2 Kontext, Hugo/Mateo +1, Marina con silla visible; C08/C14 escenas grupales pendientes; C14 edad, C02 y C03 rasgos del brief pendientes.
6. Las imágenes IA de paisajes son ilustrativas: no representarlas como ubicaciones exactas o inmuebles reales.

## Cola Notion leída sin modificar
La tabla 'Fábrica de Contenido · Órdenes de Producción' retornó 43: 36 Aprobado / Final, 3 Pendiente, 2 En producción, 1 QA Legal y 1 Bloqueado. Dos OP abiertas reales son **carruseles educativos** Instagram de prioridad Baja con prohibiciones internas expresas, no encargos nuevos de vídeo. El resto de abiertas son TEST. No se modificaron OPs.

## Regla de selección de modelos / coste
1. Preferencia: assets originales + edición FFmpeg / scripts deterministas (coste adicional 0).
2. Voz: conservar MP3 HeyGen ya generados hasta escuchar y aprobar. Si no son castellano peninsular, evaluar proveedor disponible gratuito sin volver a pagar sin control.
3. Anclas: FLUX 1.1 Pro y FLUX Kontext Pro generaron los candidatos previos; el precio histórico estimado NO constituye tarifa actual ni autorización de gasto.
4. Movimiento nuevo: Runway Gen4.5 solo si los originales no sirven y la comparativa calidad/precio y presupuesto límite están verificadas.
5. No iniciar 310 vistas. Primero aprobar 1 actor y pilotar 3–4 vistas; llevar manifiesto con actor_id + anchor_sha256 + rights + QA + cost.
6. Promoción y publicación tras contratos, permisos, QA editorial/legal, backup, observabilidad, reversibilidad y PREPROD aplicable. Prohibido tocar App/CRM real.

**Estado final:** dos V4 físicamente archivadas y técnicamente PASS; publicación OFF, editorial/legal PENDING; librería original íntegra.
