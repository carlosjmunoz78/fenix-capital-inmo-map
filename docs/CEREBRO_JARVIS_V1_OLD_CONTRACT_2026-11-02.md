# CEREBRO JARVIS V1 · CONTRATO OLD · 2026-11-02

## Estado de partida verificado

- Repositorio: `carlosjmunoz78/fenix-capital-inmo-map`.
- Fuente de partida obligatoria: `0e0f843cecdd80c261cc5164b3daeef9d9d81b78`.
- PROD aceptado de Operativa V4: `emergency-pages@8a096952245c597e2f1ebca2c3c1053b449dc2e3`.
- Rollback principal: `backup/emergency-pages-operativa-v4-accepted-20261102@8a096952245c597e2f1ebca2c3c1053b449dc2e3`.
- Rama aislada Jarvis: `cerebro/jarvis-interface-v1-20261102`.
- `main`: fuera de alcance.
- Supabase/DNS/organización `fenix-cerebro`: fuera de alcance.

## OLD físico observado en sesión autenticada

Ruta: `/cerebro?section=jarvis`.

EXISTENTE:
- navegación primaria `Inicio · Jarvis · Operativa · Neuronal · Navegador`;
- Console real con autenticación y comprobación del Gateway;
- empresa de sesión y contexto visibles dentro de Console;
- conversación humano/CEREBRO;
- envío de mensajes mediante el Gateway existente;
- dictado y conversación por voz existentes;
- actividad/evidencia obtenida desde `cerebroActivityApi`.

GAPS OLD:
- tres columnas permanentes convierten Jarvis en consola técnica secundaria;
- rail de procesos + inspector ocupan el mismo nivel visual que la conversación;
- wrapper hardcodea `FÉNIX · GENERAL` en vez de dejar que el Console muestre el contexto real;
- panel visual `HUMAN_REQUIRED` aparece de forma permanente sin una excepción real publicada;
- mensajes de asistente se identifican visualmente como `CEREBRO`, no como `JARVIS`;
- exceso de contadores/estado técnico para la puerta humana principal.

## Contratos que NO se modifican

- `src/CerebroConsoleHost.tsx`.
- `src/CerebroInterfaceBar.tsx`.
- `src/CerebroOperativeConsole.tsx`.
- `src/cerebro-operative-console.css`.
- `src/cerebro-route-isolation-v2.css`.
- `src/CerebroConsoleShell.tsx` y su contrato de Gateway/Auth/voz.
- `src/cerebroActivityApi.ts`.

## Cambio permitido

Solo:
- `src/CerebroJarvisWorkConsole.tsx`;
- `src/cerebro-jarvis-work.css`;
- tests/documentación/workflow de gate específicos de Jarvis.

## Criterio OLD vs NEW

NEW debe conservar todas las capacidades reales del Console OLD y reducir únicamente la envoltura técnica:

1. conversación como superficie dominante;
2. empresa/contexto procedentes del Console real;
3. conexión/Gateway mostrados por estado real;
4. actividad real disponible de forma secundaria y plegada;
5. ningún `HUMAN_REQUIRED` decorativo;
6. ningún dato/KPI/porcentaje inventado;
7. navegación y Operativa sin cambios;
8. responsive real.

`NO EVIDENCE → NOT DONE`.
