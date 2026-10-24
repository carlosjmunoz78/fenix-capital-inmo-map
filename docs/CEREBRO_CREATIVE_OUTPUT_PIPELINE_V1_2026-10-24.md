# CEREBRO · CREATIVE OUTPUT PIPELINE V1

**Fecha:** 2026-10-24  
**Estado:** PROD · CONFIRMED_OPERATIONAL para `CREATIVE-PROGRAMMATIC-RENDER-V1` · PROVIDER_GATED para Canva/OpenDesign/OpenCut  
**Owner:** FACT-001  
**Regla:** reutilizar capacidades compartidas; no crear un motor por red ni por formato.

## Objetivo

Convertir una petición de cualquier motor autorizado de CEREBRO en un plan creativo terminado y gobernado para posts, carruseles, stories, reels, vídeos, thumbnails, imágenes SEO, web, app, email, documentos e infografías.

No sustituye el Creative Stack V1 ya fusionado. Lo envuelve y estandariza como servicio transversal.

## Estado operativo exacto

### HECHO · PROD

`CREATIVE-PROGRAMMATIC-RENDER-V1` está físicamente operativo en PROD mediante:

`ENGINE → CEREBRO Creative Queue → OIDC GitHub Worker → Chromium/HTML/CSS + FFmpeg → QA → private Storage → manifest SHA256`

- merge PROD: `4399870744e8341e37a7a570cdc91ed594215d03`;
- Supabase PROD: `cluhljgonannaafpmblx`;
- Edge Function: `cerebro-creative-dispatch-v1`, versión 1;
- bundle SHA256: `8b297de0e7d943e94faf38b1e9182c4aa90576339523d8f33d14243921358edb`;
- cola: `public.cerebro_creative_job_v1`;
- bucket privado: `cerebro-creative-assets`;
- heavy render: fuera de Supabase;
- coste externo adicional objetivo y observado en los canarios: `0 €`;
- autoridad de publicación: `false`.

### Evidencia física PROD

Worker GitHub Actions:
- run: `40084548785`;
- job: `120845537414`;
- conclusión final: `SUCCESS`.

Canarios PROD `company_id=fenix`, `engine_id=SOC-001`, `environment=PROD`:

1. Imagen SEO
   - job `f864db58-63f5-4279-9340-2392eec04e83`;
   - `SUCCEEDED`;
   - 1200×630 PNG;
   - SHA256 `cc19eca8019d11db16324845b73c2b6579e23e71759b28f57024c446dd97749d`.
2. Carrusel
   - job `b184730c-80c9-4df0-b4ba-8e168db8a52e`;
   - `SUCCEEDED`;
   - 3 PNG de 1080×1350 + PDF de 3 páginas;
   - 4 artefactos privados.
3. Reel
   - job `907e6d2e-5547-4d7a-b890-39f5b7972453`;
   - `SUCCEEDED`;
   - MP4 1080×1920, 4 s;
   - SHA256 `a8742d3505625693a545c9c75167a0812805ee47bc8221d5103c3ab0d19b3546`.

Los 6 artefactos se verificaron físicamente en Storage PROD y el bucket es privado.

### Seguridad y autoridad PROD verificadas

- `anon`: sin `SELECT` sobre la cola y sin `EXECUTE` de enqueue;
- `authenticated`: sin `SELECT` sobre la cola y sin `EXECUTE` de enqueue;
- `service_role`: único rol operativo para enqueue/lease/complete del worker;
- cross-company: rechazado con `CREATIVE_JOB_CROSS_COMPANY_DENIED`;
- coste nuevo: rechazado con `CREATIVE_JOB_MONEY_LIMIT`;
- publicación solicitada: rechazada con `CREATIVE_JOB_PUBLISH_AUTHORITY_DENIED`;
- los tres ensayos negativos dejaron `0` jobs persistidos;
- el advisor de Supabase no añadió hallazgos para `public.cerebro_creative_job_v1`.

Los avisos de seguridad preexistentes de otras superficies no se consideran resueltos por esta promoción y deben auditarse por separado antes de modificarlos.

## Capacidades reutilizadas

- `CREATIVE-PROGRAMMATIC-RENDER-V1`: **CONFIRMED_OPERATIONAL_PROD**; renderer propio CEREBRO con Chromium/HTML/CSS + FFmpeg.
- `CREATIVE-CANVA-V1`: routing preparado, pero la operación física oficial sigue pendiente del OAuth CEREBRO por usuario. No se evade anti-bot/MFA/CAPTCHA.
- `CREATIVE-VISUAL-LOCAL-V1`: OpenDesign probado en LAB; no se declara servicio persistente PROD sin despliegue y canarios propios.
- `CREATIVE-VIDEO-EDITOR-V1`: OpenCut probado en LAB interactivo; no se declara headless/MCP/autónomo hasta existir la interfaz real y su evidencia.
- HyperFrames + OpenMontage + FFmpeg: se preservan como ruta multimedia existente.

