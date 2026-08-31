# Clasificación inicial de datos para migración a PROD · 2026-08-29

## Estado del gate técnico
El runtime dual PRE-PROD/PROD ha superado Build y Browser QA en `prod-preparation`. Esta clasificación no autoriza carga en PROD ni modifica Notion.

## Fuentes candidatas auditadas
Hasta completar la reconciliación de source of truth, estas fuentes se consideran candidatas, no maestras definitivas:
- Expedientes: `01_Expedientes_PRO`
- Contactos: `02_Contactos_PRO`
- Inmobiliarias: `03_Inmobiliarias_PRO`

La auditoría posterior ha localizado bases operativas distintas y más recientes para Expedientes e Inmobiliarias. Véase `docs/PROD_SOURCE_OF_TRUTH_AUDIT_2026-08-29.md`.

## Volumen de las candidatas *_PRO
- Expedientes: 46
- Contactos: 160
- Inmobiliarias: 247

Estos conteos describen esas fuentes concretas; no representan todavía el volumen canónico definitivo de PROD.

## Criterio de clasificación
Cada registro se clasificará en una de estas cuatro categorías:

1. `REAL_ACTIVO`: registro real que debe estar disponible en el arranque de PROD y sigue operativo.
2. `REAL_HISTORICO`: registro real cerrado/finalizado/perdido que debe conservarse por trazabilidad, estadísticas o consulta histórica.
3. `EXCLUIR_QA_DEMO`: registro de pruebas, demostración, actor QA, contenido ficticio o dato creado exclusivamente para PRE-PROD.
4. `REVISAR`: registro que no puede clasificarse de forma segura de manera automática por ausencia de estado, relaciones incompletas, valores anómalos o información insuficiente.

No se clasifica un registro como real solo porque su nombre no contenga TEST/DEMO/PRUEBA.

## Expedientes · distribución de estados detectada en `01_Expedientes_PRO`
- `Documentación completa`: 13
- `Finalizado`: 12
- Sin estado: 9
- `Documentación incompleta`: 4
- `Tasación realizada`: 3
- `Pre-OK + Tasación realizada`: 1
- `Perdido`: 1
- `ESTADO + Finalizado`: 1
- `Documentación completa + Finalizado`: 1
- `Cambio de luz + Documentación incompleta + Finalizado`: 1

### Regla provisional
- Estados operativos claros (`Documentación completa`, `Documentación incompleta`, `Tasación realizada`, `Pre-OK`) → candidatos a `REAL_ACTIVO`, siempre que identidad/relaciones confirmen que son reales.
- `Finalizado` y `Perdido` → candidatos a `REAL_HISTORICO`, siempre que identidad/relaciones confirmen que son reales.
- Sin estado o combinaciones anómalas (`ESTADO`, `Cambio de luz`, estados simultáneos incompatibles) → `REVISAR` hasta validación individual.
- Cualquier registro QA/DEMO confirmado → `EXCLUIR_QA_DEMO`, independientemente de su estado.

## Riesgos de calidad ya detectados en las candidatas *_PRO
### Expedientes
- 1 sin título de expediente.
- 2 sin cliente.
- 3 sin financiero responsable.
- 9 sin estado.
- Existen combinaciones de estado anómalas que no deben normalizarse silenciosamente.

### Contactos
- 6 sin teléfono ni email.
- 2 sin tipo de contacto.

### Inmobiliarias
- 24 sin teléfono, email ni web.

Estos huecos no implican automáticamente excluir el registro. Se conservan como `REVISAR` si impiden identificarlo o relacionarlo con seguridad.

## Relaciones que deben sobrevivir a la migración
Prioridad de integridad:
1. Inmobiliaria ↔ contactos.
2. Contacto ↔ expedientes.
3. Expediente ↔ inmobiliaria.
4. Expediente ↔ financiero responsable.
5. Expediente ↔ banco.
6. Expediente ↔ documentación.
7. Expediente ↔ tareas/notas/comisiones cuando corresponda.

No se crearán relaciones ficticias para completar huecos.

## Orden seguro de trabajo
1. Confirmar source of truth por entidad (`CONFIRMED`, `CANDIDATE`, `LEGACY`, `UNKNOWN`).
2. Reconciliar la población de las fuentes candidatas con las bases operativas más recientes.
3. Cerrar clasificación individual de `REVISAR` y localizar cualquier QA/DEMO real.
4. Generar manifiesto de migración definitivo de solo lectura con IDs origen + clase + motivo.
5. Validar duplicados y claves de reconciliación.
6. Preparar carga idempotente en un backend PROD vacío.
7. Ejecutar dry-run y reconciliación de conteos/relaciones.
8. Solo después, cargar datos reales y hacer smoke QA.

## Bloqueos antes de cargar PROD
- No migrar los 46/160/247 en bloque como si fueran conteos canónicos definitivos.
- No borrar ni corregir silenciosamente datos fuente en Notion.
- No mezclar datos PRE-PROD con PROD.
- No reutilizar actores QA ni credenciales PRE-PROD.
- No activar usuarios reales hasta reconciliación y rollback validados.

## Siguiente paso
Reconciliar primero `01_Expedientes_PRO` con `Expedientes · Fénix Capital` y `03_Inmobiliarias_PRO` con `Inmobiliarias · Fénix Capital`; localizar después la base destino real `Contactos inmobiliaria · Fénix Capital`. Solo con esa canonización cerrada se convertirá el manifiesto provisional en manifiesto de carga PROD.
