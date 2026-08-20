# Manual técnico · APP Fénix Capital · Fase 1 PRE-PROD

## 1. Stack
- Vite
- React
- TypeScript
- React Router
- Supabase JS
- Playwright
- GitHub Actions
- Vercel como host PRE-PROD canónico

## 2. Principios de arquitectura
- Frontend SPA con router interno.
- Backend/API como autoridad de permisos y datos.
- Supabase Auth para identidad/sesión.
- RLS/RPC/Edge Functions para control server-side.
- Notion/CRM activo no es runtime de escritura de la APP.
- WordPress será contenedor final, no cerebro de negocio.
- PRE-PROD se desarrolla en `preprod-app-phase1`; `main` no se fusiona sin autorización explícita.

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
La batería cubre tema, CAL-001, navegación, responsive, back/forward y aislamiento de estado local. La referencia actual de CI mantiene 19 pruebas superadas y 8 skips intencionados por proyecto/viewport.

## 6. Auth y API
El frontend obtiene sesión Supabase y llama a `fenix-app-api-test` con JWT. El cliente no decide rol ni `worker_id`; la autoridad se resuelve en backend.

`DIR-TEST` resuelve al correo real autorizado de Dirección en PRE-PROD. Los alias TEST permanecen limitados a las identidades declaradas. No se almacenan passwords en código, Notion ni evidencias.

### Recuperación de contraseña
La recuperación PRE-PROD usa correo de Supabase Auth con OTP de 6 dígitos (`{{ .Token }}`). El frontend solicita el reset, muestra la pantalla de recuperación, valida el OTP con `verifyOtp(... type:'recovery')` y solo después ejecuta `updateUser({password})`.

La plantilla por enlace `ConfirmationURL` se sustituyó en PRE-PROD porque los enlaces de un solo uso pueden ser consumidos por scanners de correo. La prueba real completa queda sujeta al rate limit del SMTP integrado de Supabase; no repetir solicitudes en ráfaga.

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

## 10. Deployment PRE-PROD
Dominio canónico: `https://fenix-capital-preprod.vercel.app`.

La rama canónica de trabajo es `preprod-app-phase1`. Vercel debe servir la versión de esa rama/promoción PRE-PROD sin requerir fusión a `main`.

Workflow: `.github/workflows/preprod-build.yml`.
Orden: checkout → Node 24 → dependencias → Chromium → build → Browser QA → artefactos.

## 11. Seguridad
- Nunca incluir `service_role` en frontend.
- Nunca guardar passwords/JWT en repositorio, Notion o evidencias.
- Los filtros UI no sustituyen RBAC.
- Datos y fixtures PRE-PROD sintéticos.
- Cualquier acción sensible requiere gates humanos definidos por contrato funcional.
- Las funciones one-shot usadas para bootstrap deben retirarse tras su uso; `fenix-auth-email-fix-once` está retirada con respuesta 410 y `verify_jwt=true`.
- Los RPC `SECURITY DEFINER` expuestos al rol `authenticated` deben conservar control de contexto y revisarse antes de PROD; no cambiar a ciegas el modelo de permisos.
- Leaked Password Protection debe revisarse/activarse antes de PROD.

## 12. Backup y recuperación
Consultar `docs/BACKUP_RESTORE.md`. El rollback se hace por SHA conocido con CI verde, nunca editando PROD a mano.

Snapshots vigentes de referencia:
- `backup/preprod-phase1-2026-08-19`
- `backup/preprod-phase1-2026-08-20`

## 13. Antes de PROD
Repetir inventario de endpoints/Edge Functions, QA negativa de permisos, revisión de secretos, leaked-password protection, SMTP propio, responsive, accesibilidad, logs, backups y restauración. No fusionar a `main` hasta autorización explícita.
