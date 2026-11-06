# CEREBRO OS · CUT37 · JARVIS DeepSeek LAB continuo

Estado inicial: DEFINIDO; no asumir actividad física sin comprobar Actions. Política EUR50 propietario; ejecutor utiliza control técnico más estricto USD40 desde saldo DeepSeek observado en 2026-11-06 (USD98.23), sin recarga automática. USD40 no es conversión garantizada a EUR50; confirmar contra saldo proveedor.

## Trigger autónomo

Workflow: `.github/workflows/cerebro-deepseek-boost001-canary.yml` en RAMA `cerebro/jarvis-deepseek-weekend-lab-20261106`. GitHub Actions `GITHUB_TOKEN` puede disparar `workflow_dispatch` según las normas de GitHub; únicamente cuando la ejecución completa y hace commit de la conciliación. La primera ejecución se solicita mediante la creación de `zeus/jarvis/triggers/CUT37_AUTONOMY_START_20261106.txt`, path único. No hay cron, servidor nuevo ni suscripción.

## Seguridad

- Entorno GitHub `JARVIS_DEEPSEEK_LAB` restringido a la única rama LAB, secreto `DEEPSEEK_API_KEY` cifrado.
- Ledger permanente: `zeus/jarvis/state/jarvis-deepseek-autonomy-ledger-v1.json`. Solo números, metadatos y estado de presupuesto: NO datos de clientes, credenciales ni outputs de IA.
- `--reserve`: reserva peor caso de gasto antes de pedir nada; exige commit+push GitHub correctos. Fallo en push impide toda llamada pagada.
- `--execute`: modelo `deepseek-flash`, dataset 100% sintético, combinatoria de materias, lenguaje natural y dictado con errores, controles de saldo DeepSeek antes de cada llamada. Máximo 12 llamadas y 0.15 USD por ciclo; lotes de 1, 3 y hasta 12 ciclos, serializados.
- `--settle`: compara informes reales y gasto estimado, valida 6 casos y 12 llamadas por ciclo y mantiene registro acumulado. Si faltan registros, aborta sin reintentar los pagos. Solo tras confirmar Git push se lanza la siguiente ejecución.
- Si faltan créditos, hay discrepancia de saldo, más del 50% de casos inválidos, error de red, intento 2, conflictos de Git, actualización concurrente, fallo de auditoría o un límite económico: detención fail-closed; HUMAN_REQUIRED si la causa precisa intervención.
- Tanto las respuestas como las notas del segundo pase son CANDIDATAS, no hechos verificados ni entrenamiento de pesos; no se publica ni promueve a PROD automáticamente.

## Estado, parada y recuperación

El archivo de ledger acepta `status: ACTIVE`, `RESERVED`, `PAUSED`, `QUALITY_HALT`, `LIMIT_REACHED`. Para detener nuevos ciclos, establecer `PAUSED` en LAB; un ciclo ya en progreso debe finalizar o cancelarse en Actions, sin refund del importe reservado si se perdió el reporte. No cambiar un `RESERVED` tras incidente sin reconciliar coste real en panel DeepSeek.

Se preservan main, PR #25, CUT30, App, CRM, Supabase PROD, DNS, Trading LAB. No hay operaciones invasivas.

## Evidencia anterior

Canario real: #42245878611, coste pico estimado USD0.0000444. Lote CUT36 #42255228772, 12 llamadas, 6 escenarios, coste pico estimado USD0.005689368, sin promoción. Inicialización ledger: USD0.005733768 estimados de ambas pruebas. Las cifras no sustituyen conciliación de facturas.

## Fallos aceptables

El flujo debe detenerse cuando un gate sea rojo; no debe intentar automáticamente un pago duplicado para recuperarse. El objetivo de continuidad no autoriza sobrepasar los límites ni modificar sistemas protegidos.
