# PRE-PROD viewer refresh · 22/08/2026

Checkpoint técnico para forzar un ciclo `push` de PRE-PROD y obtener un visor HTTPS verificable sin tocar `main`, PROD ni WordPress.

Alcance:
- rama: `preprod-app-phase1`;
- PR #1 permanece draft/open;
- ejecutar build + Browser QA completo;
- ejecutar deploy PRE-PROD Pages si el workflow queda verde;
- no incluir contraseñas, tokens, JWT ni secretos;
- continuar reconciliación visual contra las referencias aprobadas.

Este archivo no modifica funcionalidad de negocio ni permisos; únicamente deja trazabilidad del refresco de visor solicitado por Dirección.