## Consumidores

La capacidad es transversal. Consumidores contemplados: Social/Facebook, Marketing, SEO, Web, App, Training y sus bootstraps. Instagram, LinkedIn, TikTok, YouTube, WhatsApp, email, documentos y futuros motores pueden usar el mismo contrato cuando su binding y permisos estén autorizados.

## Salidas cubiertas por el core PROD

- post vertical y cuadrado;
- carrusel multipágina;
- story;
- reel;
- vídeo corto vertical;
- vídeo horizontal;
- thumbnail/portada;
- imagen SEO/OpenGraph;
- hero web;
- banner email;
- portada de documento;
- asset de app;
- infografía.

Los presets son defaults de producción, no una prohibición para futuros perfiles de canal versionados.

## Pipeline

`ENGINE REQUEST`
→ validar `company_id / engine_id / environment / version`
→ cargar `brand_profile_ref`
→ cargar `brief_ref`
→ seleccionar formato/canal
→ Creative Router
→ capacidad PROD certificada o proveedor GREEN
→ assets visuales / voz / vídeo / montaje
→ QA
→ export
→ devolver asset al motor origen
→ **el motor origen conserva la autoridad de publicación**.

## Política de marca

No se permite salida genérica sin identidad visual. Toda pieza necesita `brand_profile_ref`. Las composiciones deben respetar identidad visual antes de renderizar y mantener render determinista.

## Política 0 €

Orden por defecto:
1. capacidad propia ya certificada;
2. open-source/local/self-hosted certificado;
3. capacidad incluida en una suscripción ya existente sin coste marginal;
4. cualquier gasto nuevo → `HUMAN_REQUIRED: MONEY_LIMIT`.

El objetivo de 0 € se refiere a gasto externo adicional. CPU/GPU, electricidad y almacenamiento siguen siendo recursos físicos medibles por FinOps.

## QA obligatorio

- consistencia de marca;
- dimensiones/formato;
- safe area;
- overflow de texto;
- accesibilidad;
- subtítulos cuando proceda;
- derechos/licencias de assets;
- ausencia de secretos/PII crudos;
- coste 0 o autorización económica;
- política del canal;
- EVA-001;
- observabilidad.

## Separación de autoridad

Esta capacidad puede **crear, editar y exportar**.

No puede por sí sola:
- publicar;
- enviar;
- gastar dinero;
- otorgar permisos al motor consumidor;
- saltarse OAuth/MFA/CAPTCHA/anti-bot;
- ampliar autoridad de otro motor.

## Rollback

Existe rollback explícito no destructivo en:

`supabase/migrations/rollback/20261024103000_cerebro_creative_job_v1.rollback.sql`

Fue ensayado físicamente en PREPROD dentro de transacción:
- se revocaron enqueue/lease/complete y acceso de tabla a `service_role`;
- se comprobó que quedaron denegados;
- `ROLLBACK` restauró las cuatro autoridades;
- no se borraron jobs, assets ni evidencias.

El rollback de PROD debe ser fail-closed: cortar autoridad del worker conservando evidencia y storage. No sustituye ni elimina Canva, OpenDesign, OpenCut, Multimedia Factory, Buffer, Make ni las rutas de publicación existentes.

## Criterio de cierre PROD del core propio

- contratos: GREEN;
- permisos: GREEN;
- tests: GREEN;
- evaluación/tribunal: GREEN;
- observabilidad: GREEN;
- rollback: GREEN y ensayado;
- coste: 0 € adicional en canarios;
- PREPROD: GREEN físico;
- PROD queue/worker/storage: GREEN físico;
- multiempresa: fail-closed probado;
- publish authority: separada y fail-closed;
- 6 artefactos físicos con manifests/hashes: GREEN.

## Estado que NO debe exagerarse

`CONFIRMED_OPERATIONAL_PROD` aplica al core propio `CREATIVE-PROGRAMMATIC-RENDER-V1`. No convierte automáticamente Canva, OpenDesign u OpenCut en capacidades PROD autónomas. Cada proveedor conserva sus gates de OAuth, despliegue, interfaz, permisos y canarios propios.
