# UMS-001 · PEDIDO RECIBIDO DE INSTAGRAM · 2026-11-08

## Regla operativa acordada por el propietario

**INSTAGRAM SOLICITA → PRODUCTORA UMS-001 PRODUCE → PRODUCTORA DEVUELVE EL MATERIAL A INSTAGRAM.**

Instagram NO selecciona ni ejecuta modelos Replicate, NO gestiona API tokens, saldo, webhooks, montaje, locución, almacenamiento ni reintentos; todo eso pertenece a la productora UMS-001. Instagram tampoco crea una productora paralela. La productora está en fase de pruebas con Replicate, por tanto **NO se fija fecha de entrega ni se inicia ninguna generación de pago por este pedido**.

## Pedido de Instagram

Cuenta de destino: `fenixcapitalhipotecas`. Empresa: `fenix-capital`. Territorio: Córdoba (España).

Hay **7 ideas aprobadas solo para preparación**: 3 Reels, 3 carruseles y 1 story. Son solicitudes de producción, **no** publicaciones ya autorizadas.

**Guiones, textos, CTA, paneles, tiempos y línea creativa:**
https://github.com/carlosjmunoz78/fenix-capital-cerebro-social/blob/cerebro/instagram-enterprise-lab-v0-20261108/companies/fenix-capital/instagram/financial-real-estate/replicate-week46-shooting-pack-20261108.v1.json

**Ideas/editorial originales:**
https://github.com/carlosjmunoz78/fenix-capital-cerebro-social/blob/cerebro/instagram-enterprise-lab-v0-20261108/companies/fenix-capital/instagram/financial-real-estate/editorial-ideas-2026w46.v1.json

**Esquema técnico de encargos propuesto, meramente orientativo:**
https://github.com/carlosjmunoz78/fenix-capital-cerebro-social/blob/cerebro/instagram-enterprise-lab-v0-20261108/scripts/instagram_replicate_media_factory_lab.py

El recuento orientativo de 24 imágenes y 6 clips no obliga a generarlos todos ni a elegir esos modelos. **La productora** es quien ajusta calidad, número de pruebas, formato, modelos de Replicate y coste real, dentro de las autorizaciones y presupuesto vigente. No cambiar el pipeline actual de UMS; reutilizar el existente.

## A entregar de vuelta a Instagram

Por cada `IGC-2026-0N`:

- Archivo final original, en almacenamiento propio y seguro (NO solo URL temporal de Replicate), y una vista previa/identificador que Instagram pueda consultar.
- Reel: MP4 final 9:16 con subtítulos españoles, portada y textos; carrusel: imágenes finales 4:5 con textos legibles; story: imagen o vídeo 9:16. Se adapta cuando Instagram tenga los permisos correspondientes.
- Manifiesto de producción: `request_id`, `company_id`, `environment`, `version`, `item_id`, `format`, `asset_uri`, `sha256`, `rights_status`, `brand_qa`, `accessibility_qa`, `financial_claims_review`, `cost_actual`, `status`, `delivery_receipt`.
- Cuando UMS no pueda acreditar un dato, devolver `BLOCKED` con explicación sin inventar que está completo.

## Respuesta esperada de la productora

La productora debe **acusar recibo** del pedido (por comentario en PR #39 o archivo del runbook/registry) con `ACK / PENDING_TRIALS / BLOCKED`, ID de lote y mecanismo real de devolución. Cuando supere sus pruebas, devolver el material por el canal seguro existente con recibos y QA. **Crear este pedido no desencadena procesos autónomos ni promete trabajo en segundo plano si no hay un worker lector instalado.**

La publicación sigue siendo competencia del **Buffer existente** y de los controles independientes de Instagram; la productora **NO publica** en Instagram ni toca CRM/App/Facebook/PROD. No se activan costes ni permisos por el mero registro del encargo.

## Estado inicial

`PENDING_PRODUCER_TESTS`. Replicate API GET de cuenta/modelo verificado HTTP 200 y sin consumo en [canary de GitHub Actions](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42478667128). Esto **no demuestra** producción audiovisual E2E, almacenamiento privado, webhook firmado ni entrega a Instagram.

**Protección:** PR #39 sigue DRAFT, PREPROD/PROD no tocados, rollback conservado.
