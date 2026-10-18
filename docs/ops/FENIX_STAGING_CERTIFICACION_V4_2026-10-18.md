# FÉNIX CAPITAL · STAGING · CERTIFICACIÓN V4 · 2026-10-18

**Company:** `fenix-capital`  
**Environment:** `STAGING`  
**Scope:** cierre técnico SEO/web en PREPROD.  
**PROD touched:** **NO**  
**Branch de evidencia:** `cerebro/seo001-staging-audit-v5-20261018`

## Estado

### HECHO
- Se completó la validación determinista del bloque objetivo de 67 URLs sin reabrir auditorías ya cerradas.
- Se confirmaron las 8 sustituciones de imagen previstas y su presencia en STAGING.
- Se corrigió en WordPress el enlace interno obsoleto de la entrada `post_id=764`: `https://staging.fenixcapital.es/familias/` → `https://staging.fenixcapital.es/hipotecas/hipoteca-100/familias/` (2 reemplazos en `post_content`).
- El baseline whole-site V4 se regeneró después de ese cambio; escaneo, contrato, empaquetado y subida del artifact inmutable finalizaron correctamente.
- El ZIP exacto V4 y su SHA256 quedaron además persistidos de forma duradera en `docs/web-baseline/2026-10-18-v4/` mediante un workflow de recuperación que no repitió el escaneo.
- URLs de contenido snapshot: **204**.
- Targets internos únicos comprobados: **212**.
- Targets internos rotos: **0**.
- Targets internos con redirección: **2**.
- Los 2 redirects residuales son archivos de autor (`/author/fenixcapital/` y `/author/mrbogart/`) que resuelven a la home de STAGING; el redirect legado `/familias/` ya no aparece en el grafo final.
- Imágenes registradas: **680**; binarios con error de recuperación: **0**.
- Export errors: **0**.
- Logs de error WordPress/PHP y WPCode consultados durante el cierre: sin errores activos devueltos.
- En el registro de media, las imágenes utilizadas no presentan `alt` vacío a nivel de metadatos de media. Las 147 filas con `alt` vacío de `image_usage.csv` son exclusivamente relaciones `featured_media_id` sin `src`, no instancias `<img>` renderizadas. La inspección renderizada previa identificó además un `alt=""` decorativo asociado al píxel oculto de Meta; no se trató como imagen de contenido.

### EXISTENTE
- Snapshot previo de preservación en `docs/web-baseline/2026-10-18/`, conservado sin sobrescritura destructiva.
- Snapshot exacto V4 duradero en `docs/web-baseline/2026-10-18-v4/CEREBRO_FENIX_STAGING_BASELINE_2026-10-18.zip`.
- Artifact inmutable de GitHub Actions: ID `12120333543`, generado por el job `117554274470` del run `39083584923`.
- SHA256 del ZIP exacto V4: `59944be1aba38d15a29991e7aa27579941382fc6dae701ef6032adfeae2f2b04`.
- Persistencia duradera recuperada con run `39087004545`, job `117555562499`: **SUCCESS**.
- Evidencia determinista del baseline V4: 204 URLs, 212 targets internos, 0 rotos, 2 redirecciones residuales, 680 imágenes y 0 errores de exportación.

### PARCIAL / RESIDUO NO BLOQUEANTE
- El pie nativo de Astra (`Funciona gracias a Tema Astra de WordPress`) continúa renderizándose además del footer legal/branded de Fénix Capital. Es un residuo cosmético/profesional; no se modificó al no existir una ruta de escritura segura y reversible demostrada con los conectores disponibles.

### POR AUDITAR / PENDIENTE
- Limpieza del footer nativo de Astra cuando exista una vía segura con backup, rollback y comprobación visual.
- Cualquier promoción a PROD requiere sus gates propios; esta certificación **no autoriza ni implica** promoción a PROD.

## Evidencia y rollback
- Snapshot previo preservado: `docs/web-baseline/2026-10-18/`.
- Snapshot exacto V4 persistido: `docs/web-baseline/2026-10-18-v4/CEREBRO_FENIX_STAGING_BASELINE_2026-10-18.zip`.
- Checksum: `docs/web-baseline/2026-10-18-v4/CEREBRO_FENIX_STAGING_BASELINE_2026-10-18.zip.sha256`.
- Puntero de evidencia V4: `docs/web-baseline/2026-10-18-v4/ARTIFACT_POINTER.md`.
- Baseline workflow: run `39083584923`, job validado `117554274470`.
- Persistence workflow: run `39087004545`, job `117555562499`, conclusión **success**.
- El snapshot V4 preserva HTML/copy, árboles, enlaces, dependencias, media registry, hashes y manifest de STAGING.
- Rollback del cambio de `post_id=764`: sustituir las dos apariciones de la URL canónica de familias por la URL anterior únicamente si fuera necesario restaurar el estado previo; no existe motivo técnico actual para hacerlo.
- Ninguna acción de este bloque tocó PROD.

## Incidente de persistencia resuelto
El primer intento de volver a persistir el snapshot completo en la rama falló únicamente por `non-fast-forward` al haber avanzado la rama concurrentemente. No afectó a la validación del sitio ni al artifact. Se resolvió con un workflow dedicado que descargó el artifact ya validado, comprobó el SHA256 y el contrato V4 y persistió el ZIP exacto sin `force-push` y sin repetir el crawl.

## Decisión de cierre V4
**PASS para el alcance técnico SEO/web auditado en STAGING:** no existen targets internos rotos, el enlace legado `/familias/` quedó corregido en origen, el baseline V4 termina con únicamente dos redirecciones residuales de autor y no hay errores de exportación ni fallos de recuperación de binarios de imagen. El snapshot exacto y su rollback/evidencia quedan preservados. El footer nativo de Astra queda clasificado como residuo cosmético no bloqueante. **NO es una autorización de PROD.**

## Changelog del bloque
- `2026-10-18`: cierre de activos y enlaces; corrección del enlace legado `/familias/`; rebaseline whole-site post-cambio; artifact V4 validado; recuperación de persistencia sin rescan; snapshot exacto y certificación V4 preservados en rama aislada.
