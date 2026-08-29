# Auditoría de fuente canónica para migración a PROD · 2026-08-29

## Alcance
Auditoría de solo lectura. No modifica Notion, no importa datos, no toca `main`, no despliega PROD y no activa usuarios.

## Resultado principal actualizado
La reconciliación de **Expedientes** ya está cerrada a nivel de población e identidad de migración:
- `01_Expedientes_PRO` = **LEGACY SOURCE** auditada con 46 registros.
- `Expedientes · Fénix Capital` = **CONFIRMED CURRENT SOURCE** para continuar la preparación de la app.

La confirmación se basa en claves de deduplicación existentes, no en coincidencia aproximada por nombres.

## Expedientes
### Fuente legado auditada
- Base: `01_Expedientes_PRO`
- Data source: `collection://37581b1a-756d-8145-ae8c-000b661e45e0`
- Registros: 46.
- Mantiene relaciones históricas con contactos, inmobiliarias, banco, documentación, tareas, notas, comisiones y financiero.

### Fuente actual reconciliada
- Base: `Expedientes · Fénix Capital`
- Database id: `261907a8-dab5-4a61-865e-a9598dc4e015`
- Data source: `collection://993423d0-8d3e-411e-bd2c-dceae3cb893b`
- Registros actuales: 72.
- Es una base distinta, no una vista del data source legado.
- Su esquema es sustancialmente más amplio: comprador/es, cliente, acciones Fénix, actividad, comunicaciones, condiciones económicas, controles documentales y financieros, gates Belén, deduplicación y relaciones operativas propias.

### Reconciliación de población
- Total fuente actual: **72**.
- Registros con `Clave deduplicación` del patrón `exp-legado-*`: **46**.
- Esas 46 claves son **únicas**: no hay ninguna clave legado duplicada en la fuente actual.
- El número coincide exactamente con los **46 registros** de `01_Expedientes_PRO`.
- Los **26 registros restantes** de la fuente actual están todos marcados explícitamente en el título como `TEST · ...` / `TEST ...`.
- Dentro de esos 26 aparecen escenarios QA, PRE-BANCO, V17, concurrencia, comunicaciones, expedientes ficticios y otros casos de prueba; varios llevan además `Estado migración = Migrado TEST`.

### Conclusión Expedientes
La diferencia `72 - 46 = 26` no representa 26 expedientes reales nuevos pendientes de reconciliación. Representa una población de prueba claramente identificada.

Por tanto:
- `01_Expedientes_PRO` → `LEGACY`.
- `Expedientes · Fénix Capital` → `CONFIRMED` como fuente actual de trabajo para la preparación de la app.
- Para una futura carga PROD, los 26 `TEST` deben clasificarse `EXCLUIR_QA_DEMO` y no migrarse como datos reales.
- Los 46 mapeados por clave legado deben conservar el vínculo origen→destino para reconciliación/idempotencia.

Esta confirmación **no autoriza** todavía una carga PROD. Queda pendiente clasificar dentro de esos 46 qué expedientes son `REAL_ACTIVO`, `REAL_HISTORICO`, `REVISAR` o exclusión estructural, y validar sus relaciones necesarias.

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

**Estado fuente:** `CANDIDATE` para `03_Inmobiliarias_PRO`; `CANDIDATE_HIGHER_PRIORITY` para `Inmobiliarias · Fénix Capital`. Falta reconciliar conteos e IDs antes de fijar canon definitivo.

## Contactos B2B
El elemento localizado como `Contactos inmobiliaria` con id `3bf81b1a-756d-8193-9b31-c9a6e8d9e102` **no es una base de contactos**. Es un registro de control de migración dentro de `Control migración · Fénix Capital`.

Ese control documenta:
- origen: CRM legado · contactos B2B;
- destino: `Contactos inmobiliaria · Fénix Capital`;
- 28 registros origen y 28 destino;
- 28 IDs legado únicos;
- 28/28 relaciones con inmobiliaria destino resueltas;
- QA parcial y no apto para corte todavía;
- una incidencia de dato pendiente y permisos/E2E aún no validados.

**Estado fuente:** `UNKNOWN/CANDIDATE` para `02_Contactos_PRO`; debe localizarse y auditarse la base destino `Contactos inmobiliaria · Fénix Capital` antes de fijar source of truth.

## Consecuencia para el manifiesto existente
El manifiesto de 46 expedientes de `01_Expedientes_PRO` sigue siendo válido como clasificación del legado, pero ahora debe interpretarse junto con el mapeo 1:1 por `exp-legado-*` hacia la fuente actual.

La fuente actual de 72 registros no debe migrarse en bloque: 46 corresponden al legado y 26 son TEST/QA explícitos.

## Gate de canonización restante
Antes de preparar cualquier carga real:
1. Mantener el mapping de los 46 expedientes legado ↔ actuales mediante `Clave deduplicación`.
2. Clasificar los 46 mapeados en `REAL_ACTIVO`, `REAL_HISTORICO`, `REVISAR` o exclusión estructural; no usar los 26 TEST.
3. Validar relaciones de los expedientes reales: cliente/contacto, inmobiliaria, financiero, banco, documentación y demás relaciones necesarias.
4. Reconciliar `03_Inmobiliarias_PRO` ↔ `Inmobiliarias · Fénix Capital`.
5. Localizar/fetch de `Contactos inmobiliaria · Fénix Capital` y compararla con `02_Contactos_PRO`.
6. Solo después emitir manifiesto PROD definitivo e idempotente.

## Regla de seguridad
No se corrige, fusiona o borra nada en Notion durante esta auditoría. No se inventan relaciones. Esta reconciliación es de solo lectura y no supone activación de PROD.