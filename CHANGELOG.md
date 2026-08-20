# Changelog

## 2026-08-20 · Cierre técnico y trazabilidad reconciliada

### Validación canónica
- Head validado previo a esta corrección documental: `e6d462f8a9d957628f92e74cc1399f1bc8a976ec`.
- Workflow `PRE-PROD App Build` run `32350058573`: `completed / success`.
- Browser QA: 19 passed, 8 skipped intencionadamente, 0 failed.
- Artefacto `fenix-preprod-dist`: ID `9399513568`, digest `sha256:010d6948e556c1481a72e2cc2cf6413bb6ff3c16b32d465baa4f7f2fe106362d`.
- Artefacto `fenix-preprod-playwright-report`: ID `9399513977`, digest `sha256:88beb3505fb73e8026ab1b1b8a068a0537c1de3d252cde118b7c9d58d457d234`.
- `gh-pages` existe y contiene el snapshot generado por GitHub Actions; el repositorio informa `has_pages=true`.

### Estado de hosting
- Vercel **no se considera verificado actualmente**: la integración del team autorizado sigue mostrando 0 proyectos visibles y no existe evidencia suficiente para cerrar un smoke HTTPS desde esa vía.
- GitHub Pages queda como alternativa preparada, pero no se marca host PRE-PROD cerrado hasta verificar respuesta HTTPS real.
- Cualquier referencia histórica a `success` de Vercel describe un intento/deployment previo y **no sustituye** el gate actual `URL accesible + smoke real + SHA identificado`.

### Seguridad y gobierno
- `main` permanece sin fusionar.
- PR #1 continúa draft.
- PROD y WordPress siguen fuera de alcance hasta cierre técnico explícito.

## 2026-08-20 · Auth PRE-PROD y limpieza técnica

### Auth
- `DIR-TEST` queda resuelto contra el correo real autorizado para pruebas de recuperación.
- La recuperación se adapta a OTP de 6 dígitos con `verifyOtp(..., type: 'recovery')` y cambio posterior de contraseña.
- El bloqueo observado en la última prueba es exclusivamente el rate limit del SMTP integrado de Supabase; no se interpreta como fallo funcional de la APP.

### Limpieza
- Eliminado `src/preprodBootstrap.ts` y retirada su invocación desde `src/main.tsx`.
- `fenix-auth-email-fix-once` retirado como one-shot y dejado en `410 Gone` con `verify_jwt=true`.
- Snapshot adicional creado: `backup/preprod-phase1-2026-08-20`.

### Validación histórica
- Browser QA sintético: 19 passed, 8 skipped intencionadamente, 0 failed en ejecuciones verdes.
- `main` permanece sin fusión; PR #1 continúa draft.

## 2026-08-20 · Sincronización Vercel PRE-PROD

### Deployment
- Se intentó publicar desde la rama `preprod-app-phase1` tras conectar el repositorio Git en Vercel.
- Objetivo: publicar la versión actual con logotipo Fénix, acceso TEST y recuperación de contraseña.
- Este intento no se considera cierre del hosting mientras no exista URL recuperable y smoke HTTPS verificable desde la integración autorizada.

## 2026-08-20 · Publicación PRE-PROD

### Deployment
- GitHub Pages habilitado para el repositorio.
- Workflow configurado para publicar desde `push` directo a `preprod-app-phase1`; los eventos `pull_request` mantienen QA y preparación de snapshot.
- Se genera build específico con base `/fenix-capital-inmo-map/`, `404.html` para fallback SPA y `.nojekyll`.

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
