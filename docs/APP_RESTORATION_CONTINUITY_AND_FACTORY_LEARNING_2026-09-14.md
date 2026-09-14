# APP Fénix · continuidad de restauración + aprendizaje reutilizable para CEREBRO

Fecha: 2026-09-14
Estado: ACTIVO / CANÓNICO PARA CONTINUIDAD DE ESTA RESTAURACIÓN

## Propósito

Este documento evita pérdida de contexto entre chats y convierte la restauración de App Fénix en conocimiento reutilizable para CEREBRO OS. No es solo una lista de incidencias: debe servir para que, cuando CEREBRO reciba el encargo de construir o restaurar otra app, aplique automáticamente los mismos principios, gates y controles.

## Regla de trabajo

CONSERVAR → ENTENDER → ENVOLVER → PROBAR → MEJORAR → MIGRAR.

No usar la interfaz defectuosa actual como baseline funcional. Comparar siempre contra contrato, histórico confirmado, código existente y comportamiento esperado.

## Fuente de verdad de la restauración actual

Repositorio: `carlosjmunoz78/fenix-capital-inmo-map`
Rama de trabajo: `app-restoration-v0-20260914`
PR: `#380`

No tocar PROD directamente desde esta línea. Todo cambio debe ser reversible y con rollback claro.

## Estado resumido

### HECHO

- Rama paralela de restauración creada.
- Auditoría post-migración creada.
- Micrófono global existente identificado y montado en la rama.
- Micrófono ocultado en rutas de acceso/autenticación.
- Ana contextual excluida de Inicio.
- Botón contextual redundante `Ana se ha equivocado` retirado del bloque contextual.
- Bloque duplicado de corrección en Mi Perfil retirado.
- Causa de degradación de navegación en Perfil localizada: fallback reducido a solo `Inicio`.
- Fallback seguro de navegación en Perfil preparado mediante caché de la última navegación autorizada del propio usuario, sin ampliar permisos.

### PARCIAL

- Mi Perfil sigue incompleto respecto al contrato funcional esperado.
- Ana contextual todavía no calcula tres prioridades reales por módulo.
- Audio de evidencia se conserva, pero no tiene transcripción automática completa.
- Bucket `fenix-preprod-documents-test` aparece en código actual y debe auditarse antes de cambiarse.
- Expedientes, participantes, documentos, OCR, alias humano, KPI y recuperación de relaciones requieren auditoría y restauración por contrato.

### POR AUDITAR

- Contrato real de Storage y dependencias del bucket de evidencia.
- Pipeline de transcripción de audio reutilizable y coste 0 €.
- Paridad OLD vs NEW de Expedientes y documentos.
- Participantes y roles asociados.
- Apertura exacta de KPI y tareas a su conjunto/contexto real.
- Perfil: edición autorizada, objetivos, roles, seguridad y datos personales.
- Navegación completa por rol fuera de Perfil.

## Secuencia de restauración

1. Expedientes.
2. Participantes y relaciones.
3. Documentos y permisos de visualización/descarga.
4. OCR / extracción / indexación si existe contrato previo.
5. Alias humano editable separado del identificador técnico.
6. KPI con drill-down exacto.
7. Tareas con apertura exacta de contexto.
8. Mi Perfil.
9. Ana contextual con prioridades reales y evidencia.
10. Audio operativo y transcripción.
11. Verificación global de navegación por rol.
12. E2E, rollback y promoción gradual.

## Gates obligatorios por cada bloque

- Inventario previo.
- Dependencias identificadas.
- Contrato funcional actual/histórico localizado.
- Sin borrar capacidades existentes.
- Implementación paralela cuando sea razonable.
- Build/TypeScript verde.
- Tests de comportamiento.
- Comparación OLD vs NEW cuando exista OLD fiable.
- QA funcional.
- Rollback probado o claramente ejecutable.
- Sin writes destructivos sobre datos reales durante validación.
- Estado actualizado: HECHO / EXISTENTE / PARCIAL / DEFINIDO / PLANIFICADO / POR AUDITAR.

