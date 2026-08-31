# Auditoría de inventario de datos para PROD · 2026-08-29

## Objetivo
Congelar el primer inventario verificable de las fuentes maestras actuales antes de cualquier carga real en PROD. Esta auditoría es de solo lectura sobre Notion y no borra, modifica ni migra registros.

## Fuentes maestras verificadas

### 01_Expedientes_PRO
- Data source: `collection://37581b1a-756d-8145-ae8c-000b661e45e0`
- Registros actuales: **46**
- Búsqueda simple por nombre con `test`, `demo` o `prueba`: **0 coincidencias**.
- Calidad mínima detectada:
  - 1 registro sin título de expediente.
  - 2 registros sin cliente.
  - 19 sin inmobiliaria en texto ni relación. Esto NO implica error por sí mismo: pueden ser particulares y debe clasificarse por tipo/origen antes de migrar.
  - 3 sin financiero asignado ni relación.
- Relaciones estructurales observadas: contactos, inmobiliarias, bancos, documentación, tareas, comisiones, notas y financiero.

### 02_Contactos_PRO
- Data source: `collection://37581b1a-756d-8161-9fab-000bcb980eb2`
- Registros actuales: **160**
- Búsqueda simple por nombre con `test`, `demo` o `prueba`: **0 coincidencias**.
- Calidad mínima detectada:
  - 0 sin nombre.
  - 6 sin teléfono y sin email.
  - 2 sin tipo de contacto.
- Relaciones estructurales observadas: expedientes, inmobiliarias, tareas, notas y registro de financiero.

### 03_Inmobiliarias_PRO
- Data source: `collection://37581b1a-756d-8164-927b-000b18504dbb`
- Registros actuales: **247**
- Búsqueda simple por nombre con `test`, `demo` o `prueba`: **0 coincidencias**.
- Calidad mínima detectada:
  - 0 sin nombre.
  - 0 sin localidad.
  - 24 sin teléfono, email ni web.
- Relaciones estructurales observadas: contactos, expedientes, tareas y notas.

## Importante: cero coincidencias NO equivale a cero datos de prueba
La búsqueda anterior es solo un filtro inicial por texto. No autoriza a considerar automáticamente los 453 registros como datos reales. Los registros DEMO/QA pueden tener nombres aparentemente reales. Antes de migrar se exige clasificación por procedencia, relaciones, fechas, estado y coherencia operativa.

## Clasificación obligatoria antes de carga
Cada registro migrable deberá quedar en una de estas categorías:
- `REAL_ACTIVO`: operativo y vigente.
- `REAL_HISTORICO`: real, cerrado/firmado/perdido pero necesario para histórico, métricas o trazabilidad.
- `EXCLUIR_QA_DEMO`: prueba, demo, actor QA o dato creado exclusivamente para validación técnica.
- `REVISAR`: no hay evidencia suficiente para decidir automáticamente.

La clasificación no se inferirá solo por el nombre.

## Orden de migración
1. Directorios base y catálogos necesarios.
2. Inmobiliarias reales.
3. Contactos reales y relaciones con inmobiliarias.
4. Expedientes reales/históricos y sus relaciones.
5. Documentación vinculada.
6. Tareas/notas estrictamente necesarias para continuidad operativa.
7. Reconciliación y conteos cruzados.

## Gates de calidad antes de PROD
- Ningún actor `*-TEST`, correo `@fenix.test` ni sesión QA en PROD.
- Ninguna Edge Function `-test` en runtime PROD.
- Cero registros sin clasificación de migración.
- Duplicados revisados antes de insertar.
- Relaciones reconstruidas por identificadores estables, nunca por coincidencia ambigua de texto.
- Conteos origen/destino reconciliados por categoría.
- No inventar campos ausentes para completar registros.
- Los registros dudosos quedan fuera de la primera carga hasta revisión.

## Estado
**INVENTARIO INICIAL: REALIZADO**

**MIGRACIÓN REAL: NO INICIADA**

**PROD: NO ACTIVADA**

Siguiente bloque: construir reglas de clasificación y exportación/reconciliación de solo lectura; en paralelo validar el runtime desacoplado de PRE-PROD. No se carga ninguna fila en PROD hasta disponer de backend PROD separado y gate verde.
