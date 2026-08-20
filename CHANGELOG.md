# Changelog

## 2026-08-20 · Auth PRE-PROD y limpieza técnica

### Auth
- `DIR-TEST` queda resuelto contra el correo real autorizado para pruebas de recuperación.
- La recuperación se adapta a OTP de 6 dígitos con `verifyOtp(..., type: 'recovery')` y cambio posterior de contraseña.
- El bloqueo observado en la última prueba es exclusivamente el rate limit del SMTP integrado de Supabase; no se interpreta como fallo funcional de la APP.

### Limpieza
- Eliminado `src/preprodBootstrap.ts` y retirada su invocación desde `src/main.tsx`.
- `fenix-auth-email-fix-once` retirado como one-shot y dejado en `410 Gone` con `verify_jwt=true`.
- Snapshot adicional creado: `backup/preprod-phase1-2026-08-20`.

### Validación
- `PRE-PROD App Build` run #97: 19 passed, 8 skipped intencionadamente, 0 failed.
- Vercel reporta estado `success` sobre el último commit limpio.
- `main` permanece sin fusión; PR #1 continúa draft.

## 2026-08-20 · Sincronización Vercel PRE-PROD

### Deployment
- Se fuerza una nueva publicación desde la rama `preprod-app-phase1` tras conectar el repositorio Git en Vercel.
- Objetivo: publicar en Vercel la versión actual que incluye logotipo Fénix, acceso TEST y recuperación de contraseña.

## 2026-08-20 · Publicación PRE-PROD

### Deployment
- GitHub Pages habilitado para el repositorio.
- Workflow corregido para publicar únicamente desde `push` directo a `preprod-app-phase1`; los eventos `pull_request` quedan como QA-only.
- Se fuerza nueva ejecución de publicación después de la activación de Pages para obtener un deployment limpio y verificable.

## 2026-08-19 · PRE-PROD Fase 1

### Añadido
- Frontend Vite + React + TypeScript en rama `preprod-app-phase1`.
- Shell inicial Fénix, router interno y navegación autorizada desde backend TEST.
- Supabase Auth TEST en frontend con clave pública de cliente.
- CAL-001 flotante/minimizable con motor local `CAL-FR-1.0.0`.
- Persistencia CAL particionada por usuario en `sessionStorage` y limpieza al logout.
- `COM-THEME-001` Claro/Oscuro visible también en login.
- Playwright para desktop, tablet y móvil.
- Workflow GitHub Actions de build + Browser QA + artefactos.

### Corregido
- Persistencia del tema tras reload dentro de la sesión de navegador.
- Validación de navegación móvil en QA.
- Reaparición del estado por defecto de CAL después del logout del usuario A.
- Router/back-forward conservando estado de CAL sin recarga completa.

### Validación
- QA matemático CAL-001: 8/8 superado en PRE-PROD.
- Browser QA sintético: 19 casos superados, 8 omitidos intencionadamente por proyecto/viewport, 0 fallidos en ejecución verde.
- Auth/RBAC A↔B real: validado separadamente contra Supabase/API TEST.

### Seguridad y entrega
- `main` no modificado por fusión de esta fase.
- PR #1 permanece draft.
- Snapshot de respaldo: `backup/preprod-phase1-2026-08-19`.
- WordPress sigue fuera de la ruta de ejecución hasta cierre de deployment, backups y manuales.
