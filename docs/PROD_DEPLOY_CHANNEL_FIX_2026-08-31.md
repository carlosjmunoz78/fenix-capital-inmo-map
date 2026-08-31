# Cierre de canal de despliegue PROD — 2026-08-31

## Incidencia
`app.fenixcapital.es` seguía mostrando una carcasa antigua aunque `main` y Supabase PROD estuvieran corregidos.

## Causa raíz
La rama `gh-pages`, documentada en el workflow como la rama consumida por Vercel, seguía conteniendo un snapshot PRE-PROD antiguo. Los cambios de `main` no actualizaban ese canal live.

## Corrección
- `main` publica explícitamente un bundle PROD a `gh-pages`.
- `preprod-app-phase1` publica su snapshot en `preprod-pages`.
- El bundle PROD se compila con `VITE_FENIX_ENV=prod` y Supabase `cluhljgonannaafpmblx`.
- El workflow PROD falla si detecta el hostname Supabase PRE-PROD `hnqlnvakzaywtafeiybt` en el bundle.
- Cada snapshot PROD incluye `PROD_SOURCE_SHA.txt` con el SHA fuente.

## Regla permanente
PRE-PROD no puede volver a sobrescribir `gh-pages`. `gh-pages` queda reservado al canal live de PROD mientras el hosting externo siga conectado a esa rama.
