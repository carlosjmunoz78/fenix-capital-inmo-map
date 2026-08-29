# Clasificación inicial de datos para migración a PROD · 2026-08-29

## Estado del gate técnico
El runtime dual PRE-PROD/PROD ha superado Build y Browser QA en `prod-preparation`. Esta clasificación no autoriza carga en PROD ni modifica Notion.

## Fuente maestra auditada
- Expedientes: `01_Expedientes_PRO`
- Contactos: `02_Contactos_PRO`
- Inmobiliarias: `03_Inmobiliarias_PRO`

## Volumen actual
- Expedientes: 46
- Contactos: 160
- Inmobiliarias: 247

## Criterio de clasificación
Cada registro se clasificará en una de estas cuatro categorías:

1. `REAL_ACTIVO`: registro real que debe estar disponible en el arranque de PROD y sigue operativo.
2. `REAL_HISTORICO`: registro real cerrado/finalizado/perdido que debe conservarse por trazabilidad, estadísticas o consulta histórica.
3. `EXCLUIR_QA_DEMO`: registro de pruebas, demostración, actor QA, contenido ficticio o dato creado exclusivamente para PRE-PROD.
4. `REVISAR`: registro que no puede clasificarse de forma segura de manera automática por ausencia de estado, relaciones incompletas, valores anómalos o información insuficiente.

No se clasifica un registro como real solo porque su nombre no contenga TEST/DEMO/PRUEBA.

## Expedientes · distribución de estados detectada
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

## Riesgos de calidad ya detectados
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
1. Cerrar clasificación individual de `REVISAR` y localizar cualquier QA/DEMO real.
2. Generar manifiesto de migración de solo lectura con IDs origen + clase + motivo.
3. Validar duplicados y claves de reconciliación.
4. Preparar carga idempotente en un backend PROD vacío.
5. Ejecutar dry-run y reconciliación de conteos/relaciones.
6. Solo después, cargar datos reales y hacer smoke QA.

## Bloqueos antes de cargar PROD
- No migrar los 46/160/247 en bloque sin clasificación.
- No borrar ni corregir silenciosamente datos fuente en Notion.
- No mezclar datos PRE-PROD con PROD.
- No reutilizar actores QA ni credenciales PRE-PROD.
- No activar usuarios reales hasta reconciliación y rollback validados.

## Siguiente paso
Construir el manifiesto de clasificación de expedientes comenzando por los registros con estado nulo o anómalo, y después extenderlo a contactos e inmobiliarias relacionados. La clasificación debe basarse en datos existentes y dejar como `REVISAR` cualquier caso dudoso.
