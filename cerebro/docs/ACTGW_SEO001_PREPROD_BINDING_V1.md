# CEREBRO ACTGW → SEO-001 PREPROD Binding V1

Estado: **IMPLEMENTADO / PREPROD BINDING**  
Fecha: 2026-09-30

## Objetivo

Conectar una confirmación exacta de la Console móvil a una acción real y auditable de `SEO-001`, manteniendo PROD bloqueado.

## Flujo

`Console → exact proposal → explicit yes → ACTGW PROD signature → SEO-001 PREPROD executor → INE municipality discovery → action registry → territories/jobs → existing SEO-001 workers/gates`.

## Seguridad

- Firma Ed25519 derivada en runtime; la clave privada no se comparte.
- Verificador PREPROD obtiene únicamente la clave pública del signer PROD.
- Ventana anti-replay: 300 segundos.
- Solo `SEO_ZONE_ACTIVATION`, `FENIX_CAPITAL`, `SEO-001`, `PREPROD`.
- No publicación PROD.
- No acceso a Trading.
- Idempotencia por `proposal_hash`.
- Fuente territorial: API oficial INE 2026.
- Keyword demand, contexto local y canibalización permanecen como trabajos de investigación; no se inventan.

## Resultado de una activación provincial

- registra petición auditable;
- descubre municipios oficiales;
- crea/reutiliza territorios;
- encola AUDIT_EXISTING_URL, KEYWORD_RESEARCH, LOCAL_CONTEXT_RESEARCH, ANTI_CANNIBALIZATION, DRAFT_LOCAL_LANDING, IMAGE_MANIFEST, B2B_REAL_ESTATE_PLAN y QA_PREPUBLISH;
- crea el capital como primer `city_run` nuevo;
- crea CITY_GROWTH_STACK_V2 para el capital;
- entrega el proceso a los workers y gates ya existentes.

## Rollback

El binding es aditivo. Para desactivar, retirar la llamada ACTGW al executor PREPROD y dejar las peticiones registradas como evidencia. No borrar datos de territorios/jobs sin snapshot y análisis de dependencias.
