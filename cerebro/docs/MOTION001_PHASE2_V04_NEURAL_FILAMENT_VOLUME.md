# CEREBRO · PHASE 2 V0.4 · NEURAL FILAMENT VOLUME

Estado: USABLE_SHADOW_PROTOTYPE / LAB-PREPROD / PROD FALSE

## Salto frente a V0.3.1

- el campo neuronal ya no son solo partículas: WebGL2 dibuja una red 3D de filamentos;
- filamentos exteriores latentes muy tenues;
- filamentos internos por clúster;
- el clúster seleccionado gana presencia sin convertir todo en una telaraña;
- atenuación por profundidad para aumentar sensación volumétrica;
- cámara más lenta y cinematográfica;
- `SEGUIR SEÑAL` sigue visible y pulsable incluso en `SOLO CEREBRO`;
- UI secundaria sigue plegada por defecto;
- sin dependencias externas y coste adicional 0 €.

## Regla visual

La red base debe sugerir estructura; solo la actividad relevante gana brillo.
No iluminar toda la malla permanentemente.

## NO-FAKE-COGNITION

Toda actividad continúa como `SIMULATED_SHADOW`.
No representa chain-of-thought, pensamiento interno ni telemetría real.

## Conservación

V0.4 envuelve V0.3.1; no la reemplaza.
Todas las versiones anteriores permanecen disponibles como OLD/fallback.

## Límites

No PROD. No App/CRM/Supabase/WordPress/Trading writes.
No secretos, PII ni autoridad de negocio.

## Evidencia de artefacto

- Prototype: `cerebro/prototypes/motion001/phase2-v04-neural-filament-volume.html`
- SHA-256 artefacto local: `4d945bf35b6d76b105da2721ca10e2d844577d2b4cf3abd88e912953ba8064e7`
- Node syntax gate: GREEN
- Renderer: RAW_WEBGL2 + Canvas fallback
- Dependencias externas nuevas: 0

## Gate pendiente

Owner:
- densidad de filamentos;
- sensación de volumen;
- limpieza en modo solo cerebro;
- ritmo de cámara;
- rendimiento físico móvil/PC.
