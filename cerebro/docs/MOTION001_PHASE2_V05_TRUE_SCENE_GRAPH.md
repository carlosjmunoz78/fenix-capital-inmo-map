# CEREBRO · Phase 2 V0.5 · TRUE SCENE GRAPH

Estado: ARCHITECTURAL_REBUILD / LAB-PREPROD / PROD FALSE

## Problema corregido
Las versiones V0.4.x aún podían sentirse como una red dibujada que se escalaba o desplazaba sobre el cerebro durante `SEGUIR SEÑAL`.

El owner identificó correctamente el defecto perceptivo: aunque nodos y líneas pudieran estar matemáticamente próximos, la red se percibía como una capa rígida moviéndose sobre el cerebro.

## Cambio estructural V0.5
La navegación deja de transformar el grafo. El mundo neuronal queda fijo y la cámara viaja por él.

- cada neurona tiene una posición 3D permanente;
- cada filamento está anclado a dos neuronas reales;
- nodos y filamentos usan exactamente la misma proyección;
- los filamentos son curvas 3D proyectadas desde el mismo mundo;
- `SEGUIR SEÑAL` mueve la cámara, nunca el grafo;
- entrar a clúster/motor mueve cámara y objetivo, no el contenido;
- un único renderer dibuja neuronas y filamentos para eliminar capas que puedan deslizarse entre sí;
- coste adicional 0 EUR y sin dependencias externas.

## Regla visual canónica

**MOVE THE CAMERA, NEVER THE GRAPH.**

El grafo solo puede cambiar por actividad/telemetría; nunca debe trasladarse o escalarse para fingir navegación.

## No-fake-cognition
Toda la actividad de esta versión sigue siendo `SIMULATED_SHADOW_ONLY`.
No representa chain-of-thought, pensamiento interno ni telemetría viva.

## Conservación
- V0.4.3 y todas las versiones previas se conservan como OLD/fallback/evidencia;
- V0.5 es un rebuild arquitectónico paralelo;
- no sustituye UI viva;
- no toca PROD.

## Autoridad / límites
- LAB/PREPROD only;
- PROD false;
- no App/CRM/Supabase/WordPress/Trading writes;
- no secretos ni PII;
- no promoción automática.

## Artefacto de revisión
- `CEREBRO_PHASE2_V05_TRUE_SCENE_GRAPH.html`
- SHA-256: `ff0fa903402017080e906468b67a567b5806024ceed14f94f7cebdb883762bcc`
- bundle SHA-256: `cea8a0fc770403e531d59bf99d5d8b6c90b9874d7bda4b6bac20b43e4483aadb`
- JavaScript syntax gate: GREEN

## Gate pendiente
Retest físico del owner en PC + móvil:
- unión visual fibra-neurona;
- ausencia de malla rígida/deslizante;
- sensación de viaje de cámara real;
- rendimiento;
- limpieza;
- ritmo cinematográfico.
