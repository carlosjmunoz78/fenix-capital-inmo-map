# CEREBRO OS · Estado canónico WEB-001 / LAB-TRD / control de dispositivo · 2026-10-20

Este documento corrige el estado operativo vigente de las superficies externas `WEB-001`, `LAB-TRD` y sus dependencias de control de navegador/PC. Para estos tres puntos, esta corrección prevalece sobre referencias históricas que los describan como inexistentes o `UNKNOWN_REQUIRES_AUDIT`. No reescribe evidencia histórica: actualiza el estado vigente.

## HECHO

- `WEB-001` corresponde a la web existente de Fénix Capital en `https://fenixcapital.es` y está en PROD.
- El 2026-10-20 se realizó una comprobación viva read-only de WordPress: sitio accesible, WordPress `7.1.3`, tema activo `Astra 4.14.0`.
- No se ha realizado ninguna mutación de la web durante esta corrección.
- Se conserva el aislamiento de Trading respecto de App/CRM/CEREBRO PROD.
- Coste adicional introducido por esta corrección: `0 €`.

## EXISTENTE

- `WEB-001`: superficie WordPress PROD de Fénix Capital ya construida y operativa. El trabajo previsto para el 2026-10-21 es una modificación sobre la web existente, no su creación ni su primer despliegue.
- `LAB-TRD`: sistema de Trading destinado a inversión en bolsa, existente en Google Cloud según confirmación expresa del propietario.

## PARCIAL

- `LAB-TRD` pasa a `DOCUMENTED_PARTIAL`: se reconoce su existencia y ubicación de runtime, pero no se declara afinado, listo para operar ni integrado con CEREBRO PROD.
- El control integral de navegador y PC sigue pendiente de cierre E2E físico completo. Hasta que ambos gates estén confirmados, CEREBRO no debe intentar poner a punto, activar ni ampliar autoridad de Trading.

## PLANIFICADO

- `WEB-001`: modificación de la web de Fénix Capital prevista para el 2026-10-21. Hasta ese trabajo, no tocar la web salvo incidente o orden explícita del propietario.
- Tras quedar `BROWSER_CONTROL_E2E_CONFIRMED` y `PC_CONTROL_E2E_CONFIRMED`, ejecutar auditoría separada de `LAB-TRD`: inventario, dependencias, credenciales referenciadas sin exposición, backup/snapshot, contratos, tests, OLD vs NEW cuando aplique, tribunal, observabilidad, rollback y rebuild antes de cualquier promoción operativa.

## POR AUDITAR

- Componentes exactos de Google Cloud usados por `LAB-TRD`, estado vivo de cada recurso, credenciales/referencias, brokers/APIs, estrategia y ruta de ejecución. Ninguno de esos detalles se infiere ni se registra aquí sin evidencia viva.
- Cierre físico E2E del control universal de navegador y PC.
- Estado de Trading después de cerrar ambos gates de dispositivo.

## Reglas vinculantes

1. `WEB-001 EXISTENTE` no puede volver a interpretarse como una web pendiente de crear o de poner en PROD desde cero.
2. `Trading aislado` significa separación de credenciales, lógica de ejecución y recursos críticos respecto de App/CRM/CEREBRO PROD; no significa que Trading no exista o quede excluido del proyecto.
3. `LAB-TRD` no comparte credenciales ni recursos críticos con App/CRM/CEREBRO PROD.
4. `LAB-TRD` no se pone a punto ni se activa por CEREBRO hasta cerrar control de navegador y PC E2E; después requiere su propio gate de Trading.
5. No almacenar secretos, tokens, claves privadas ni credenciales crudas en Git, documentación o evidencia.
6. HUMAN_REQUIRED sigue limitado a `LEGAL_REQUIRED`, `SIGNATURE_REQUIRED`, `LOW_CONFIDENCE`, `HIGH_RISK`, `POLICY_CONFLICT`, `SECURITY_INCIDENT`, `MONEY_LIMIT`, `CUSTOMER_HUMAN_REQUEST`.

## Cadena de dependencias corregida

`WEB-001 existente PROD → modificación planificada 2026-10-21`

`LAB-TRD existente Google Cloud → BROWSER_CONTROL_E2E_CONFIRMED → PC_CONTROL_E2E_CONFIRMED → auditoría/validación LAB-TRD → tests/tribunal/rollback/rebuild → posible promoción gobernada`

## Fuente máquina

Estado estructurado: `cerebro/registry/external-system-state.v1.json`.
