# CEREBRO · Phase 2 V0.4.3 · GEOMETRY LOCK

Corrección del fallo visual detectado por el owner:

> al hacer zoom, la red neuronal se movía respecto a las neuronas.

## Causa
Nodos y enlaces no compartían exactamente la misma transformación de cámara/zoom/fly-through.
Además, WebGL y Canvas podían dibujar conexiones a la vez, creando deriva/parallax artificial.

## Solución
- mismo contrato matemático de transformación para nodos y filamentos WebGL;
- misma proyección para neuronas y enlaces en fallback Canvas;
- proyección de rutas semánticas sincronizada;
- cuando WebGL funciona, los filamentos neuronales se renderizan solo en WebGL;
- Canvas dibuja filamentos únicamente en fallback;
- se elimina la doble capa que podía desplazarse.

## Estado
LAB/PREPROD · SHADOW · PROD FALSE.
Requiere retest físico en PC y móvil.
