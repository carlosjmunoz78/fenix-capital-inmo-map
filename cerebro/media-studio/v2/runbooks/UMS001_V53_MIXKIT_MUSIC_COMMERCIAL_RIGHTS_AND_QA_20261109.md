# UMS-001 · IG/FB V5.3 · Música comercial licenciada · LAB
Fecha de auditoría: 2026-11-09. `company_id=fenix`, `engine_id=UMS-001`, `environment=LAB`, `version=5.3`, `PUBLISH=false`.

## ACTUACIONES CON RESULTADO FÍSICO
- Descarga original de dos pistas de Mixkit en el runner https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42571395779 (SUCCESS). Primer intento por URL de descarga devolvió 403; segunda ruta CDN oficial `/music/31/31.mp3` y `/music/32/32.mp3` SUCCESS. Artifact privado de runner `13653033709`. **No reintentar ni redistribuir MP3 aislados**.
- Mixkit Stock Music Free License: https://mixkit.co/license/modal/musicFree/ . Autor: Ahjay Stelino. Permite uso comercial y anuncios de marketing online, redes sociales; no música standalone, sin apropiarse de autoría ni Content ID, no TV/radio, CDs/DVDs ni videojuegos.
- Pista IG «Dreaming Big»: https://assets.mixkit.co/music/31/31.mp3 · sha256 `8c89819547b42a80750fb25f37a960a1f45f6fd66bc8d784ac817b98b002897c`, inicio de montaje en segundo 60.
- Pista FB «Driving Ambition»: https://assets.mixkit.co/music/32/32.mp3 · sha256 `e3c88488e65b8c87a6f06120983ce2cb12ea3aeba99f8cadb7ee5d6d284ef2c6`, inicio de montaje en segundo 48.
- Dos vídeos V5.3 nuevos, coste adicional de IA de pago 0 €. **Instagram** 19.955 s, 1080×1920 H264/AAC, sha256 `1115ff2486bac2e715376539cd811f71308337f923d3f09740c38c2148bf4867`: https://drive.google.com/file/d/1P5TSDX7063y-HLRdhmLa87ORovt03vPL/view .
- **Facebook** 22.262 s, 1080×1920 H264/AAC, sha256 `ae203aa53db4786626cf78cb548d1c1dd4113abd9cd0207f4a3ab77301a77bdd`: https://drive.google.com/file/d/1MYvF5QZo6wyx0XhQYbGL1n-hFKCD89b4/view .
- 2 vídeos con H264 bitstream idéntico a V5.2; audio completo reemplazado, **sin voz HeyGen Free, sin WAV de 44s sin procedencia**. Voz Kokoro 82M Apache-2.0 preservada, acento España pendiente escucha.
- Voz + música con music ducking, fade breve y fade final; audio ~−15.14/−15.46 LUFS, true peak −1.68/−1.70 dBTP. Manifest de render: https://drive.google.com/file/d/1futnXqhtpDGsgyN9Bp7gvlkvCmhQtAQH/view .

## BACKUP Y REBUILD
- Paquete físico V5.3 (sin MP3 standalone de Mixkit): https://drive.google.com/file/d/16F2lTs1i9U7FvbyCECm9s6pE0flgclVi/view .
- Contiene los dos MP4, manifiestos SHA256, URLs fuente, licencia, controles, extractos de capturas, el script reproducible `render_v53_mixkit_licensed.py`, y composición alternativa propia no utilizada `create_fenix_signature_original_score.py` junto a WAV generados localmente sin muestras.
- Rebuild: 1) recuperar fuentes V5.2 + WAV voz Kokoro de V5.1; 2) recuperar fuente Mixkit desde URLs oficial sujetas a términos; 3) verificar SHA256; 4) ejecutar `python render_v53_mixkit_licensed.py`; 5) verificar hash H264 bitstream igual a V5.2 y nueva banda audible, codec/duración/loudness; 6) guardar manifest y ZIP. Nunca subir músicas Mixkit aisladas para redistribución.
- Página Notion Instagram: https://app.notion.com/p/41381b1a756d81b78ad6e23f1e2149bb (Bloqueado); Facebook: https://app.notion.com/p/41381b1a756d8199b9e3d6ef8ff548b8 (Bloqueado).
- Matrices OLD/NEW: V0–V5.2 sin sobrescribir, V5.3 con nueva mezcla legal; reversión: usar entregables originales en Drive, no eliminar.

## COMERCIAL NO PUBLICABLE TODAVÍA
- Música: licencia particular documentada como apta para vídeos comerciales online, se ha resuelto el bloqueo anterior del WAV, pero Mixkit no licencia otros materiales por sí.
- Faltan evaluación auditiva de acento **castellano de España**, habla natural y pronunciación «Fénix», aprobación editorial; diferencia `es` Kokoro genérico vs `es_ES` Piper candidato.
- Revisar autorización/rights de entradas de modelos, escenas y casting (incluidas familias C08/C14 y Marina), uso del logo, exactitud de lugares; NO presentar IA como fotografía de inmuebles ofertados.
- Comprobar claims hipotecarios, CTA https://fenixcapital.es/contacto/ y conversión real/UTM/GA4, preview Instagram/Facebook en UI móvil antes de publicar.
- `COMMERCIAL_RELEASE=BLOCKED`, `APPROVED=false`, `PUBLISH=false`. No mover a Buffer/Meta, ni App/CRM/Supabase/WordPress/SEO/DNS/main/PROD.
- Coste adicional en generaciones IA = 0 €. No nueva suscripción. GitHub Free usage y facturación histórica no conciliados.

## FACTORY MÚSICA · REGLA PARA FUTUROS MOTORES
Cada asset musical de terceros necesita `provider`, `author`, `title`, `source_url`, `sha256`, `license_url`, `allowed_use`, `attribution_requirement`, `restrictions`, `rights_status`, `asset_id`, `environment`, `version`; además el proyecto final debe diferenciar `MUSIC_RIGHTS=VERIFIED` de `VIDEO_COMMERCIAL_RELEASE=BLOCKED/APPROVED`. Priorizar reutilización, Mixkit gratis acreditado y composición sin muestras; prohibido confundir música con licencia comercial con propiedad intelectual exclusiva de Fénix.
