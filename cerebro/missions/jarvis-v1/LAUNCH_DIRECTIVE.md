# CEREBRO · JARVIS V1 · REPO LAUNCH DIRECTIVE

## Estado de lanzamiento

Esta rama inicia JARVIS V1 en **PREPROD / MAXIMUM_SAFE_THROUGHPUT** sin alterar el mission graph histórico de `28_MACROFRENTES_Y_MISIONES_AUTONOMAS.md`.

## Fuentes canónicas

- `cerebro/missions/jarvis-v1/JARVIS_MASTER_BACKLOG_V1_2026-10-30.json.br.b64`
- SHA256 del JSON descomprimido: `8d2e0793b7ad5afe7a99390dddb650c71892ece883b281e67ac20e966168fb8f`
- Conteos obligatorios: **26 fases / 394 tareas / 5.692 microtareas**.

## Principios

HACER VISIBLE → HACER UTILIZABLE → HACER POTENTE → HACER AUTÓNOMO.

CONSERVAR → ENTENDER → INVENTARIAR → MAPEAR → BACKUP → ENVOLVER → PROBAR → MEJORAR → PREPROD → OLD vs NEW → PROMOVER.

- Coste adicional objetivo: 0 €.
- No paid AI para trabajo determinista.
- `autonomous_prod=false` hasta gates.
- Trading aislado.
- HUMAN_REQUIRED solo para las categorías canónicas.
- No declarar `CONFIRMED_OPERATIONAL` con CI únicamente.

## Arranque

1. Ejecutar `cerebro/runtime/jarvis-v1-backlog-loader.mjs`.
2. Validar hash y conteos.
3. Generar STATE y cola inicial P00.
4. Ejecutar `cerebro/runtime/jarvis-p00-baseline-audit-v1.mjs`.
5. Guardar evidencias como artifact CI.
6. Continuar P00 en paralelo seguro y desbloquear el DAG por evidencia.
7. Activar vertical slices JARVIS visibles tan pronto P00/P01 lo permitan.

## Prioridades especiales

- JARVIS visible y usable cuanto antes.
- App Factory E2E: orden → app → PREPROD → package/publicación autorizada → verificación.
- Website Factory E2E: orden → web completa → publicación → indexación → monitorización.
- Social Factory E2E: inventario/cuentas → branding/contenido → publicación → leads/analytics/aprendizaje.

## Protección del runtime existente

El runtime histórico de 28 macrofrentes se conserva sin reemplazo. JARVIS se incorpora en paralelo y solo se integra/promueve después de comparación, tests y gates.
