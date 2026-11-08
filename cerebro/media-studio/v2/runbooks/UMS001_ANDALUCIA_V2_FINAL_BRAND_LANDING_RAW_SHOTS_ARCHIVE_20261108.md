# UMS-001 · Andalucía · V2: cierre fluido + archivo reutilizable · 2026-11-08

## Estado comprobado
- **HECHO · Render físico**: `FENIX_CAPITAL_ANDALUCIA_CINEMATICO_MASTER_V2_CIERRE_FLUIDO_1080x1920.mp4` — 44,0 s, H.264/AAC, 1080×1920, 24 fps, 51.361.356 bytes, SHA-256 `3c07fdcf0bb1b882545a98a144728f34c78808a6b89d92340c15538e63f0af0e`, vídeo y audio decodificados sin errores.
- **HECHO · Máster base 720×1280** — 44,0 s, 30.422.614 bytes, SHA-256 `3eeea9363a76810833878ad50079e4b059728315b34756d8b01b628755c909e1`.
- **HECHO · 8 originales Runway Gen-4.5 preservados individualmente** en [03 · Planos IA / Vídeo bruto](https://drive.google.com/drive/folders/1g3iB0lUzqbemDTTKnA9jsIfbk1n8BJCs); bytes y SHA-256 contrastados con manifests de los tres trabajos GitHub Actions.
- **HECHO · 9 fichas de activos** en la base existente [Notion · Recursos de Producción](https://app.notion.com/p/7b135ed0bf0542eba0f680a9be5bb6fd) (8 fuentes + 1 máster V2), con enlaces individuales a Drive.
- **HECHO · Banda sonora original** en [04 · Audio](https://drive.google.com/drive/folders/1w0gmk4Exjwbh4EoEvNyWDUYDfEZkK5Jj); logotipo canónico en [01 · Identidad](https://drive.google.com/drive/folders/1RtFNXTiFeWiVBS-OZPJO6Sj6UbG9SylL); script de montaje editable en [06 · Proyectos](https://drive.google.com/drive/folders/1gTRokVnzyC9J_NpFZk9YL4JQDOqZnNwy).
- **POR VALIDAR · aprobación editorial/legal final**: fidelidad geográfica, derechos del proveedor, experiencia visual de cliente; presupuesto real pendiente de reconciliar.
- **Publicación**: OFF; NO promoción PROD. No se requieren nuevas llamadas IA de pago para esta revisión V2.

## Enlaces finales
- [Máster V2 alta resolución, pendiente de QA](https://drive.google.com/file/d/1DSYypJDBuZO0oF2C-5wH38X-AGD8UZjm/view?usp=drivesdk).
- [Máster V2 nativo 720, pendiente de QA](https://drive.google.com/file/d/1MCPXcuvWpa9wA9yRUrtqQIJ3M8KkGy20/view?usp=drivesdk).
- [Inventario técnico con prompts, identificadores, duración, hash, proveedor, coste previsto](https://drive.google.com/file/d/1zK2dfdjQdXhBQlE_Zjj7tCVfyUvG4xqg/view?usp=drivesdk).
- [CEREBRO · Google Drive almacén audiovisual](https://drive.google.com/drive/folders/1Wv8bBkwj-_mXXFd5UA8KBTZ58PtADykH).

## Corrección de la entrada al logotipo
El V1 usaba `xfade=fadeblack` de 0,62 segundos al terminar el plano del fénix, interponiendo un oscurecimiento perceptible antes de una tarjeta estática.

El V2 **elimina este corte negro**. En t=38,75 s utiliza el fotograma exacto del vídeo original como primer fotograma de un nuevo segmento dinámico de 5,25 s. Se aplica una desaceleración cinematográfica de la escena en el eje del ave, un ambiente violeta-ámbar que crece mientras las chispas se calman, una revelación independiente del logotipo **original del manual de marca** y la aparición escalonada de «Cerca de ti / en toda Andalucía». El rótulo de confianza entra después y el conjunto se mantiene hasta el fotograma final. No hay wipes, flashes ni efectos slash.

Audio: banda sonora orquestal original sincronizada, final con fundido en los últimos 0,95 s, normalización a -16 LUFS objetivo y true peak -1,3 dB objetivo. Exportación 1080 reescalada desde material base 720 sin afirmar que se hayan inventado detalles de resolución.

## Contrato de almacenamiento y reutilización
Cada clip original queda como asset **RAW** independiente con:
`company_id=fenix`, `engine_id=UMS-001`, `environment=LAB`, `version=RAW_V1`, `shot_id`, `filename`, `duration`, `model=runwayml/gen-4.5`, `prediction_id`, `prompt`, `sha256`, `estimated_cost_usd`, `drive_url`, `notion_asset_id` (en fichas), `rights_status`, `qa_status`, `publication_status`.

**Regla:** cualquier versión corta, outro, intro, anuncio, web hero o adaptación territorial será un **DERIVADO** con referencia al plano RAW; jamás regrabar encima del original. No duplicar bibliotecas; Drive conserva bytes, Notion indexa, GitHub documenta contratos, App/CRM/WordPress/Supabase PROD intactos.

La versión corta para Reels está **PLANIFICADA, aún no generada**; el propietario pidió primero pulir y revisar la versión larga.

## Evidencia fuente
- GitHub Run [3 clips de monumentos](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42483862459)
- GitHub Run [4 clips de costa/campo/calles](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42486887848)
- GitHub Run [1 clip de fénix](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42487268363)

## Reversibilidad
Máster V1 original conservado intacto; V2 nuevo nombre. El código y datos existentes en `main`/App/CRM no han sido modificados en este cierre. Si se rechaza la V2, se restituye la V1 sin afectar ni eliminar originales.
