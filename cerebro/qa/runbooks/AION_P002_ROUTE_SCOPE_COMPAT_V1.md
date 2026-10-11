# AION P002 Route Scope Compatibility V1

## Estado

**HECHO · PREPROD**

Reparación aditiva y reversible detectada por `QA-001` durante el cierre del recorrido profundo de productos AION.

## Incidente detectado

El renderer existente `AION P002 Customer Purchase Simulation V1` estaba registrado en `template_redirect` con prioridad `-120` y consumía cualquier ruta `aion_test_result`, incluso cuando el pedido pertenecía a otro producto. En el recorrido de `AION-P003`, el pedido, la generación y el correo se completaban, pero el acceso privado terminaba en HTTP 404 porque P002 interceptaba primero la URL y rechazaba el `product_id` distinto de `AION-P002`.

## Conservación y reparación

No se sustituyó ni borró el renderer P002 existente. Se creó un wrapper de compatibilidad separado:

- WordPress plugin: `aion-p002-route-scope-compat-v1/aion-p002-route-scope-compat-v1.php`
- Nombre: `AION P002 Route Scope Compatibility V1`
- Versión: `0.1.0`
- Entorno: PREPROD
- Checkpoint previo: **178 · `Before P002 zero-payment route scope compatibility bridge · PREPROD QA closure`**

El wrapper retira únicamente el hook original y lo vuelve a registrar de forma acotada. Si el pedido es `AION-P002`, conserva el renderer P002. Si pertenece a otro producto, no consume la ruta y permite que actúe el handler correspondiente. Las rutas malformadas o desconocidas continúan fail-closed.

## OLD vs NEW

**OLD:** `AION-P003` completaba compra simulada 0 €, generación y email, pero su acceso privado era interceptado por P002 y devolvía 404.

**NEW:** tras activar el wrapper, el recorrido `AION-P003` llega al resultado privado HTTP 200, mantiene `PREPROD · 0 € · no es una venta real`, expone artefactos privados válidos y pasa el workflow `CEREBRO AION Product Deep QA V0` en main.

Evidencia canónica posterior: estado `CEREBRO_QA_PRODUCT_DEEP_STATE_V0` = `PREPROD_GREEN`, `AION-P003` = 1/1, cobertura acumulada inicial = 1/5.

## Seguridad

- real charge: `0 €`
- PROD write: `false`
- PROD authorized: `false`
- customer data: `false`
- Trading: `false`
- paid fallback: `false`
- coste adicional: `0 €`

## Rollback

1. Desactivar `AION P002 Route Scope Compatibility V1`.
2. Verificar que el hook original de `AION_P002_Customer_Purchase_Simulation_V1::maybe_render` vuelve a estar activo.
3. Ejecutar nuevamente el probe P002 y el Product Deep QA.
4. Si hubiese una regresión de estado de base de datos asociada a la intervención, existe el checkpoint WordPress **178** como punto de recuperación. El wrapper en sí no migra tablas ni modifica datos de negocio.

## Rebuild

La reparación es autocontenida: reinstalar/activar el plugin de compatibilidad con la misma lógica de scope por `product_id === AION-P002`, después ejecutar el test profundo de producto. No requiere nuevas dependencias, IA de pago ni servicio externo.

## Autonomía

`QA-001` puede seguir rotando P001/P002/P003/B005/B008. Esta reparación no concede autoridad de venta, cobro ni promoción a PROD. La cobertura completa del catálogo permanece **PARCIAL** hasta obtener evidencia fresca de los 5 productos.
