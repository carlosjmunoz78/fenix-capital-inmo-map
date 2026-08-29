# Auditoría de fuente canónica para migración a PROD · 2026-08-29

## Alcance
Auditoría de solo lectura. No modifica Notion, no importa datos, no toca `main`, no despliega PROD y no activa usuarios.

## Resultado principal
Las bases `01_Expedientes_PRO`, `02_Contactos_PRO` y `03_Inmobiliarias_PRO` deben considerarse **fuentes candidatas auditadas**, no fuentes maestras confirmadas, hasta terminar la reconciliación con las bases operativas más recientes.

## Expedientes
### Candidata histórica auditada
- Base: `01_Expedientes_PRO`
- Data source: `collection://37581b1a-756d-8145-ae8c-000b661e45e0`
- Registros auditados previamente: 46
- Mantiene relaciones con contactos, inmobiliarias, banco, documentación, tareas, notas, comisiones y financiero.

### Base operativa más reciente localizada
- Base: `Expedientes · Fénix Capital`
- Database id: `261907a8-dab5-4a61-865e-a9598dc4e015`
- Data source: `collection://993423d0-8d3e-411e-bd2c-dceae3cb893b`
- Registros actuales detectados: 72
- Es una base distinta, no una vista del data source de `01_Expedientes_PRO`.
- Su esquema es sustancialmente más amplio: comprador/es, cliente, acciones Fénix, actividad, comunicaciones, condiciones económicas, controles documentales y financieros, gates Belén, deduplicación y relaciones operativas propias.

**Estado fuente:** `CANDIDATE` para `01_Expedientes_PRO`; `CANDIDATE_HIGHER_PRIORITY` para `Expedientes · Fénix Capital`. No declarar ninguna como `CONFIRMED` hasta reconciliar IDs y población.

## Inmobiliarias
### Candidata histórica auditada
- Base: `03_Inmobiliarias_PRO`
- Data source: `collection://37581b1a-756d-8164-927b-000b18504dbb`
- Registros auditados previamente: 247.

### Base operativa más reciente localizada
- Base: `Inmobiliarias · Fénix Capital`
- Database id: `fe4674ca-6f2e-4089-a76d-9fea0a94ffcf`
- Data source: `collection://5d5e1471-3131-4299-ab3e-de6a6c34be1a`
- Es una base distinta del data source `03_Inmobiliarias_PRO`.
- Incluye relaciones a contactos/clientes, estado B2B, deduplicación, geocodificación, condiciones económicas, cadencia, asignación territorial, estado de migración y controles operativos.

**Estado fuente:** `CANDIDATE` para `03_Inmobiliarias_PRO`; `CANDIDATE_HIGHER_PRIORITY` para `Inmobiliarias · Fénix Capital`. Falta reconciliar conteos e IDs.

## Contactos B2B
El elemento localizado como `Contactos inmobiliaria` con id `3bf81b1a-756d-8193-9b31-c9a6e8d9e102` **no es una base de contactos**. Es un registro de control de migración dentro de `Control migración · Fénix Capital`.

Ese control documenta:
- origen: CRM legado · contactos B2B;
- destino: `Contactos inmobiliaria · Fénix Capital`;
- 28 registros origen y 28 destino;
- 28 IDs legado únicos;
- 28/28 relaciones con inmobiliaria destino resueltas;
- QA parcial y no apto para corte todavía;
- una incidencia de dato pendiente en un contacto y permisos/E2E aún no validados.

**Estado fuente:** `UNKNOWN/CANDIDATE` para `02_Contactos_PRO`; debe localizarse y auditarse la base destino `Contactos inmobiliaria · Fénix Capital` antes de fijar source of truth.

## Consecuencia para el manifiesto existente
El manifiesto de 46 expedientes de `01_Expedientes_PRO` sigue siendo válido como auditoría de esa fuente concreta y como material de reconciliación, pero **no debe usarse todavía como manifiesto definitivo de carga PROD**. La base más reciente contiene 72 registros y un esquema diferente.

## Gate de canonización
Antes de preparar cualquier carga real:
1. Reconciliar `01_Expedientes_PRO` ↔ `Expedientes · Fénix Capital` por IDs, título/clave deduplicación, relaciones y estado.
2. Determinar cuáles de los 72 registros son migrados, nuevos, QA/DEMO, históricos o duplicados respecto a los 46.
3. Reconciliar `03_Inmobiliarias_PRO` ↔ `Inmobiliarias · Fénix Capital`.
4. Localizar/fetch de `Contactos inmobiliaria · Fénix Capital` y compararla con `02_Contactos_PRO`.
5. Asignar por entidad uno de estos estados: `CONFIRMED`, `CANDIDATE`, `LEGACY`, `UNKNOWN`.
6. Solo después emitir manifiesto PROD definitivo e idempotente.

## Regla de seguridad
No se corrige, fusiona o borra nada en Notion durante esta auditoría. No se inventan relaciones. Si dos fuentes discrepan, la discrepancia queda explícita hasta reconciliación.
