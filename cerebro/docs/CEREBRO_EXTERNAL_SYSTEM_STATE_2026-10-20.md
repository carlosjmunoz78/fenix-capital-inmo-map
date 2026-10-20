# CEREBRO OS · Estado canónico WEB-001 / LAB-TRD / control de dispositivo · 2026-10-20

Este documento corrige el estado operativo vigente de las superficies externas `WEB-001`, `LAB-TRD` y sus dependencias de control de navegador/PC. Para estos tres puntos, esta corrección prevalece sobre referencias históricas que los describan como inexistentes o `UNKNOWN_REQUIRES_AUDIT`. No reescribe evidencia histórica: actualiza el estado vigente y actúa como addendum de `CURRENT_STATE`, `DEPENDENCY_MAP`, `RUNBOOK`, `CHANGELOG` y `AUTONOMY_BACKUP_REBUILD` hasta que sus referencias históricas sean reconciliadas sin destruir trazabilidad.

## HECHO

- `WEB-001` corresponde a la web existente de Fénix Capital en `https://fenixcapital.es` y está en PROD.
- El 2026-10-20 se realizó una comprobación viva read-only de WordPress: sitio accesible, WordPress `7.1.3`, tema activo `Astra 4.14.0`.
- No se ha realizado ninguna mutación de la web durante esta corrección.
- El Trading LAB tiene evidencia documental previa de ejecución aislada Shadow/Paper. El documento maestro de Notion de 2026-09-04 registra proyecto GCP `fenix-trading-lab`, VM `cerebro-trading-lab`, Shadow automático activo y Alpaca Paper armado/activo detrás de gates; capital real seguía bloqueado.
- Se conserva el aislamiento de Trading respecto de App/CRM/CEREBRO PROD.
- Coste adicional introducido por esta corrección: `0 €`.

## EXISTENTE

- `WEB-001`: superficie WordPress PROD de Fénix Capital ya construida y operativa. El trabajo previsto para el 2026-10-21 es una modificación sobre la web existente, no su creación ni su primer despliegue.
- `LAB-TRD`: sistema de Trading destinado a inversión en bolsa, existente en Google Cloud. Su existencia no depende del cierre del control universal de PC/navegador.

## PARCIAL

- `LAB-TRD` pasa a `DOCUMENTED_PARTIAL`: existe y tiene evidencia histórica de Shadow/Paper, pero esta corrección no afirma que su estado vivo actual haya sido revalidado el 2026-10-20 ni que esté afinado para el objetivo final.
- El control integral de navegador y PC sigue pendiente de cierre E2E físico completo. Hasta que ambos gates estén confirmados, CEREBRO no debe intentar completar la puesta a punto integral, ampliar autoridad ni habilitar capital real.
- `trading_access=false` en AccessBoot/CEREBRO sigue siendo correcto como **límite de acceso actual**, no como descripción de inexistencia del sistema Trading.

## PLANIFICADO

- `WEB-001`: modificación de la web de Fénix Capital prevista para el 2026-10-21. Hasta ese trabajo, no tocar la web salvo incidente o orden explícita del propietario.
- Tras quedar `BROWSER_CONTROL_E2E_CONFIRMED` y `PC_CONTROL_E2E_CONFIRMED`, ejecutar auditoría separada de `LAB-TRD`: inventario vivo, dependencias, credenciales referenciadas sin exposición, backup/snapshot, contratos, tests, OLD vs NEW cuando aplique, tribunal, observabilidad, rollback y rebuild antes de cualquier ampliación de autoridad o promoción operativa.

## POR AUDITAR

- Estado vivo 2026-10-20 de los recursos GCP y servicios Trading. La evidencia de GCP/Shadow/Paper disponible es histórica y no se convierte silenciosamente en prueba de salud actual.
- Cierre físico E2E del control universal de navegador y PC.
- Estado de Trading después de cerrar ambos gates de dispositivo.
- Cualquier ruta futura hacia capital real: debe conservar los gates científicos, de riesgo, económicos y humanos propios del Trading LAB.

## Reglas vinculantes

