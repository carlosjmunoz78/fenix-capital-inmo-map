# PROD PRE-CUT BASELINE · 2026-08-30

Estado: baseline de preparación, NO corte final.

Objetivo: fijar una referencia cuantitativa previa al corte final del CRM legado para detectar deltas reales inmediatamente antes del lanzamiento sin borrar ni alterar el origen.

## Baseline CRM legado
- `01_Expedientes_PRO`: 46 expedientes.
- Expedientes con `📎 Documentación adjunta` no nula: 31.
- Los 46 expedientes legado ya disponen de mapping de deduplicación hacia el CRM nuevo.

## Baseline CRM nuevo
- `Expedientes · Fénix Capital`: 72 filas totales.
- Filas con `Clave deduplicación` `exp-legado-*`: 46.
- Expedientes legado con `Financiero ficha` relacionado: 46/46.
- Expedientes legado con `Inmobiliaria` relacionada: 27/46.
- Las 26 filas restantes del origen actual continúan separadas del bloque legado y no deben confundirse con el corte real.

## Baseline documentación
- `Documentación · Fénix Capital`: 49 registros.
- Registros relacionados con expediente: 47.
- Registros con `Archivo tratado` poblado: 0.
- Migración histórica pendiente: 118 archivos físicos distribuidos en 31 expedientes legado.
- El esquema de destino existe (`Archivo tratado` + relación `Expediente`), pero este baseline NO afirma que los binarios hayan sido transferidos.

## CI asociado
- Candidato `prod-preparation`: `e93b1bbf81d4289b48c02d758aca6fa3740a04d6`.
- PROD Preparation Build #70 / `33308144852`: SUCCESS.
- PRE-PROD PR check #2739 / `33308146770`: SUCCESS.
- Artefacto QA #70: `fenix-prod-preparation-playwright-report`, id `9731156850`, digest `sha256:589c2ae6ad220d7c419c3c3851b2f83fa71beee9e9bf82da7c5e535d35951395`.

## Regla de delta final
Este baseline NO congela el CRM antiguo. Justo antes del lanzamiento se debe volver a leer el origen y comparar contra esta referencia y contra el manifiesto reconciliado vigente. Cualquier alta, cambio de estado, relación, documento, baja, pausa, reactivación o modificación operativa posterior debe entrar en el delta final mediante mapping estable e idempotente.

## Bloqueos que no deben contaminar el baseline
- No crear identidades de clientes por parecido nominal.
- No convertir listas históricas de bancos en `Envíos` u `Ofertas` sin evidencia.
- No versionar manifiestos con URLs firmadas temporales ni credenciales.
- No borrar, apagar ni modificar destructivamente el CRM antiguo durante preparación o lanzamiento.
- La ausencia de `NOTION_TOKEN` en GitHub Actions bloquea la transferencia automática de los 118 binarios desde ese entorno, pero no bloquea el resto de la preparación.
