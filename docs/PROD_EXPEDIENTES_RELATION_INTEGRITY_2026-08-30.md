# Integridad de relaciones de Expedientes para PROD · 2026-08-30

## Alcance
Auditoría de los 46 expedientes legado y su representación actual en `Expedientes · Fénix Capital`. El CRM legado permanece operativo y no se borra. Las únicas escrituras ya ejecutadas en este bloque fueron la asignación temporal, ordenada explícitamente, de todos los expedientes legado a Belén como `Financiero ficha`.

## Fuente actual
- `Expedientes · Fénix Capital`
- Data source: `collection://993423d0-8d3e-411e-bd2c-dceae3cb893b`
- Población auditada: 46 registros con `Clave deduplicación LIKE exp-legado-%`.

## Cobertura actual de relaciones en los 46 expedientes
- `Cliente`: 37/46.
- `Compradores`: 0/46.
- `Inmobiliaria`: 26/46.
- `Financiero ficha`: 46/46, asignado temporalmente a Belén por decisión operativa de 2026-08-30.
- `Documentos`: 0/46; la migración binaria histórica sigue pendiente.
- `Envíos a banco`: 0/46 en esta población legado.
- `Ofertas`: 0/46 en esta población legado.
- `Validado contra origen`: 0/46.

## Comparación contra CRM legado
En `01_Expedientes_PRO` la misma población presenta:
- relación con `02_Contactos_PRO`: 1/46.
- relación estructurada con inmobiliaria: 24/46.
- relación con banco: 2/46.
- relación con financiero: 42/46, conservada solo como evidencia histórica; no se reconstruye porque la regla operativa vigente asigna todos a Belén.
- relación con documentación estructurada: 0/46.
- adjuntos reales en `Documentación adjunta`: 31 expedientes / 118 archivos.

## Interpretación por dominio

### Cliente / compradores
La fuente nueva tiene 37 relaciones `Cliente`. Quedan 9 sin relación: 2 son registros estructurales/no operativos y 7 son expedientes reales. Para esos 7 no se ha encontrado coincidencia exacta segura en `Clientes · Fénix Capital`; no se vincularán por parecido de nombre. Se exige evidencia adicional de identidad (teléfono, email, DNI/NIE u otra señal inequívoca).

### Inmobiliaria — reconciliación cerrada a nivel de origen
La diferencia 26 actual vs 24 relaciones estructuradas del legado queda explicada exactamente.

El CRM antiguo contiene 27 expedientes con inmobiliaria en relación y/o texto:
- 24 con relación estructurada.
- 3 solo en texto: `KIKO LOPERA → BROKER`, `Paco Martín → Martin` y `SAMRA IMRAN → ANDALUZA`.

La fuente nueva tiene 26 relaciones `Inmobiliaria`:
- conserva los 24 casos con relación estructurada del origen;
- además ha canonizado 2 de los 3 casos texto-only: `KIKO LOPERA` y `SAMRA IMRAN`;
- `Paco Martín` sigue sin relación `Inmobiliaria` en el CRM nuevo.

Por tanto, los dos casos adicionales respecto de las 24 relaciones estructuradas ya están justificados por evidencia del propio origen. No se ha inventado ninguna inmobiliaria. El único pendiente de este subbloque es validar/canonizar `Paco Martín → Martin` si existe evidencia suficiente sobre qué registro actual corresponde.

### Financiero — gap operativo cerrado
El antiguo tiene 42/46 relaciones financieras históricas. Por decisión operativa explícita del 2026-08-30, de momento todos los expedientes se asignan a Belén. Esa regla ya se aplicó en el CRM nuevo y se verificó 46/46 en `Financiero ficha`.

No es necesario reconstruir los 42 responsables históricos para el lanzamiento operativo. El dato antiguo se conserva como trazabilidad/auditoría y no se borra.

### Documentación — principal gap pendiente
El CRM antiguo contiene 31 expedientes con 118 adjuntos históricos reales. Los 31 tienen destino exacto 31/31 en el CRM nuevo mediante `exp-legado-*` y el mecanismo de migración idempotente ya está construido y validado.

La ejecución física desde GitHub sigue bloqueada únicamente porque `NOTION_TOKEN_READY=no` en Actions. No se considera migrado hasta verificar 118/118 accesibles en `Documentación · Fénix Capital`. El CRM antiguo mantiene todos sus adjuntos intactos.

### Banco
El legado solo tiene 2 expedientes con relación bancaria estructurada, aunque varios contienen bancos en una lista histórica. La fuente nueva usa un modelo distinto (`Envíos a banco`, `Ofertas`, propuesta/recomendación).

Las listas históricas se conservan como contexto y no se transforman automáticamente en envíos u ofertas porque no prueban que existiera una operación bancaria real.

## Gate relacional antes de lanzar
1. Cliente: resolver con evidencia los 7 expedientes reales todavía sin relación; excluir del gate de cliente real los 2 registros estructurales.
2. Inmobiliaria: diferencia 26 vs 24 explicada y cerrada; revisar únicamente `Paco Martín → Martin` antes del corte final si hay evidencia canónica suficiente.
3. Financiero: CERRADO operativamente por regla temporal Belén 46/46.
4. Documentación: ejecutar la migración de 118 archivos cuando el runtime disponga de credencial y reconciliar 118/118.
5. Banco: preservar contexto y crear relaciones operativas solo con evidencia de envío/oferta real.
6. Solo marcar `Validado contra origen` tras control integral por expediente.
7. Repetir todo el control en el corte delta final del CRM antiguo inmediatamente antes de poner la app ON.

## Estado
`RELATION_GATE = OPEN`.

Subgates cerrados: `FINANCIERO = CLOSED`, `INMOBILIARIA_DIFF_26_VS_24 = CLOSED`.

Pendientes principales: `DOCUMENTACION_118`, `CLIENTE_7_REALES`, `PACO_MARTIN_INMOBILIARIA`, contexto bancario verificable y corte delta final.