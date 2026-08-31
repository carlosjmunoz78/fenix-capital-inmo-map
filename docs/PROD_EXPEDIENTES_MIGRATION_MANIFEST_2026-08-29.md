# Manifiesto de migración de Expedientes a PROD · 2026-08-29

## Fuente
`01_Expedientes_PRO` · 46 registros auditados en modo solo lectura.

## Clasificación automática segura
Aplicando únicamente reglas soportadas por los valores existentes de `🧩 Estado`:
- `REAL_ACTIVO`: 21
- `REAL_HISTORICO`: 13
- `REVISAR`: 12 inicialmente

Dentro de `REVISAR` se han identificado dos registros vacíos/plantilla que no deben migrarse como expedientes reales:
- `🆕 Nuevo expediente` · sin estado, cliente, tipo, inmobiliaria, contacto, financiero ni fecha de entrada.
- registro sin título · sin estado, cliente, tipo, inmobiliaria, contacto, financiero ni fecha de entrada.

Por tanto, el manifiesto operativo queda:
- `REAL_ACTIVO`: 21
- `REAL_HISTORICO`: 13
- `EXCLUIR_QA_DEMO`: 2
- `REVISAR`: 10
- TOTAL: 46

## Regla aplicada
### REAL_ACTIVO
Estados operativos sin marca de cierre: `Documentación completa`, `Documentación incompleta`, `Tasación realizada`, `Pre-OK` y combinaciones operativas compatibles.

### REAL_HISTORICO
Estado exactamente `Finalizado` o exactamente `Perdido`.

### EXCLUIR_QA_DEMO
Solo registros inequívocamente no operativos por ser plantilla/vacío estructural. No se excluye ningún expediente real por nombre, antigüedad o falta parcial de datos.

### REVISAR
Estados nulos en registros con identidad/datos operativos y combinaciones anómalas o contradictorias, incluyendo valores como `ESTADO + Finalizado`, `Documentación completa + Finalizado` y `Cambio de luz + Documentación incompleta + Finalizado`.

## Casos de REVISAR confirmados por lectura individual
Entre los registros que requieren reconciliación manual se encuentran expedientes con identidad real y estado nulo, por ejemplo `MARIA Y TANIA`, `NURIA`, `FELISA Y MAGDALENA` y `MARIANO NAVARRETE MERINO`; no se les asigna estado nuevo ni se deduce cierre. También permanecen en revisión `MARIA RONCERO Y FRANCISCO` y `JAVIER VILLA GUZMAN` por combinaciones de estados anómalas.

## Integridad
La migración debe conservar los IDs origen y las relaciones existentes con Contactos, Inmobiliarias, Financiero, Banco, Documentación, Tareas, Notas y Comisiones. Un campo ausente no se completa inventando datos.

## Gate antes de cargar PROD
1. Resolver o aceptar explícitamente los 10 `REVISAR`.
2. Derivar el conjunto de Contactos e Inmobiliarias referenciados por los 34 expedientes ya clasificados como reales.
3. Auditar duplicados y relaciones rotas.
4. Generar dry-run idempotente con conteos esperados.
5. Solo después habilitar la carga en backend PROD vacío.

Este documento no modifica Notion, no carga datos en PROD y no autoriza activación de usuarios.