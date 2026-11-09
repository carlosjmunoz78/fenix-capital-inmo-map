# UMS-001 · V5.4 · ES español España Piper + Mixkit, cierre seguro Meta · 2026-11-09

## Identidad, contención y estado
- `company_id=fenix`, `engine_id=UMS-001`, `environment=LAB`, `version=V5.4`.
- `PUBLISH=false`, `APPROVED=false`, `COMMERCIAL_RELEASE=BLOCKED`, `EDITORIAL_QA=PENDING`, `TECHNICAL_QA=PASS`.
- Mantener V5.3 (Kokoro) como OLD y V5.4 (Piper es_ES) como NEW candidato. Ningún despliegue PROD, ninguna publicación ni suscripción. App/CRM/Supabase/WordPress/SEO/DNS/Buffer/main intactos.

## Entrega física verificada / Drive
- IG V5.4 LAB 19.955s: https://drive.google.com/file/d/16MD3EPGc8Y7P_f1L29gSO-R7pdqmdyXh/view ; SHA256 `96b6706fcf4b25c1a4d4d7b4ca4e54d02633533bfd331f2a497bf4c5a3741a2a` ; bytes 16,386,177.
- FB V5.4 LAB 22.262s: https://drive.google.com/file/d/1tF1Ri4nJnh6T3FsRz12sNkNZwWRHRAq0/view ; SHA256 `0719afaa934f7a3e5ec969f076fea67f41047ed3c6ebb761a1351c98d8052a14` ; bytes 23,852,987.
- Paquete íntegro V5.4 (27 entradas; MP4s, 14 WAV originales Piper, scripts, manifiestos, capturas, ASS, copy) **sin MP3 standalone Mixkit**: https://drive.google.com/file/d/1AtoWDeaXnI_PaoikLj4fl105b46nnaFQ/view ; SHA256 ZIP `fa4f2c852a0ded1704f700ff0c41730245d5aa6f84350423d7e39eb79f2ed934`.
- Manifest final QA: https://drive.google.com/file/d/1QzCTf5bMVW0uQnett58814IlJF2bdmhb/view .
- Capturas reales QA: https://drive.google.com/file/d/1T8O_fO0YkGBKOG12EW1KGy1OZ-69KXRa/view .
- Copys pendientes revisión legal: https://drive.google.com/file/d/1WSRUxzeVx9GN1jrM9gUFu3X34PZFn9ue/view .
- README rebuild/rights: https://drive.google.com/file/d/10jpNnSGDhuH9Sa2TaqBRCQbePAk3Pkpc/view .
- Notion IG: https://app.notion.com/p/41381b1a756d8189aba0fbe512188144 .
- Notion FB: https://app.notion.com/p/41381b1a756d810691becef060e85e6e .
- NOTION `Estado del asset=Bloqueado`, `Entorno=TEST`; entorno lógico y artefactos `LAB`, sin aprobación de publicación.

## Voices / copyright / modelo
- GitHub Actions one-shot run https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42574112980 SUCCESS. Se generaron 14 WAV / 7 IG / 7 FB con `es_ES-sharvard-medium` Piper (speaker 1 femenina y 0 masculino). sin secretos ni llamadas API IA de pago, 0 suscripciones. Artefacto de Actions `13654546934`.
- Official Model Card https://huggingface.co/rhasspy/piper-voices/blob/main/es/es_ES/sharvard/medium/MODEL_CARD: `es_ES` Spain, 2 speakers, dataset training license CC BY 3.0 with attribution. NO afirma naturalidad o acento humano verificado; la `locale` no sustituye al oído. Si se distribuye, añadir atribución indicada en README/copy.
- Música Mixkit: IG `Dreaming Big` y FB `Driving Ambition`, Ahjay Stelino, license https://mixkit.co/license/modal/musicFree/ para redes comerciales y anuncios de marketing online; NO música standalone, no vídeo TV, radio, CDs, videojuegos ni Content ID. Las pistas se verificaron por SHA en build previo y no se redistribuyen aisladas.
- La nueva mezcla NO contiene voces HeyGen Free ni música orquestal 44s de procedencia desconocida.

## Tests físicos pasados
- FFprobe/FFmpeg: decodificación completa sin errores; video H264 1080×1920 30fps y AAC.
- Duraciones precisas (IG 19.955s; FB 22.262s), sin recorte de audios.
- Sonoridad IG −16.09 LUFS TP −1.97 dBTP; FB −16.13 LUFS TP −1.60 dBTP, ambos sin saturación.
- 7 eventos de subtítulos per red, margen inferior 800 px, sin superposición interfrase. Hook visual desde frame 0.
- El CTA del outro heredado de V5.3 en y~230 tenía riesgo de superposición con interfaz Meta y logo. Se reconstruyó a partir del outro original V1 **sin banner anterior**, con CTA al rectángulo seguro `x=123..957, y=282..374` en 1080×1920 y rótulo 'SOLICITA TU PREESTUDIO' / 'fenixcapital.es/contacto/' sin tapar logotipo ni copy.
- En la segunda operación solo se modificó VÍDEO; la pista AAC de V5.4 master es exactamente idéntica bit-a-bit después del ajuste. Se guardaron master candidato e imágenes reales para comprobar OLD vs NEW.
- URL `https://fenixcapital.es/contacto/` existe y muestra formulario de contacto. NO se ha enviado formulario, ni validado GA4, consentimientos, tracking/UTM o conversiones. Referencia de lectura pública 2026-11-09.

## Gates NO cerrados (no publicar)
- **LOW_CONFIDENCE:** audición auditiva por humano que compruebe acento peninsular natural, pronunciación 'Fénix', cadencia/emoción y comparación A/B con Kokoro V5.3. No validar por metadato `es_ES`.
- **LEGAL_REQUIRED:** revisión final de derechos de entradas visuales, IA, rostros/consentimientos de cualquier persona real, logo, atribución CC BY 3.0 y claims financieros (no aprobar hipotecas por promesa).
- Previsualización real en Instagram y Facebook (UI orgánica / campaña si se contrata), verificación caption safe y CTA.
- Confirmar funcionamiento formulario y medición propia de leads UTM en GA4/CRM sin modificar producción de forma invasiva.
- Casting 31 candidaturas con C08/C14/Marina por validar; no iniciar 310 variantes hasta 3-4 poses aceptadas por actor y coste explícito.
- `COMMERCIAL_RELEASE=BLOCKED` hasta los gates anteriores. Los MP4 son candidatos LAB, no piezas publicadas.

## BACKUP, RESTORE, RUNBOOK
- V0-V5.3 y RAW originales protegidos y sin modificación; V5.4 aislada en rama propia. Regla `CONSERVAR → ENTENDER → ENVOLVER → PROBAR → MEJORAR → MIGRAR`.
- Rebuild disponible en ZIP `FENIX_UMS001_V54_VOCES_ESPANA_MUSICA_LICENCIADA_LAB_20261109.zip` (scripts `build_v54_piper_native_esES.py`, `refine_brand_safe_cta.py`, `verify_v54_final_safe.py`), necesita 5 fuentes Runway, Lucía original, outro V1 por red y dos pistas Mixkit descargadas bajo su licencia; no empaquetar pistas de terceros por separado.
- No sobrescribir hashes previos ni asumir que el gasto total es cero: solamente 0 nuevas API de IA de pago, 0 nuevas suscripciones; tiempo de GitHub Actions aún no conciliado.
- Al cerrar gate editorial: elegir OLD Kokoro V5.3 o NEW Piper V5.4 por calidad real. Toda aprobación se registrará y se comprobará previsualización antes de cualquier programación.
