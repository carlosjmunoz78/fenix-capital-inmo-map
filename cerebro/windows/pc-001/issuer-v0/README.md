# CEREBRO PC-001 · Emisor del propietario V0 (PREPROD)

## Propósito
Añadir a la ruta de emisión de órdenes del Gateway **existente** una pieza validable sin introducir un nuevo worker ni tabla. Solo permite `SERVICE_HEALTH/READ_HEALTH` sobre el PC-001 exacto. Es una biblioteca determinista: no tiene red, credenciales, SQL ni ejecución del PC.

## Integración futura
El servidor de CEREBRO Console debe implementar tres dependencias confiables: identidad del propietario autenticada y reciente (obtenida del servidor, no del modelo), estado de autorizaciones leído del backend, y operación transaccional de emisión exacta a la cola existente. La base de datos ya tiene `UNIQUE(company_id,environment,device_id,idempotency_key)` y `PRIMARY KEY(command_id)`. El código exige que el emisor verifique fila y hash y nunca entregue service_role al navegador o al PC.

La función `issuePc001HealthCommandV0` es un punto de integración: su backend debe pasar `enqueue_unique(row, grant_commit_context)` como transacción atómica, crear la orden y consumir el permiso ONE_SHOT o incrementar el uso del permiso ALL_SIMILAR en la misma transacción, devolver el hash verificado y registrar auditoría. Además debe garantizar autenticación real del propietario y unicidad persistente. En este paquete NO se implementa ese backend ni se ha creado una orden real. El código no se debe enchufar a un frontend con privilegios.

## Autonomía / aprobaciones repetidas
Se reutiliza `evaluateOwnerAuthorization`: acepta una autorización **una vez** o una autorización permanente exact-scoped, pero no confunde permisos para dar órdenes con nuevos privilegios de Windows. Agentes autónomos solo podrán usar grants exactos vigentes y el mismo chequeo de política; nunca pueden generar su propia autorización.

## Gates de promoción
1. CI real del contrato V2 y del gate del propietario.
2. Prueba controlada del backend privado del propietario en PREPROD (no existe todavía en este componente).
3. E2E autenticado READ_HEALTH / receipt semántico con el PC actual.
4. Revisión, respaldo y transición reversible del worker, sin consumo concurrente de la misma cola.
5. E2E física sintética con consentimiento local; después ampliar catálogo a navegación, ventanas, archivos y aplicaciones bajo políticas independientes.

Estado: `CODE_CANDIDATE / PHYSICAL_REMOTE_PENDING`. No cambia `main`, App/CRM, Trading, producción, ni servicios Windows.

### Endurecimiento de autorizaciones
La validación del emisor verifica caducidad, revocación y consumo de permisos únicos, y límite de usos para los reutilizables. No basta con el estado ACTIVE de `owner-approval-gate` existente. La autorización del backend debe ser inmutable por el modelo. Esto está probado a nivel de código; todavía **no** se ha implementado la transacción real sobre permisos en la base de datos.