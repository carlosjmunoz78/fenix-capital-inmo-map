# CEREBRO OS · UMS-001 · RESOURCE SCOUT + BUDGET GATE (LAB v0)
**Fecha 2026-11-09 · company_id=fenix · engine_id=UMS-001 · environment=LAB · version=assets-scout-v0**  
**ESTADO:** código + investigación documentados; control local verificado; integración al CEREBRO Gateway/FACT-001 y descarga externa de stock pendientes. **NO hay robot PROD ni cron activo ni compras realizadas**.

## 1. Presupuesto aprobado
Verificado en [Replicate Billing](https://replicate.com/account/billing) el 9/11: saldo 92.00 USD; usuario adquirió 100 USD el 8/11 y se consumieron 8 USD. Auto-reload no marcado, por tanto OFF en la pantalla de ajustes, sin modificarlo.
- **Imagen:** reserva de 20 EUR (≈22.33 USD).
- **Vídeo y caretas noviembre:** bolsa restante ≈69.67 USD (≈62.40 EUR), respetando reserva de imagen.
- **Desde diciembre:** 40 EUR/mes aportados **manualmente** por el propietario para vídeo. Si se agotan imágenes, recarga separada manual de 20 EUR, sin automatismo.
- Cambio provisional BCE 2026-11-06: 1 EUR=1.1165 USD; valor solo informativo, no cambio real aplicado a tarjeta.
- Replicate mantiene **un monedero común** en USD, NO wallets por categoría. El presupuesto es **lógico** y necesita que **todos** los trabajos billables pasen por preflight con saldo y consumo conciliados. Scripts que salten este gate pueden gastar la reserva: no dar garantía hasta enrutar 100% de consumos.
- No nuevos modelos pagados en esta operación. No habilitar auto-reload ni contratar planes.
- [Presupuesto JSON controlado](../budget/ums001-budget-policy-2026-11-lab.json) · [Budget guard stdlib](../budget/budget_guard_v0.py).

## 2. Fuentes gratis PRIORITARIAS (licencias verificadas)
| Biblioteca | Material | Apto para CEREBRO | Licencia y condiciones |
|---|---|---|---|
| [Poly Haven](https://polyhaven.com/) | HDRIs, texturas, modelos 3D | **API pública libre**, sin cuenta, User-Agent propio + mención "Powered by Poly Haven" en interfaz, cache 24h | [CC0](https://polyhaven.com/license); [API](https://polyhaven.com/our-api) |
| [ambientCG](https://ambientcg.com/) | PBR, piedra, madera, cemento, ambientes | Colección CC0, acceso gratuito; descarga puntual | [CC0](https://docs.ambientcg.com/license/) |
| [Mixkit SFX](https://mixkit.co/free-sound-effects/) | alarma, aves, viento, golpes, whoosh, impactos, puertas | Sitio sin login, no API pública verificada: **selección manual o enlace específico**; evitar scraping | [Free SFX comercial](https://mixkit.co/license/modal/sfxFree/), no distribución de pistas aisladas |
| [ActionVFX](https://www.actionvfx.com/) | fuego, portales, polvo, humo, explosiones, VFX | 650+ gratis; **cuenta gratuita y tier empresa correctos**; límite 10 descargas gratuitas/día declarado | [FAQ](https://www.actionvfx.com/faq); [licencia por ingresos/empresa](https://www.actionvfx.com/license) |
| [Sonniss GDC](https://gdc.sonniss.com/) | efectos profesionales y Foley | Biblioteca gratuita, **NO descargar todo (7.47 GB) sin necesidad** | [EULA v2](https://sonniss.com/gdc-bundle-license/), **entrenamiento de IA prohibido** |
| [Pexels](https://www.pexels.com/videos/) | vídeo hiperrealista, cámara en movimiento, paisaje, calles | API oficial con clave gratuita; 200 solicitudes/h, 20k/mes por defecto, sin recopilación masiva | [términos](https://www.pexels.com/terms-of-service/), no entrenamiento IA, derechos de terceros |
| [Pixabay](https://pixabay.com/) | clips, imágenes, música/sfx | API imágenes/vídeo con clave, cache 24h, no solicitudes ni descargas masivas | [licencia](https://pixabay.com/service/license-summary/), [API](https://pixabay.com/api/docs/) |
| [Freesound](https://freesound.org/) | Foley y ambiente | API v2 con token; solo CC0 o CC BY + atribución si procede; **rechazar NC** | [documentación](https://freesound.org/docs/api/) |
| [Openverse](https://openverse.org/) | descubrimiento de multimedia abierto | API libre con límites, **verificar licencia en el original** | [API](https://api.openverse.org/v1/) |
| [Coverr](https://coverr.co/) | planos naturales | API Demo con crédito al proveedor; evitar premiums/sponsored | [licencia Nov 2026](https://coverr.co/license) |
| [Wikimedia Commons](https://commons.wikimedia.org/) | planos locales/monumentos y multimedia CC | API imageinfo extmetadata y licencia por elemento | [API imageinfo](https://www.mediawiki.org/wiki/API:Imageinfo) |
| [ZapSplat](https://www.zapsplat.com/) | Foley amplio | Cuenta y atribución obligatoria, no primero | [licencia](https://zapsplat-assets.s3.amazonaws.com/zapsplat-standard-license.pdf) |

**Criterios de exclusión:** no bajar material con uso NC/editorial, material sponsor no incluido, pistas con rights no claros, logos/marcas ajenas, personas que parezcan avalar servicios, elementos sin licencias, ni stock para entrenamiento ML si términos lo prohíben. VFX premium no justifica infracción. Evitar duplicar stock bruto en GitHub público. Fuentes binarias sólo a almacenamiento interno privado.

## 3. Exploración sin navegador CEREBRO, usando recursos compartidos
- [Scout Python](../asset-scout/asset_scout_polyhaven_v0.py): consulta catálogo público Poly Haven con User-Agent dedicado, cache 24h, prioridad por tags y palabras clave (nubes, ciudad, cemento, madera, exteriores, sol, piedra, patio, viento); produce registro JSON `DISCOVERED_NOT_DOWNLOADED` sin ficheros ni coste.
- [Fetch CC0 puntual](../asset-scout/fetch_polyhaven_cc0_v0.py): **solo un asset previamente seleccionado** del manifiesto LAB, descarga 1 media ≤25 MB vía dominio oficial HTTPS, comprueba tamaño y MD5 del origen, produce SHA256 y recibo. Por defecto dry-run; `--live` habilita la descarga cuando el runner tenga Internet. No usa navegador ni IA de pago ni abre login.
- [Budget guard](../budget/budget_guard_v0.py): prohíbe asumir saldo viejo como actual, detecta desviaciones de saldo sin conciliar y bloquea consumos por encima de la bolsa correspondiente, reservando imágenes.
- Escalonar API Pexels (vídeo), Freesound (SFX), y Pixabay con claves en Secret Store **solo después** de obtener credenciales/autorización adecuada, test de derechos y control de cuotas. No guardar tokens en repo.
- Integrar en runtime compartido de FACT-001 con jobs/events/observabilidad/backup y `company_id / engine_id / environment / version`. **No se ha desplegado ni activado un job recurrente**. El nuevo código es LAB aislado, no altera App/CRM/Supabase/WordPress/SEO/DNS/Buffer/PROD/main.

## 4. Biblioteca física ya creada
- **6 WAV originales de prueba** creados proceduralmente a 48 kHz/24-bit: alarma, whoosh, impacto grave, renacimiento, viento, firma sonora. Hash SHA256 individual y código reproducible en paquete LAB. **CALIDAD SONORA PREMIUM Y MEZCLA PENDIENTES DE APROBACIÓN.**
- **2 pistas Mixkit preexistentes** en repositorio de entregables V5.4 (Dreaming Big, Driving Ambition); conservadas, no re-publicadas como stock.
- **No se han descargado archivos binarios externos nuevos** (CDN inaccesible desde este contenedor); se verificaron páginas, licencias y endpoints y se preparó el fetch en runner externo. No escribir status DOWNLOADED para esos enlaces.
- [Paquete ZIP v1.1 en Google Drive](https://drive.google.com/file/d/10l44rEaC3z-vz-PlzGnOCd9NT8tFK-IJ/view) · incluye WAV, código, catálogo detallado, test fixtures y manifest.

## 5. Pruebas y rutas mínimas
Local: 12 tests PASS en el paquete v1.1 (budget fail-closed, selección metadata, dominio HTTPS, límite de bytes); 6 WAV validados por ffprobe. No se afirma que la versión en GitHub haya corrido CI propia.
```bash
python asset_scout_polyhaven_v0.py --query "street city sunset clouds" --live --output candidates.json
python fetch_polyhaven_cc0_v0.py --candidate-manifest candidates.json --asset-id sunset_jhbcentral --metadata-fixture polyhaven_files_fixture.json
# Sólo en un runner LAB con Internet y fuente verificada:
python fetch_polyhaven_cc0_v0.py --candidate-manifest candidates.json --asset-id sunset_jhbcentral --live --dest private_assets_lab
```
**FASE ACTUAL:** Repo código EXISTENTE / Tests locales PASS / Descargas externas BLOQUEADAS por conectividad / Integración FACT-001 PLANIFICADA / Producción OFF.

## 6. Aceptación, aislamiento y rollback
La Fábrica de Motores deberá exigir `manifest`, contrato de entrada/salida, derechos, coste real, SHA, MIME, tamaño, calidad A/V, límite de 3 descargas por ejecución, cola no concurrente, logs ligeros fuera Supabase PROD, backup y rollback. En la primera implantación usar descarga **determinista**, jamás navegación con credenciales guardadas ni scraping. Revertir únicamente commits de esta rama LAB o apagar el job; NO borrar bibliotecas ni tocar main.
