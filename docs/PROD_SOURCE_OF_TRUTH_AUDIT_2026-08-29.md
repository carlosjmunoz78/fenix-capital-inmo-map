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

### Reconciliación 247 ↔ 249 resuelta
La diferencia de dos IDs legado ya está explicada por dos registros de prueba explícitos en la fuente actual:
- `TEST · Inmobiliaria Alfa · PRE-PROD` → `ID legado CRM = TEST-INMO-001`.
- `TEST · Inmobiliaria Beta · PRE-PROD` → `ID legado CRM = TEST-INMO-002`.

Ambos tienen `Estado migración = Migrado TEST` y claves de deduplicación `test-*`. Por tanto, los **249 IDs legado actuales = 247 de población legado + 2 IDs QA/TEST explícitos**.

El origen legado `03_Inmobiliarias_PRO` no contiene un campo `ID legado CRM`, por lo que esta reconciliación cierra la diferencia de población, pero no permite afirmar un cruce técnico fila-a-fila exclusivamente por ID desde la fuente antigua. La preservación de nombres, claves, relaciones y controles de migración debe seguir formando parte del gate de integridad.

### Interpretación segura
`Migrado TEST` en esta base es un **estado de migración PRE-PROD**, no una prueba suficiente de que el registro sea ficticio. Solo se excluyen automáticamente los dos registros anteriores porque están identificados explícitamente como TEST también por nombre e ID.

La fuente actual dispone de campos específicos de reconciliación (`ID legado CRM`, `Clave deduplicación`, `Validado contra origen`) y de un view `PRE-PROD · Control migración`, lo que confirma que fue diseñada como destino/maestro operativo de la migración.

**Estado fuente actualizado:**
- `03_Inmobiliarias_PRO` → `LEGACY`.
- `Inmobiliarias · Fénix Capital` → `CONFIRMED CURRENT SOURCE` para la preparación de la app.
- Los 2 registros `TEST-INMO-*` → `EXCLUIR_QA_DEMO` para futura carga PROD.
- Las 156 filas sin `ID legado CRM` requieren clasificación separada como altas nuevas, captación, QA, manuales o pendientes; no se excluyen ni se consideran reales automáticamente.

## Contactos B2B
### Fuente actual localizada
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

### Reconciliación de los 30 IDs legado
El control de migración histórico documentaba **28 origen / 28 destino** y 28 IDs legado únicos. La diferencia actual de dos IDs queda explicada por dos contactos QA explícitos:
- `TEST · Ana Alfa · PRE-PROD` → `ID legado CRM = TEST-CONT-INMO-001`.
- `TEST · Luis Beta · PRE-PROD` → `ID legado CRM = TEST-CONT-INMO-002`.

Ambos tienen `Estado migración = Migrado TEST` y están relacionados con las inmobiliarias TEST correspondientes.

Por tanto, los **30 IDs legado actuales = 28 contactos legado documentados + 2 contactos QA/TEST explícitos**.

**Estado fuente actualizado:**
- `Contactos inmobiliaria · Fénix Capital` → `CONFIRMED CURRENT SOURCE` para la preparación de la app.
- Los dos contactos `TEST-CONT-INMO-*` → `EXCLUIR_QA_DEMO`.
- Los 28 restantes con ID legado se conservan como población de migración real a reconciliar por integridad de campos/relaciones, no por su mera existencia.
- Los 21 contactos sin ID legado requieren clasificación como nuevas altas reales, manuales, QA o pendientes.
- `02_Contactos_PRO` queda como fuente legado/candidata de comparación, no como maestra operativa.

## Gate de canonización restante
Antes de preparar cualquier carga real:
1. Mantener el mapping de los 46 expedientes legado ↔ actuales mediante `Clave deduplicación`.
2. Clasificar los 46 expedientes mapeados en `REAL_ACTIVO`, `REAL_HISTORICO`, `REVISAR` o exclusión estructural; no usar los 26 TEST.
3. Clasificar las 156 inmobiliarias sin `ID legado CRM`, excluyendo únicamente los dos `TEST-INMO-*` ya identificados.
4. Validar integridad de los 247 registros legado representados en la fuente actual mediante nombres/claves/relaciones y controles de migración disponibles.
5. Validar los 28 contactos B2B legado y clasificar los 21 sin ID legado; excluir únicamente los dos `TEST-CONT-INMO-*` identificados.
6. Validar relaciones: inmobiliaria↔contactos y expedientes↔inmobiliaria/contacto/financiero/banco/documentación.
7. Solo después emitir manifiesto PROD definitivo e idempotente.

## Regla de seguridad
No se corrige, fusiona o borra nada en Notion durante esta auditoría. No se inventan relaciones. Esta reconciliación es de solo lectura y no supone activación de PROD.