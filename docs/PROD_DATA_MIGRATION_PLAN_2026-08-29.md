# Plan de migración de datos reales a PROD · Fénix Capital

Fecha: 2026-08-29
Rama: `prod-preparation`
Estado: preparación solamente. No autoriza carga en PROD ni modifica PRE-PROD.

## Principio de arquitectura

Fénix mantendrá dos entornos permanentes y separados:

- **PROD**: usuarios reales, datos reales y operativa diaria.
- **PRE-PROD**: laboratorio de pruebas, QA y validación de actualizaciones antes de promoverlas a PROD.

PRE-PROD no se convierte en PROD y sus registros DEMO/TEST no se migran por defecto.

## Orden obligatorio antes del primer uso real

1. Preparar infraestructura PROD independiente: frontend, backend, auth, storage, secretos y funciones de producción.
2. Congelar una instantánea de las fuentes maestras reales en el momento de migración.
3. Inventariar qué registros son reales, cuáles son históricos útiles y cuáles son TEST/DEMO.
4. Crear una exportación/migración idempotente con claves de deduplicación y tabla de correspondencias origen → destino.
5. Cargar primero catálogos y entidades padre; después relaciones y expedientes; por último documentos, tareas y actividad viva.
6. Ejecutar auditoría de conteos, relaciones, campos críticos, duplicados y permisos.
7. Hacer smoke test con Dirección/Belén antes de habilitar trabajo real.
8. Mantener rollback completo y no eliminar las fuentes de origen durante la estabilización.

## Fuentes maestras localizadas en Notion

La revisión del workspace ha localizado las bases PRO que deben auditarse antes de cualquier migración:

- `01_Expedientes_PRO` — base `37581b1a-756d-8068-ad7f-d5a656ac2015`, data source `collection://37581b1a-756d-8145-ae8c-000b661e45e0`.
- `02_Contactos_PRO` — base `37581b1a-756d-800f-8592-cf2c23cc5c3d`.
- `03_Inmobiliarias_PRO` — base `37581b1a-756d-8097-956b-c1aef866710b`.

El esquema de `01_Expedientes_PRO` confirma relaciones con Contactos, Inmobiliarias, Bancos, Documentación, Tareas, Comisiones, Notas y Financiero. Por tanto, no se puede migrar Expedientes como una tabla aislada sin reconstruir primero esas dependencias.

Antes de declarar una fuente como canónica definitiva hay que abrir su esquema, revisar registros y confirmar que no existe una base posterior o paralela que contenga la operativa real más reciente.

## Secuencia de carga propuesta

### Nivel 0 · Configuración y usuarios

- Usuarios reales autorizados.
- Roles y permisos.
- Catálogos globales y estados permitidos.

No migrar actores QA como `DIR-TEST`, `FIN-*`, `VIS-*`, cuentas `@fenix.test` ni tokens/sesiones de prueba.

### Nivel 1 · Directorios maestros

- Bancos y contactos bancarios.
- Notarías y personal relacionado.
- Registros de la Propiedad y personal relacionado.
- Tasadores/proveedores si forman parte del ámbito aprobado de arranque.

### Nivel 2 · Red comercial

- Inmobiliarias reales.
- Trabajadores/contactos de inmobiliarias.
- Relación inmobiliaria ↔ visitador/responsable cuando exista fuente real validada.

### Nivel 3 · Personas y contactos

- Particulares reales.
- Clientes procedentes de inmobiliarias.
- Contactos vinculados a expedientes.
- Deduplicación por identificadores fiables disponibles; nunca fusionar solo por parecido de nombre.

### Nivel 4 · Expedientes y casos especiales

- Expedientes hipotecarios reales.
- Relaciones con clientes, inmobiliarias, banco, financiero y documentación.
- Estado/fase y próxima acción existentes en fuente real.
- Herencias y Obras Nuevas reales si existen; excluir expresamente los registros DEMO de PRE-PROD.

### Nivel 5 · Documentación y actividad viva

- Documentos y enlaces autorizados.
- Tareas pendientes necesarias para continuidad operativa.
- Firmas/tasaciones activas.
- Notas e historial que sean necesarios para entender el expediente.

No copiar basura de QA, trazas de prueba, simulaciones de comunicaciones ni archivos ficticios.

## Limpieza TEST/DEMO

Todo candidato a migración se clasifica como `REAL`, `HISTORICO_UTIL`, `REVISAR` o `EXCLUIR_TEST_DEMO`.

Se excluyen por defecto:

- registros con marcadores TEST/DEMO evidentes;
- actores QA y cuentas de prueba;
- herencias/obras nuevas creadas únicamente para PRE-PROD;
- datos generados por pruebas automáticas;
- comunicaciones simuladas;
- documentos ficticios o binarios usados solo para QA.

La limpieza se hace **en el conjunto de migración**, no destruyendo PRE-PROD. PRE-PROD debe conservar datos de prueba suficientes para validar futuras actualizaciones.

## Reglas de integridad

La migración debe ser idempotente. Ejecutarla dos veces no puede crear duplicados.

Cada lote debe registrar, como mínimo:

- identificador de origen;
- identificador de destino PROD;
- tipo de entidad;
- fecha/hora de migración;
- resultado (`CREADO`, `ACTUALIZADO`, `OMITIDO`, `REVISAR`, `ERROR`);
- motivo cuando no se migra;
- checksum o firma de campos críticos cuando sea técnicamente viable.

No se deben inventar valores para completar campos vacíos. Si falta un dato necesario, queda señalado para revisión.

## Gates antes de abrir PROD

No se autoriza el piloto real hasta que estén en verde:

- infraestructura PROD separada de PRE-PROD;
- backend y funciones de producción sin sufijo `-test` y con secretos propios;
- usuarios reales y RBAC verificados;
- inventario de fuentes maestras terminado;
- clasificación TEST/DEMO terminada;
- migración ensayada con datos controlados;
- conteos y relaciones reconciliados;
- cero actores QA en PROD;
- smoke test de Dirección/Belén;
- rollback probado/documentado.

## Qué NO se hace en este bloque

- No se borra PRE-PROD.
- No se fusiona PR #2.
- No se toca `main` automáticamente.
- No se cargan todavía datos reales en un backend PROD no validado.
- No se activan OCR, audio→texto, chat interno ni funciones post-arranque.

## Próximo trabajo técnico

1. Auditar esquemas y registros reales de las bases PRO relacionadas.
2. Construir inventario de dependencias y orden de migración.
3. Diseñar exportación, deduplicación y reconciliación sin escribir todavía en PROD.
4. Paralelamente, desacoplar el frontend de constantes PRE-PROD para que pueda arrancar exclusivamente con configuración PROD cuando existan credenciales reales.
