# CEREBRO · CREATIVE OUTPUT PIPELINE V1

**Fecha:** 2026-10-24  
**Estado:** PREPROD CANDIDATE  
**Owner:** FACT-001  
**Regla:** reutilizar capacidades compartidas; no crear un motor por red ni por formato.

## Objetivo

Convertir una petición de cualquier motor autorizado de CEREBRO en un plan creativo terminado y gobernado para posts, carruseles, stories, reels, vídeos, thumbnails, imágenes SEO, web, app, email, documentos e infografías.

No sustituye el Creative Stack V1 ya fusionado. Lo envuelve y estandariza como servicio transversal.

## Capacidades reutilizadas

- `CREATIVE-CANVA-V1`: Canva oficial cuando el binding/OAuth correspondiente esté GREEN.
- `CREATIVE-VISUAL-LOCAL-V1`: OpenDesign como vía visual local/self-hosted de coste adicional 0 €.
- `DIGITAL-BUILD-MULTIMEDIA`: ruta automática de vídeo existente.
- `CREATIVE-VIDEO-EDITOR-V1`: OpenCut como editor interactivo LAB hasta demostrar paridad de automatización.
- HyperFrames + OpenMontage + FFmpeg: ruta operativa de generación, edición y composición de vídeo.
- Qwen3 TTS: candidato de voz de coste 0 cuando el runtime físico correspondiente esté disponible y certificado.

## Consumidores

La capacidad es transversal. Consumidores iniciales ya contemplados: Social/Facebook, Marketing, SEO, Web, App, Training y sus bootstraps. Instagram, LinkedIn, TikTok, YouTube, WhatsApp, email, documentos y futuros motores pueden usar el mismo contrato cuando su binding y permisos estén autorizados.

## Salidas cubiertas

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
→ OpenDesign / Canva / Multimedia Factory
→ assets visuales / voz / vídeo / montaje
→ QA
→ export
→ devolver asset al motor origen
→ **el motor origen conserva la autoridad de publicación**.

## Política de marca

No se permite salida genérica sin identidad visual. Toda pieza necesita `brand_profile_ref`. HyperFrames y cualquier composición de vídeo deben respetar identidad visual antes de renderizar y mantener render determinista.

## Política 0 €

Orden por defecto:
1. capacidad ya instalada/propia;
2. open-source/local/self-hosted;
3. capacidad incluida en una suscripción ya existente sin coste marginal;
4. cualquier gasto nuevo → `HUMAN_REQUIRED: MONEY_LIMIT`.

El objetivo de 0 € se refiere a gasto externo adicional. CPU/GPU, electricidad y almacenamiento siguen siendo recursos físicos medibles por FinOps.

## Vídeo

Para producción automática hoy se preserva:

`HyperFrames → OpenMontage cuando haya clips → FFmpeg`

Reglas mínimas:
- composición determinista;
- identidad visual obligatoria;
- layout antes de animación;
- sin aleatoriedad temporal no sembrada;
- timelines finitos;
- audio separado de vídeo;
- subtítulos por defecto en vídeo hablado;
- QA antes de exportación.

OpenCut no se declara headless/autónomo en PROD hasta existir evidencia física de paridad con la ruta actual.

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
- tocar PROD sin certificación del binding.

## Rollback

Desactivar el binding `creative-output-pipeline-v1` y mantener intactos:
- Creative Stack V1 ya fusionado;
- Canva compartido;
- OpenDesign;
- Multimedia Factory;
- rutas de publicación de cada motor/canal.

No hay migración destructiva ni sustitución del stack existente.

## Criterio de cierre PREPROD

- contrato JSON válido;
- tests de todos los tipos de salida GREEN;
- reels usan Multimedia Factory;
- carruseles validan multipágina;
- SEO usa la misma capacidad visual;
- marca obligatoria;
- coste adicional por defecto 0 €;
- cross-company fail-closed;
- PROD fail-closed;
- publicación siempre separada;
- CI específico GREEN;
- Governed Main Integration GREEN.

## Estado que NO debe exagerarse

Este pipeline estandariza y prueba el routing/contrato. No demuestra por sí solo que cada modelo/binario/proveedor esté físicamente instalado en todos los runtimes. Canva OAuth y cualquier binding físico pendiente conservan su propio gate. `CONFIRMED_OPERATIONAL` solo se declara por capacidad cuando exista evidencia viva E2E.
