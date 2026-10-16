# PROPERTY EDITOR · IMPLEMENTATION PLAN · 2026-10-16

## Estado previo verificado
- Existe una única App Fénix Capital en PROD (`app.fenixcapital.es`).
- La ficha de expediente permite editar inmobiliaria y seguimiento, pero no dispone de una ficha completa y editable del inmueble comprado.
- `fenix_prod.expedientes` conserva hoy `localidad`, `precio_vivienda`, `importe_solicitado`, `inmobiliaria_code` y `payload_operacion`.
- La solución debe conservar compatibilidad con esos campos y no borrar histórico.

## Objetivo
Añadir una ficha completa del inmueble dentro del expediente con edición total y capacidad de sustituir vivienda sin perder el histórico.

## Contrato funcional
1. Un expediente puede tener múltiples viviendas históricas, pero solo una vivienda actual.
2. Acciones diferenciadas: `Editar vivienda` y `Cambiar vivienda`.
3. Cambiar vivienda archiva la anterior (`is_current=false`) y crea/activa la nueva (`is_current=true`).
4. Inmobiliaria, precio y demás datos son editables en cualquier momento con versionado/auditoría.
5. La UI debe mostrar vivienda actual e histórico de viviendas.
6. Mantener sincronizados los campos legacy del expediente (`localidad`, `precio_vivienda`, `inmobiliaria_code`) para no romper consumidores existentes mientras migra el contrato.

## Datos mínimos de vivienda
- estado
- dirección, localidad, provincia, CP
- tipo de inmueble
- destino de vivienda
- obra nueva / segunda mano
- precio de compraventa
- importe y fecha de reserva
- importe y fecha de arras
- metros construidos y útiles
- dormitorios, baños, garaje, trastero
- referencia catastral
- finca registral y registro de la propiedad
- nota simple y fecha
- cargas/incidencias/observaciones
- inmobiliaria y contacto/agente opcional
- URL del inmueble/anuncio
- tasación asociada / documentación relacionada

## Seguridad de cambio
- No borrar la vivienda anterior al sustituirla.
- Control de versión optimista.
- Cambios auditables.
- No modificar permisos/RLS existentes para hacer pasar la funcionalidad.

## Rollback
- La nueva tabla puede quedar sin consumidores y la App seguir usando los campos legacy de `expedientes`.
- El frontend nuevo se puede revertir sin perder datos históricos.
