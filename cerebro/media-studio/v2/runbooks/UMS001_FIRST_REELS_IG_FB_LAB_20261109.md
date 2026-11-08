# UMS-001 · Primeros encargos Instagram/Facebook · LAB · 2026-11-09

## Entrega física
- Instagram V0: https://drive.google.com/file/d/1vLbB7oIu0TRR-xgRqSXhGQUnIdztqE66/view
  - MP4 vertical 1080×1920, 23.710351 s, SHA256 `be36b8241134b701c119faebd532f352ec7955eaa02749463932219f9a0704c8`
- Facebook V0: https://drive.google.com/file/d/15NfKSLN-c4Nx0Zy5atODc0ps_gMO4c_q/view
  - MP4 vertical 1080×1920, 27.218 s, SHA256 `aac3b18a45592ee4a65d208ca588991c6aed27b56b9c2ceb6c7eaa3b6604e723`
- QA casting 31: https://drive.google.com/file/d/1KaOxH8sA3JAkAekBcRWEi68gaulB1ryA/view
- Manifest: https://drive.google.com/file/d/1egJDR0o8V7hArcdGOnPEK3JlYm6du8Rk/view
- Narración / bloqueo de integración: https://drive.google.com/file/d/1tj9YZv5-Ajfdzi7zCKpqppA68uJCMtUK/view
- Estado y gates: https://drive.google.com/file/d/1v1y4f5YsqsUDymPfd717Tb0js_K0n7K3/view

## Alcance real / QA
- `environment=LAB`, `company_id=fenix`, `engine_id=UMS-001`.
- Se utilizaron los clips Runway y música originales ya archivados; reutilizados intros/outros cortos de cada red. Nada sobrescrito.
- Hook desde segundo cero, subtítulos sobre zona segura: bottom margin ASS 430px. En imágenes de control a 0.9 s se ve hook y subtítulo legibles.
- Locuciones sintetizadas mediante HeyGen (cuenta Free): IG voz Lucía Ortega (~16.74s), FB voz Fernando Sanz (~18.81s), parámetros `language=es`, `locale=es-ES`. **La pronunciación/acento castellano no se ha comprobado auditivamente**.
- **Importante**: los dos MP4 entregados incluyen banda sonora original y subtítulos, pero **NO tienen la locución HeyGen incrustada**. El runtime de render local no pudo descargar los MP3 remotos. Están disponibles sus URL y request IDs en el archivo de locuciones de Drive; no volver a generarlos a ciegas ni consumir créditos duplicados.
- Se decodificaron fotogramas de apertura, centro y outro en ambos MP4. Full-view QA y sincronía/ducking de narración PENDIENTES.
- El material de escenarios IA son recreaciones sintéticas y no evidencian inmuebles en venta, ni localizaciones exactas. 
- Casting: 31/31 candidatos existentes; dHash de 31 retratos sin pares con distancia <= 6, **NO es reconocimiento biométrico ni garantiza rostros distintos**. Incidencias C08, C14 y continuidad de Marina pendientes de QA.
- Publicación real, App/CRM/Supabase/WordPress/DNS/PROD/main: INTACTOS.
- Coste nuevo de imagen/vídeo en esta iteración: 0 € (reutilización de archivos). El proveedor de voces muestra plan Free; consumo de cuotas y coste final no conciliados.

## Next block único
Recuperar las dos salidas de voz ya existentes en un runtime con descarga autorizada; auditar que sean castellano de España; montar voiceover con mezcla/ducking de banda original, sincronizar subtítulos y exportar MP4 V1 nuevos sin sobrescribir V0. Revisar físicamente audio y vídeo completos; solo tras QA etiquetar APPROVED y archivar en Notion.
