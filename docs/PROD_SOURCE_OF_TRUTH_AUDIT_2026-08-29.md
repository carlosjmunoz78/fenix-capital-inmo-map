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
- Los 249 `ID legado CRM` son únicos.
- Distribución de `Estado migración`: 242 `Migrado TEST`, 154 `Preparado`, 7 `Incidencia`, 2 sin estado.

### Reconciliación 247 ↔ 249 resuelta
La diferencia de dos IDs legado queda explicada por dos registros QA explícitos:
- `TEST · Inmobiliaria Alfa · PRE-PROD` → `TEST-INMO-001`.
- `TEST · Inmobiliaria Beta · PRE-PROD` → `TEST-INMO-002`.

Por tanto, los **249 IDs legado actuales = 247 de población legado + 2 IDs QA/TEST explícitos**.

### Clasificación de las 156 filas sin ID legado
La revisión de solo lectura deja el bloque mucho más limpio:
- **154** filas sin `ID legado CRM` tienen `Estado migración = Preparado` y no presentan marcador TEST explícito en título/clave. Se clasifican provisionalmente como `NUEVA_POBLACION_CANDIDATA`, pendientes de validación de identidad, procedencia y relaciones antes de PROD.
- **2** filas sin `ID legado CRM` son QA explícito y deben quedar fuera de PROD:
  - `TEST · Inmobiliaria B2B E2E · PRE-PROD`.
  - `TEST · Inmobiliaria Horizonte`.

No se convierten automáticamente las 154 preparadas en datos reales definitivos; simplemente quedan separadas del QA explícito y listas para la siguiente validación de integridad.

**Estado fuente actualizado:**
- `03_Inmobiliarias_PRO` → `LEGACY`.
- `Inmobiliarias · Fénix Capital` → `CONFIRMED CURRENT SOURCE`.
- Los 4 registros TEST identificados en esta reconciliación (2 con ID legado QA + 2 sin ID legado) → `EXCLUIR_QA_DEMO`.

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
El control de migración histórico documentaba **28 origen / 28 destino**. La diferencia actual de dos IDs queda explicada por:
- `TEST · Ana Alfa · PRE-PROD` → `TEST-CONT-INMO-001`.
- `TEST · Luis Beta · PRE-PROD` → `TEST-CONT-INMO-002`.

Por tanto, los **30 IDs legado actuales = 28 contactos legado documentados + 2 contactos QA/TEST explícitos**.

### Clasificación de los 21 contactos sin ID legado
- **20** contactos sin `ID legado CRM` tienen `Estado migración = Preparado` y no muestran marcador TEST explícito en título/clave. Se clasifican provisionalmente como `NUEVA_POBLACION_CANDIDATA`, pendientes de validar identidad, inmobiliaria relacionada y procedencia.
- **1** contacto es QA explícito y debe excluirse de PROD:
  - `TEST · Contacto inmobiliaria E2E · PRE-PROD`.

**Estado fuente actualizado:**
- `Contactos inmobiliaria · Fénix Capital` → `CONFIRMED CURRENT SOURCE`.
- Los 3 contactos TEST identificados (2 con ID legado QA + 1 sin ID legado) → `EXCLUIR_QA_DEMO`.
- Los 28 restantes con ID legado y los 20 nuevos preparados continúan al gate de integridad/relaciones.
- `02_Contactos_PRO` queda como fuente legado/candidata de comparación, no como maestra operativa.

## Plan de transición CRM acordado
Objetivo operativo:
- **En cuanto la nueva app quede ON y validada para uso real**, empezar a trabajar sobre el CRM nuevo/canónico.
- Mantener el CRM antiguo como respaldo/transición durante aproximadamente **un mes**.
- Durante ese mes, priorizar reconciliación, detección de faltantes, duplicados, relaciones y fricciones reales de uso.
- Tras el mes de convivencia y con el gate de integridad verde, retirar el CRM antiguo de la operativa diaria, conservándolo únicamente como legado/histórico según corresponda.

Este plan no autoriza todavía apagar, borrar ni bloquear el CRM antiguo, ni activar PROD antes del gate técnico y de datos.

## Gate de canonización restante
Antes de preparar cualquier carga real:
1. Mantener el mapping de los 46 expedientes legado ↔ actuales mediante `Clave deduplicación`.
2. Clasificar los 46 expedientes mapeados en `REAL_ACTIVO`, `REAL_HISTORICO`, `REVISAR` o exclusión estructural; no usar los 26 TEST.
3. Validar las 154 inmobiliarias nuevas preparadas y excluir las 4 QA identificadas en la fuente actual.
4. Validar integridad de los 247 registros legado representados en la fuente actual mediante nombres/claves/relaciones y controles de migración disponibles.
5. Validar los 28 contactos B2B legado y los 20 nuevos preparados; excluir los 3 QA identificados.
6. Validar relaciones: inmobiliaria↔contactos y expedientes↔inmobiliaria/contacto/financiero/banco/documentación.
7. Solo después emitir manifiesto PROD definitivo e idempotente.

## Regla de seguridad
No se corrige, fusiona o borra nada en Notion durante esta auditoría. No se inventan relaciones. Esta reconciliación es de solo lectura y no supone activación de PROD.