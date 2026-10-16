# PROPERTY EDITOR · ACCEPTANCE

## E2E mínimos
1. Crear expediente con vivienda completa.
2. Abrir expediente y editar precio, dirección e inmobiliaria.
3. Cambiar de vivienda y comprobar que la anterior permanece en histórico.
4. Volver a editar la vivienda actual.
5. Quitar/cambiar inmobiliaria.
6. Mantener coherentes `expedientes.localidad`, `expedientes.precio_vivienda` e `expedientes.inmobiliaria_code`.
7. No romper listado de expedientes, tasaciones ni documentos.
8. Rechazar actualización con versión obsoleta.
9. Rollback de frontend sin pérdida de datos de viviendas.

## Criterio de cierre
No declarar HECHO hasta verificar en la App real que alta, edición y sustitución funcionan y que el histórico permanece visible.
