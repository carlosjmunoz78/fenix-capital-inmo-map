# Manual técnico · APP Fénix Capital · Fase 1 PRE-PROD

## 1. Stack
- Vite
- React
- TypeScript
- React Router
- Supabase JS
- Playwright
- GitHub Actions

## 2. Principios de arquitectura
- Frontend SPA con router interno.
- Backend/API como autoridad de permisos y datos.
- Supabase Auth para identidad/sesión.
- RLS/RPC/Edge Functions para control server-side.
- Notion/CRM activo no es runtime de escritura de la APP.
- WordPress será contenedor final, no cerebro de negocio.

## 3. Arranque local
```bash
npm install
npm run dev
```

## 4. Build
```bash
npm run build
```
El artefacto queda en `dist/`.

## 5. QA navegador
```bash
npx playwright install chromium
npm run test:e2e
```
La batería cubre tema, CAL-001, navegación, responsive, back/forward y aislamiento de estado local.

## 6. Auth y API
El frontend obtiene sesión Supabase y llama a `fenix-app-api-test` con JWT. El cliente no decide rol ni `worker_id`; la autoridad se resuelve en backend.

## 7. CAL-001
- Motor local: `src/calculator.ts`.
- Fórmula: amortización francesa `CAL-FR-1.0.0`.
- Estado temporal por `session.user.id` en `sessionStorage`.
- Logout elimina estado privado no guardado.
- Simulación no equivale a aprobación financiera.

## 8. Tema
`COM-THEME-001` utiliza `data-theme` en `<html>` y persiste en `sessionStorage` durante la sesión de navegador.

## 9. Rutas
La navegación usa React Router. El shell debe conservar estado transversal al cambiar de módulo; los permisos siguen viniendo del backend, no del router.

## 10. CI
Workflow: `.github/workflows/preprod-build.yml`.
Orden: checkout → Node 24 → dependencias → Chromium → build → Browser QA → artefactos.

## 11. Seguridad
- Nunca incluir `service_role` en frontend.
- Nunca guardar passwords/JWT en repositorio, Notion o evidencias.
- Los filtros UI no sustituyen RBAC.
- Datos y fixtures PRE-PROD sintéticos.
- Cualquier acción sensible requiere gates humanos definidos por contrato funcional.

## 12. Recuperación
Consultar `docs/BACKUP_RESTORE.md`. El rollback se hace por SHA conocido con CI verde, nunca editando PROD a mano.

## 13. Antes de PROD
Repetir inventario de endpoints/Edge Functions, QA negativa de permisos, revisión de secretos, responsive, accesibilidad, logs, backups y restauración. No fusionar a `main` hasta autorización explícita.
