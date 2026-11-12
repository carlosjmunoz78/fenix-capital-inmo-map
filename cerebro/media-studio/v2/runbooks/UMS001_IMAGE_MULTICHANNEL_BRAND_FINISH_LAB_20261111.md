# UMS-001 · Postproducción multiformato V1 · LAB · 11/11/2026

Se conserva íntegro el compositor existente `ums001_igc202601_brand_carousel_compositor_v1.py` y las interfaces de la Productora. Este módulo añade un exportador universal para las 11 piezas de la orden `UMS001-MULTICHANNEL-IMAGE-11-20261111-V1`, **sin renombrar ni sustituir la implementación actual**.

**Criterios automáticos comprobados:** bytes JPEG originales y SHA256 externo, proporción nativa del proveedor (LinkedIn 16:9 nativo -> 1200×628), 11 dimensiones canónicas, subtítulos de máximo 6 palabras y 42 caracteres, rechazo de reclamos de financiación no acreditados, titular seguro y salida HTML SEO sin logo ni texto dentro de píxeles. El logo social SOLO se extrae del registro existente `FENIX_OFFICIAL_01_PNG_BASE64.json` tras verificar `FENIX_OFFICIAL_01`, procedencia `OFFICIAL_MR_BOGART_2025` y **SHA256 original**. Si falta o cambia el logo, bloquea.

**Manual de marca 2025:** paleta `#222222`, `#870064`, `#FFB71B`, `#FF5F00`. Montserrat está reservada para el propio logotipo, **no para titulares publicitarios**; se utiliza tipografía de sistema distinta. Mantener área de convivencia y tamaño mínimo. El encuadre óptimo depende del canal y necesita revisión independiente para que el logo no oculte caras/elementos esenciales. No inventar, modificar ni regenerar logotipos.

**Salida:** `*_BRANDED_QA_REVIEW_ONLY.webp` y su manifiesto SHA. Es **únicamente vista previa técnica**: `final_editorial_approved=false`, `delivery_allowed=false`, `publish_enabled=false`, `video_gate_allowed=false` incluso cuando postproducción técnica pasa. Nunca reclamar 88/100 si no existe rubric fiable y verificación editorial/derechos independiente. Ninguna llamada de pago o publicación.

**Ejecución aislada**:

```bash
python3 cerebro/media-studio/v2/runtime/ums001_multichannel_brand_finish_lab_v1.py \
  --source /ruta/imagen-original.jpg --sha256 <SHA256-real-del-original> \
  --item-id LI-FEED-01 --headline 'Antes de firmar' --out /tmp/ums001-qa-only
```

**Estado de imágenes**: 7 inferencias originales, 6 rechazadas, 1 Seedream4 LinkedIn prometedora pero sin QA válida; 0 aprobadas. Los 11 prompts existentes no son 11 imágenes físicas. PR #45 en DRAFT; App, CRM, SEO, sociales, WordPress y PROD intactos.

**Pruebas**: `tests/test_ums001_multichannel_brand_finish_lab_v1.py` + workflow offline sin secretos. No avanzar a vídeo ni activar entrega/publicación autónoma hasta que `IMAGE_GATE_GREEN` demuestre imágenes reales ≥88, derechos, logo, integridad, E2E y rollback.

**Rollback:** eliminar el nuevo módulo de la rama DRAFT; no hay tablas, rutas de producción ni clientes alterados.