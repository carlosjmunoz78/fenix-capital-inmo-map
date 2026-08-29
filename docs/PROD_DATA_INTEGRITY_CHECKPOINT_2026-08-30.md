# Checkpoint de integridad de datos PROD · 2026-08-30

## Alcance
Auditoría de solo lectura sobre las fuentes actuales de CRM. No modifica Notion, no importa datos, no toca `main`, no despliega PROD y no activa usuarios.

## Inmobiliarias · partición completa de la fuente actual
Fuente actual: `Inmobiliarias · Fénix Capital` (`collection://5d5e1471-3131-4299-ab3e-de6a6c34be1a`).

La población de 405 registros queda explicada sin huecos:
- 247 registros de población legado representada en la fuente actual.
- 154 registros nuevos preparados sin `ID legado CRM` y sin marcador TEST explícito.
- 4 registros QA/TEST explícitos identificados y excluibles de una futura carga PROD.

Comprobaciones sobre las 154 altas nuevas candidatas:
- 154/154 tienen `Clave deduplicación`.
- No se detectan claves de deduplicación repetidas dentro de este bloque.
- 154/154 tienen localidad.
- 100/154 tienen al menos un medio de contacto entre email, teléfono o web.
- 54/154 no tienen actualmente email/teléfono/web y requieren revisión de contactabilidad, pero no se consideran QA por ese hecho.
- Estado operativo: 122 `Sin revisar`, 9 `No quiere`, 1 `Activa`; el resto corresponde a registros de directorio/prospección incluidos en esos estados.
- 22 indican `Origen captación = Directorio / prospección`; el resto no tiene origen de captación informado.

Comprobaciones sobre los 247 registros legado:
- 247/247 tienen `Clave deduplicación`.
- 247/247 tienen localidad.
- 221/247 tienen al menos email, teléfono o web.
- 7/247 mantienen `Estado migración = Incidencia`.
- Las incidencias revisadas son mayoritariamente posibles duplicados no fusionados; el origen permanece intacto. No deben resolverse automáticamente sin validación.

## Contactos inmobiliaria · partición completa de la fuente actual
Fuente actual: `Contactos inmobiliaria · Fénix Capital` (`collection://fcd0c063-31fe-4c7c-aeaa-461632b34967`).

La población de 51 registros queda explicada sin huecos:
- 28 contactos de población legado documentada.
- 20 contactos nuevos preparados sin `ID legado CRM` y sin marcador TEST explícito.
- 3 contactos QA/TEST explícitos identificados y excluibles de una futura carga PROD.

Comprobaciones sobre los 20 contactos nuevos candidatos:
- 20/20 tienen `Clave deduplicación`.
- No se detectan claves de deduplicación repetidas dentro de este bloque.
- 20/20 están relacionados con una inmobiliaria.
- 20/20 constan como activos.
- 20/20 constan como `Validado contra origen`.
- 18/20 tienen email o teléfono; 2/20 requieren revisión de contactabilidad.

Comprobaciones sobre los 28 contactos legado:
- 28/28 tienen `Clave deduplicación`.
- 28/28 están relacionados con una inmobiliaria.
- 7/28 tienen email o teléfono estructurado actualmente.
- 1/28 mantiene `Estado migración = Incidencia`.
- Esa incidencia corresponde a un dato de teléfono incrustado en el nombre del origen y no extraído automáticamente para evitar alterar información sin validación. Debe resolverse manualmente o mediante regla aprobada antes del corte final.

## Estado del gate de datos
Queda demostrado que las dos fuentes B2B actuales están totalmente particionadas en legado, nuevas candidatas y QA/TEST. El gate aún NO está cerrado porque faltan:
1. Resolver o aprobar las 7 incidencias de inmobiliarias legado.
2. Resolver la incidencia del contacto legado.
3. Revisar contactabilidad de los registros sin medios de contacto estructurados.
4. Validar relaciones finales con expedientes y resto de entidades necesarias.
5. Ejecutar el corte final del CRM antiguo inmediatamente antes del lanzamiento, incorporando altas/cambios producidos desde esta auditoría.

## Regla de seguridad
No se fusionan duplicados, no se reescriben teléfonos, no se borran TEST y no se modifica ningún dato origen durante esta fase. Toda corrección de datos se hará únicamente con evidencia suficiente y antes de la carga/activación PROD definitiva.