## Aprendizaje que debe absorber CEREBRO para futuras apps

Cuando CEREBRO construya una app nueva, no debe limitarse a generar pantallas. Debe crear desde el principio un paquete operativo con:

- contrato funcional por módulo;
- navegación y permisos por rol;
- fuente de verdad de datos;
- identificadores técnicos separados de nombres humanos editables;
- relaciones entre entidades explícitas;
- política de lectura/escritura;
- acciones contextuales;
- evidencia y documentos;
- auditoría de eventos;
- tests de navegación, permisos y flujos críticos;
- E2E de lectura y escritura;
- rollback;
- observabilidad;
- costes medidos;
- documentación de continuidad;
- changelog;
- mapa de dependencias;
- backup/rebuild;
- contrato de autonomía;
- puntos HUMAN_REQUIRED bien definidos.

## Regla específica de UI/UX aprendida

Nunca considerar una pantalla “recuperada” solo porque renderiza. Debe demostrar:

1. datos correctos;
2. permisos correctos;
3. navegación correcta;
4. acciones correctas;
5. contexto correcto;
6. persistencia correcta;
7. ausencia de duplicidades;
8. rollback;
9. comportamiento probado.

## Regla de navegación

Nunca usar un fallback estático que amplíe permisos. Si falla el backend de navegación:

- preferir última navegación autorizada y ligada al mismo usuario/sesión;
- si no existe, degradar de forma conservadora;
- registrar el fallo;
- nunca mostrar módulos no autorizados solo para “rellenar” menú.

## Regla de asistentes contextuales

Ana/CEREBRO no debe mostrar consejos genéricos como sustituto de prioridades reales. Para cada módulo debe existir un contrato de contexto que exponga:

- entidad actual;
- estado;
- bloqueos;
- siguiente acción;
- evidencias;
- riesgo;
- responsable;
- plazo;
- resultado esperado.

Solo entonces se deben mostrar prioridades o permitir ejecución.

## Regla de audio

El patrón objetivo reutilizable para futuras apps es:

voz → transcripción visible → edición humana opcional → selección de intención → validación/política → ejecución o HUMAN_REQUIRED → evidencia → auditoría.

No ejecutar órdenes directamente desde audio bruto sin texto visible, validación y política.

## Regla de construcción futura

Todo lo aprendido aquí debe alimentar la Factory de Apps/Engines de CEREBRO. La próxima app debe salir con estos contratos y gates desde el scaffold, no añadirse después como parches.

## Continuidad entre chats

Antes de continuar en otro chat, leer:

1. este documento;
2. `docs/APP_RESTORATION_AUDIT_2026-09-14.md`;
3. PR #380 y su diff actual;
4. contratos maestros del proyecto CEREBRO OS;
5. cualquier evidencia nueva creada después de esta fecha.

La siguiente sesión no debe reiniciar análisis ya cerrado. Debe retomar el primer punto no verde de la secuencia de restauración y seguir en loop hasta el siguiente límite humano real.

## Uso de Codex / Work

Los créditos son escasos. No usar Codex o Work para tareas que puedan resolverse con lectura de repositorio, herramientas conectadas, scripts locales o cambios pequeños y verificables. Pedir al usuario usar Codex/Work solo cuando aporte una ventaja clara, por ejemplo:

- build/test completo del repositorio si este entorno no puede ejecutarlo;
- refactor de múltiples archivos con contexto amplio;
- inspección interactiva compleja del frontend;
- ejecución local de test suites pesadas;
- navegación web/computer-use necesaria para validar comportamiento real de UI.

No consumir créditos por documentación, auditoría estática, búsquedas de código o cambios pequeños que puedan hacerse directamente.

## Criterio de promoción

Nada de esta rama se considera operativo en PROD hasta que exista evidencia de tests y promoción. Un PR abierto y mergeable no equivale a producción verde.