1. `WEB-001 EXISTENTE` no puede volver a interpretarse como una web pendiente de crear o de poner en PROD desde cero.
2. `Trading aislado` significa separación de credenciales, lógica de ejecución y recursos críticos respecto de App/CRM/CEREBRO PROD; no significa que Trading no exista o quede excluido del proyecto.
3. `LAB-TRD` no comparte credenciales ni recursos críticos con App/CRM/CEREBRO PROD.
4. `LAB-TRD` no completa su puesta a punto integral desde CEREBRO hasta cerrar control de navegador y PC E2E; después requiere su propio gate de Trading.
5. El cierre de control PC/navegador no autoriza capital real automáticamente.
6. No almacenar secretos, tokens, claves privadas ni credenciales crudas en Git, documentación o evidencia.
7. HUMAN_REQUIRED sigue limitado a `LEGAL_REQUIRED`, `SIGNATURE_REQUIRED`, `LOW_CONFIDENCE`, `HIGH_RISK`, `POLICY_CONFLICT`, `SECURITY_INCIDENT`, `MONEY_LIMIT`, `CUSTOMER_HUMAN_REQUEST`.

## Addendum CURRENT_STATE

- `WEB-001 = CONFIRMED_OPERATIONAL` para la superficie WordPress PROD existente verificada read-only el 2026-10-20.
- `LAB-TRD = DOCUMENTED_PARTIAL / EXISTENTE`: sistema aislado GCP con evidencia histórica Shadow/Paper; no `UNKNOWN_REQUIRES_AUDIT` en cuanto a existencia.
- `BROWSER/PC CONTROL = PARCIAL`: no declarar E2E integral verde sin aceptación física completa.

## Addendum DEPENDENCY_MAP

`WEB-001 existente PROD → modificación planificada 2026-10-21`

`LAB-TRD existente Google Cloud → BROWSER_CONTROL_E2E_CONFIRMED → PC_CONTROL_E2E_CONFIRMED → auditoría/validación LAB-TRD → tests/tribunal/observabilidad/rollback/rebuild → posible ampliación de autoridad gobernada`

La dependencia de PC/navegador bloquea la **puesta a punto integral desde CEREBRO**, no la existencia del laboratorio ni su evidencia histórica Shadow/Paper.

## Addendum RUNBOOK

- Antes de cualquier acción sobre `WEB-001`, distinguir `sitio existente` de `cambio planificado`. El 2026-10-20 la acción permitida para esta corrección es solo lectura/evidencia; el cambio funcional se reserva al trabajo previsto del 2026-10-21 salvo incidente u orden explícita.
- Para `LAB-TRD`, preservar primero VM, configuración, datos, servicios, gates y credenciales por referencia. No copiar secretos al repositorio ni a CEREBRO.
- No usar App/CRM/CEREBRO PROD como puente de credenciales hacia Trading.
- Si control navegador o PC no está E2E confirmado, cerrar como `PARCIAL`, no forzar activación ni escalar a HUMAN_REQUIRED salvo una de las ocho razones canónicas.
- Después de cerrar ambos controles físicos, auditar Trading en su propio perímetro antes de modificar autoridad.

## Addendum CHANGELOG · 2026-10-20

- Corregido `WEB-001` de estado conservador/indeterminado a `CONFIRMED_OPERATIONAL` para la superficie PROD existente, con comprobación WordPress read-only viva.
- Registrada modificación web del 2026-10-21 como `PLANIFICADO`, no como despliegue inicial.
- Corregido `LAB-TRD` a `DOCUMENTED_PARTIAL / EXISTENTE` y registrado Google Cloud como runtime existente; evidencia histórica Notion confirma Shadow/Paper automatizado y capital real bloqueado.
- Aclarado que aislamiento Trading significa separación de seguridad, no inexistencia.
- Vinculada la puesta a punto integral de Trading a cierre E2E de navegador + PC y posterior gate específico de LAB-TRD.
- Ninguna escritura en WordPress, ninguna ampliación de autoridad Trading, ninguna credencial nueva y ningún coste adicional introducidos por esta corrección.

## Addendum AUTONOMY / BACKUP / ROLLBACK / REBUILD

- La web existente conserva sus mecanismos actuales de backup/rollback; esta corrección documental no sustituye ni altera backups WordPress.
- Trading conserva sus backups, datos y secretos dentro de su perímetro aislado. Git/Notion solo pueden guardar referencias y evidencia sanitizada, nunca secretos.
- Rollback de esta corrección: revertir exclusivamente los cambios de estado/documentación/registry de esta rama. No revertir WordPress ni Trading porque esta corrección no los muta.
- Rebuild de AccessBoot/CEREBRO debe conservar `trading_access=false` hasta que los gates físicos de navegador/PC y el gate específico posterior de Trading queden verdes.
- Rebuild documental: `registry/external-system-state.v1.json` es la fuente máquina vigente para esta corrección.

## Fuente máquina

Estado estructurado: `cerebro/registry/external-system-state.v1.json`.
