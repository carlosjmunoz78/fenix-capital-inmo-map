# Auditoría de fuente canónica para migración a PROD · 2026-08-29

## Alcance
Auditoría de solo lectura. No modifica Notion, no importa datos, no toca `main`, no despliega PROD y no activa usuarios.

## Resultado principal actualizado
La reconciliación de **Expedientes** está cerrada a nivel de población e identidad de migración:
- `01_Expedientes_PRO` = **LEGACY SOURCE** auditada con 46 registros.
- `Expedientes · Fénix Capital` = **CONFIRMED CURRENT SOURCE** para continuar la preparación de la app.

La confirmación se basa en claves de deduplicación existentes, no en coincidencia aproximada por nombres.

## Expedientes
### Fuente legado auditada
- Base: `01_Expedientes_PRO`
- Data source: `collection://37581b1a-756d-8145-ae8c-000b661e45e0`
- Registros: 46.

### Fuente actual reconciliada
- Base: `Expedientes · Fénix Capital`
- Database id: `261907a8-dab5-4a61-865e-a9598dc4e015`
- Data source: `collection://993423d0-8d3e-411e-bd2c-dceae3cb893b`
- Registros actuales: 72.
- 46 registros tienen `Clave deduplicación = exp-legado-*`, sin duplicados.
- Los otros 26 están identificados explícitamente como TEST/QA.

### Conclusión Expedientes
- `01_Expedientes_PRO` → `LEGACY`.
- `Expedientes · Fénix Capital` → `CONFIRMED` como fuente actual.
- Los 26 TEST → `EXCLUIR_QA_DEMO` para una futura carga PROD.
- Los 46 legado conservan mapeo 1:1 origen→destino por clave deduplicación.

Esta confirmación no autoriza todavía una carga PROD.

## Inmobiliarias
### Fuente legado auditada
- Base: `03_Inmobiliarias_PRO`
- Data source: `collection://37581b1a-756d-8164-927b-000b18504dbb`
- Registros actuales comprobados: **247**.

### Fuente actual
- Base: `Inmobiliarias · Fénix Capital`
- Database id: `fe4674ca-6f2e-4089-a76d-9fea0a94ffcf`
- Data source: `collection://5d5e1471-3131-4299-ab3e-de6a6c34be1a`
- Registros actuales: **405**.
- Registros con `Clave deduplicación`: **404**.
- Registros con `ID legado CRM`: **249**.
- Los 249 `ID legado CRM` son únicos: no se han detectado IDs legado duplicados en la fuente actual.
- Distribución de `Estado migración`: 242 `Migrado TEST`, 154 `Preparado`, 7 `Incidencia`, 2 sin estado.

### Interpretación segura
`Migrado TEST` en esta base es un **estado de migración PRE-PROD**, no una prueba suficiente de que el registro sea ficticio. No se excluyen 242 inmobiliarias por ese campo.

La fuente actual dispone de campos específicos de reconciliación (`ID legado CRM`, `Clave deduplicación`, `Validado contra origen`) y de un view `PRE-PROD · Control migración`, lo que confirma que fue diseñada como destino/maestro operativo de la migración.

Existe una discrepancia pendiente: la fuente legado auditada contiene 247 registros, mientras la fuente actual contiene 249 filas con `ID legado CRM`. Como no hay IDs repetidos, quedan **2 IDs legado adicionales** cuyo origen debe determinarse antes de declarar cerrada la reconciliación 1:1.

**Estado fuente provisional:**
- `03_Inmobiliarias_PRO` → `LEGACY` como fuente histórica de referencia.
- `Inmobiliarias · Fénix Capital` → `CANDIDATE_HIGHER_PRIORITY`, muy probablemente fuente actual, pendiente únicamente de resolver la diferencia 247↔249 y separar con seguridad las 156 filas sin ID legado.

## Contactos B2B
### Fuente actual localizada
La base destino sí existe y ha quedado localizada:
- Base: `Contactos inmobiliaria · Fénix Capital`
- Database id: `2710a815-ffe9-43c6-a576-de197c75f604`
- Data source: `collection://fcd0c063-31fe-4c7c-aeaa-461632b34967`

Su esquema incluye `ID legado CRM`, `Clave deduplicación`, `Estado migración`, `Validado contra origen` y relación directa con `Inmobiliarias · Fénix Capital`.

### Población actual
- Total: **51** contactos inmobiliarios.
- Con `ID legado CRM`: **30**.
- IDs legado duplicados detectados: **0**.
- `Estado migración = Migrado TEST`: **29**.
- `Validado contra origen = true`: **20**.

El control de migración anterior documentaba 28 origen / 28 destino. La base actual ya ha evolucionado a 51 registros y 30 con ID legado, por lo que ese control histórico no puede usarse como conteo vigente.

**Estado fuente:** `Contactos inmobiliaria · Fénix Capital` pasa de `UNKNOWN` a `CANDIDATE_HIGHER_PRIORITY`. Para declararla `CONFIRMED` falta reconciliar los 30 IDs legado con su origen exacto y clasificar los 21 contactos sin ID legado como nuevos reales, manuales, QA o pendientes.

`02_Contactos_PRO` sigue siendo una fuente candidata/legado para comparación, pero no debe declararse maestra por defecto.

## Gate de canonización restante
Antes de preparar cualquier carga real:
1. Mantener el mapping de los 46 expedientes legado ↔ actuales mediante `Clave deduplicación`.
2. Clasificar los 46 expedientes mapeados en `REAL_ACTIVO`, `REAL_HISTORICO`, `REVISAR` o exclusión estructural; no usar los 26 TEST.
3. Resolver en Inmobiliarias la diferencia **247 legado vs 249 IDs legado actuales** y clasificar las 156 filas sin ID legado.
4. Reconciliar los **30 contactos B2B con ID legado** contra su fuente de origen y clasificar los 21 sin ID legado.
5. Validar relaciones: inmobiliaria↔contactos y expedientes↔inmobiliaria/contacto/financiero/banco/documentación.
6. Solo después emitir manifiesto PROD definitivo e idempotente.

## Regla de seguridad
No se corrige, fusiona o borra nada en Notion durante esta auditoría. No se inventan relaciones. Esta reconciliación es de solo lectura y no supone activación de PROD.