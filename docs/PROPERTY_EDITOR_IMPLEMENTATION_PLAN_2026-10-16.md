# PROPERTY EDITOR · IMPLEMENTATION / RUNBOOK · 2026-10-16

## Estado previo verificado
- Existe una única App Fénix Capital en PROD (`app.fenixcapital.es`).
- La ficha de expediente permitía editar inmobiliaria y seguimiento, pero no disponía de una ficha completa y editable del inmueble comprado.
- `fenix_prod.expedientes` conservaba `localidad`, `precio_vivienda`, `importe_solicitado`, `inmobiliaria_code` y `payload_operacion`.

## Estado actual
- **HECHO DB PROD:** migración aditiva `expediente_propiedades_editables_v1`.
- **HECHO DB PROD:** wrappers autenticados `expediente_propiedades_user_rpc_v1`.
- **HECHO BACKFILL:** 48 expedientes existentes / 48 viviendas actuales.
- **HECHO FRONTEND EN RAMA:** `src/ExpedientePropertyGuard.tsx` + `src/expediente-property.css` montados desde `DetailShellGate.tsx`.
- **PENDIENTE DE PROMOCIÓN:** CI/build + smoke test autenticado, después merge de PR #734 a `main`.

## Contrato funcional
1. Un expediente puede tener múltiples viviendas históricas, pero solo una vivienda actual.
2. Acciones diferenciadas: `Editar vivienda` y `Cambiar vivienda`.
3. Cambiar vivienda archiva la anterior (`is_current=false`) y crea/activa la nueva (`is_current=true`).
4. La vivienda se puede modificar después de creada; los cambios incrementan versión y generan auditoría.
5. La UI muestra vivienda actual e histórico de viviendas.
6. Se mantienen sincronizados los campos legacy de `expedientes`: `localidad`, `precio_vivienda`, `importe_solicitado`, `inmobiliaria_code`.
7. El control optimista usa versión del expediente + versión de la vivienda para impedir sobrescrituras concurrentes.

## Entidades añadidas
- `fenix_prod.expediente_propiedades`
- `fenix_prod.expediente_propiedad_history`

## Funciones server-side añadidas
- `public.fenix_prod_exp_properties_server(actor, expediente)`
- `public.fenix_prod_exp_property_update_server(actor, expediente, expected_exp_version, expected_property_version, changes)`
- `public.fenix_prod_exp_property_replace_server(actor, expediente, expected_exp_version, expected_property_version, old_status, property)`

## Wrappers autenticados
- `public.fenix_prod_exp_properties(expediente)`
- `public.fenix_prod_exp_property_update(expediente, expected_exp_version, expected_property_version, changes)`
- `public.fenix_prod_exp_property_replace(expediente, expected_exp_version, expected_property_version, old_status, property)`

## Datos editables
- situación de vivienda
- dirección, número, bloque, escalera, planta, puerta, localidad, provincia, CP
- tipo de inmueble, uso y mercado
- precio de compraventa y financiación solicitada
- reserva y arras, importes y fechas
- metros construidos/útiles, dormitorios, baños, garaje, trastero
- referencia catastral, finca registral, Registro de la Propiedad, fecha de nota simple
- inmobiliaria y contacto/agente
- URL del anuncio
- cargas/incidencias y notas

## Seguridad
- No se eliminan viviendas anteriores.
- No se ha eliminado ni sustituido ningún campo existente de `fenix_prod.expedientes`.
- Las tablas nuevas no tienen acceso directo para `anon`/`authenticated`; escritura y lectura pasan por funciones `SECURITY DEFINER` con contexto de usuario y rol.
- Roles permitidos: Dirección y Financiero; Financiero conserva su alcance por propietario del expediente.

## Rollback lógico
Si el frontend nuevo causara una regresión:
1. Revertir los commits de `ExpedientePropertyGuard`, CSS y montaje en `DetailShellGate`.
2. Mantener las tablas nuevas en PROD para no perder histórico ya creado.
3. La App anterior continúa operando con los campos legacy de `fenix_prod.expedientes`.
4. Los valores actuales de localidad/precio/financiación/inmobiliaria siguen válidos porque cada escritura nueva los sincroniza.
5. Deshabilitar wrappers nuevos solo si existiera un incidente de seguridad; no borrar tablas con datos operativos.

## Rebuild
- Aplicar primero `expediente_propiedades_editables_v1` y después `expediente_propiedades_user_rpc_v1`.
- El trigger `trg_exp_property_after_insert` crea automáticamente la vivienda base en nuevos expedientes.
- El backfill es idempotente: solo crea vivienda actual si el expediente no tiene una.

## Gate de aceptación
- CI TypeScript/Vite = GREEN.
- Contratos de regresión existentes = GREEN.
- App real abre un expediente autenticado sin error.
- Panel vivienda visible.
- Edición y cambio de vivienda disponibles para Dirección/Financiero.
- Histórico conserva la vivienda sustituida.
- Campos legacy sincronizados.
