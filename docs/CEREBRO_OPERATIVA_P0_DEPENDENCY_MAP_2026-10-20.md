# Dependency map · CEREBRO OPERATIVA P0

## Conservado
- `CerebroConsoleHost` continúa montando V0 y OPERATIVA.
- OPERATIVA continúa delegando el botón `Hablar` al control canónico V0.
- `postCerebroConsoleChat` y CEREBRO Gateway no cambian.
- `cerebro-console-activity-v0` continúa siendo lectura owner-only de GitHub Actions.

## Nuevas dependencias internas
- `CerebroConsoleShell` → `cerebroConversationHistory` para persistencia local de mensajes/hilo activo.
- `CerebroOperativeConsole` → `cerebroConversationHistory` para drawer, creación, selección y renombrado.
- `CerebroOperativeConsole` → `fetchCerebroActivityRunDetail` para ampliar un run cuando el usuario abre el inspector.
- `fetchCerebroActivityRunDetail` → `cerebro-console-activity-v0?run_id=`.
- `cerebro-console-activity-v0?run_id=` → GitHub Actions run + jobs, solo bajo demanda.

## Sin nuevas dependencias externas
No se introduce proveedor, modelo, SaaS, base de datos ni suscripción adicional.
