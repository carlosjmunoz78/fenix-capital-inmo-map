# CEREBRO OS · UMS-001 · V5.4 · Comp. A/B de voz + gates editoriales y legales · 2026-11-09

## Estado operativo y aislamiento
- `company_id=fenix`, `engine_id=UMS-001`, `environment=LAB`, `version=V5.4`.
- **HECHO:** dos MP4 comerciales candidatos ya físicamente renderizados, QA técnica PASS: IG https://drive.google.com/file/d/16MD3EPGc8Y7P_f1L29gSO-R7pdqmdyXh/view , FB https://drive.google.com/file/d/1tF1Ri4nJnh6T3FsRz12sNkNZwWRHRAq0/view .
- **HECHO:** comparación rápida entre A=Kokoro V5.3 y B=Piper es_ES V5.4, mismas escenas y música de cada red, 8 segundos cada una, MP4s 720×1280, 16.02 s:
  - IG: https://drive.google.com/file/d/1KqsGP1tmHY6Lj1PpK8ZKCVv7ZaC51WeQ/view
  - FB: https://drive.google.com/file/d/12RFaEogkJsj2oUZNoqZ0-vOZLeoqP2DG/view
  - Manifest auditable: https://drive.google.com/file/d/1fHBLldThxDBCYbS6a8PQ7ZAyZUgCv63r/view
- **HECHO:** script determinista local de compuerta, QA hashes reales SHA256 + ffprobe/codec/resolución/duración con simulación de orden de publicar: `SAFE_BLOCK_ENFORCED`. Registro JSON: https://drive.google.com/file/d/1_V9tfVDJ09fl2dXJULjt-EjIaCs2DYR3/view .
- **HECHO:** nota de revisión editorial y compliance con copys candidatos: https://drive.google.com/file/d/1167Ap3YRExxaQYh7b5ZA6xDVS-eQ9q4X/view .
- ZIP de audición y guardrail: https://drive.google.com/file/d/1C1740_jTAZiO9lJguc_Lp5W7sgfbKAEi/view .
- **Sin cambios** en App/CRM/Supabase/WordPress/SEO/DNS, Meta, Buffer, main, PROD; no publicación ni gastos de nuevas APIs generativas.

## Datos confirmados y límites
- Música: Mixkit Stock Music Free License https://mixkit.co/license/modal/musicFree/ permite publicación comercial en vídeos de redes y anuncios online, pero no redestribución de pista musical standalone y tiene otros límites.
- Modelo Piper España https://huggingface.co/rhasspy/piper-voices/blob/main/es/es_ES/sharvard/medium/MODEL_CARD : `es_ES`, 2 hablantes, corpus SHARVARD CC BY 3.0 con atribución. Dataset original https://datashare.ed.ac.uk/handle/10283/574; la etiqueta `es_ES` NO certifica calidad interpretativa.
- Landing canónica https://fenixcapital.es/contacto/ existe con teléfono, datos de contacto, aceptación de privacidad y enlace a formulario, pero **NO** hay prueba E2E de envío, leads CRM, trazado UTM ni evento GA4. No confundir página existente con conversión verificada.
- Norma potencialmente aplicable a intermediarios de crédito: Circular 4/2020 Banco de España https://www.boe.es/buscar/doc.php?id=BOE-A-2020-7869 ; inclusión de intermediarios y obligación de claridad, veracidad e identidad de entidad y rol. Los dos vídeos NO anuncian una TAE específica ni tipos o cifras de coste. No inventar números. Revisión jurídica humana antes de difundir.
- El casting global C08/C14 y las 310 vistas pendientes NO se usan en los dos primeros MP4: no bloquear estos dos por desarrollo futuro no incluido; SÍ queda pendiente verificar la licencia y el carácter sintético de la imagen de Lucía y escenarios que efectivamente aparecen.

## Gates en la compuerta
| Gate | Estado | Excepción / acción |
|---|---|---|
| Media hash/codec/ratio/duración | PASS | — |
| Safe zone subtítulos y CTA | PASS sobre archivo final, no prueba en UI de Meta | — |
| Música uso comercial online | PASS_DOCUMENTED | — |
| Identificación del idioma `es_ES` del modelo | PASS_DOCUMENTED | — |
| Acento/prosodia auténticos por escucha | PENDING | LOW_CONFIDENCE |
| Atribución SHARVARD en el copy final y derechos de entradas visuales | PENDING | LEGAL_REQUIRED |
| Revisión de claims, rol de intermediario, copy | PENDING | LEGAL_REQUIRED |
| Preview real Instagram/Facebook | PENDING_CONNECTION | LOW_CONFIDENCE; navegador Opera no respondió / Browser precisa extensión |
| Tracking UTM / formulario / eventos GA4/CRM | PENDING_E2E | LOW_CONFIDENCE |
| Aprobación expresa de publicación | NOT_GIVEN | no inferir permiso para campaña pública |

**Regla determinista:** `APPROVED=false` y `PUBLISH=false` mientras cualquiera de los gates obligatorios no esté PASS. Los tests de bypass de publicación deben rechazar la orden aunque los MP4 sean válidos.

## Próxima acción específica SIN NUEVAS GENERACIONES
1. Escuchar ambos A/B y seleccionar la voz por acento, pronunciación de «Fénix», credibilidad, emoción y ritmo (V5.3 Kokoro / V5.4 Piper).
2. Cerrar revisión jurídica de copys y atribución de corpus (ley y licencias concretas).
3. En navegador autenticado apto para Meta, comprobar previews IG/FB y los CTAs con la red REAL sin publicar, capturar evidencias.
4. Verificar formularios y eventos de conversión con el mecanismo E2E ya existente, sin invadir App/CRM ni registrar datos personales en logs.
5. Cuando los gates estén realmente VERDES, entregar candidato para aprobación final; no publicar por defecto.

## Backups y rollback
- V0–V5.4 y raw intactos. Candidatos de voz comparados por hashes. Source original y ZIP V5.4: https://drive.google.com/file/d/1AtoWDeaXnI_PaoikLj4fl105b46nnaFQ/view .
- `CONSERVAR → ENTENDER → ENVOLVER → PROBAR → MEJORAR → MIGRAR`.
