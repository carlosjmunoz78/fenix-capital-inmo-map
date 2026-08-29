# Integridad de relaciones de Expedientes para PROD · 2026-08-30

## Alcance
Auditoría de solo lectura sobre los 46 expedientes legado y su representación actual en `Expedientes · Fénix Capital`. No modifica Notion, no rellena relaciones, no fusiona datos, no importa PROD y no toca `main`.

## Fuente actual
- `Expedientes · Fénix Capital`
- Data source: `collection://993423d0-8d3e-411e-bd2c-dceae3cb893b`
- Población auditada: 46 registros con `Clave deduplicación LIKE exp-legado-%`.

## Cobertura actual de relaciones en los 46 expedientes
- `Cliente`: 37/46.
- `Compradores`: 0/46.
- `Inmobiliaria`: 26/46.
- `Financiero ficha`: 0/46.
- `Documentos`: 0/46.
- `Envíos a banco`: 0/46.
- `Ofertas`: 0/46.
- `Validado contra origen`: 0/46.

Este resultado confirma que la identidad básica de los expedientes está migrada, pero la migración relacional todavía no está cerrada.

## Comparación contra CRM legado
En `01_Expedientes_PRO` la misma población de 46 expedientes presenta actualmente:
- relación con `02_Contactos_PRO`: 1/46.
- relación con inmobiliaria: 24/46.
- relación con banco: 2/46.
- relación con financiero: 42/46.
- relación con documentación estructurada: 0/46.
- adjuntos en `Documentación adjunta`: 31/46.

## Interpretación por dominio
### Cliente / compradores
La fuente nueva ya tiene 37 relaciones `Cliente`, aunque el CRM antiguo solo usaba relación estructurada de contacto en 1 expediente. Esto indica que parte de la canonización de cliente se ha realizado por una vía distinta al campo relacional antiguo. Debe verificarse por identidad y no asumirse automáticamente como validada.

### Inmobiliaria
La fuente nueva tiene 26 expedientes relacionados con inmobiliaria frente a 24 relaciones estructuradas en el CRM antiguo. Es coherente con que algunos expedientes antiguos tenían inmobiliaria únicamente en texto, pero esos dos casos adicionales deben quedar demostrados por la reconciliación de origen antes del corte PROD.

### Financiero
Este es un gap crítico de migración: el CRM antiguo tiene 42/46 expedientes con `Financiero (relación)`, mientras la fuente nueva tiene 0/46 en `Financiero ficha`.

No se debe inventar ni rellenar automáticamente. Antes de PROD se necesita un mapping explícito origen→financiero actual y una verificación de rol/usuario vigente.

### Documentación
El CRM antiguo no tiene relaciones en `Documentación (relación)`, pero 31/46 expedientes sí contienen adjuntos en `Documentación adjunta`. La fuente nueva tiene 0/46 relaciones `Documentos`.

Por tanto, la documentación histórica no puede darse por migrada. Antes de PROD debe existir un manifiesto de archivos/documentos por expediente y comprobarse que no se pierde ningún adjunto real.

### Banco
El CRM antiguo solo tiene 2/46 relaciones estructuradas de banco. La fuente nueva modela la operativa bancaria mediante `Envíos a banco`, `Ofertas` y campos de propuesta, y actualmente los 46 legado tienen 0 relaciones en `Envíos a banco` y 0 en `Ofertas`.

No se considera automáticamente un error de migración porque el modelo cambió, pero cualquier banco vigente o histórico relevante debe quedar representado antes del corte final.

## Gate relacional antes de lanzar
1. Verificar los 37 clientes ya relacionados y resolver los 9 expedientes sin `Cliente`.
2. Reconciliar las 26 inmobiliarias relacionadas y justificar los 2 casos adicionales respecto de las 24 relaciones estructuradas del legado.
3. Crear/validar mapping para los 42 financieros del legado hacia `Financiero ficha`; no migrar a ciegas usuarios obsoletos.
4. Inventariar los adjuntos de los 31 expedientes con documentación histórica y asegurar su representación segura en el modelo nuevo.
5. Reconciliar los bancos relevantes a través del modelo actual (`Envíos a banco` / `Ofertas` / propuesta) sin inventar operaciones bancarias inexistentes.
6. Solo marcar `Validado contra origen` cuando cada expediente haya pasado control de identidad, campos y relaciones.
7. Repetir esta reconciliación en el corte final del CRM antiguo inmediatamente antes de poner la app ON.

## Estado
`RELATION_GATE = OPEN`.

La población de expedientes está reconciliada, pero las relaciones críticas aún requieren trabajo antes de una carga/activación PROD real.