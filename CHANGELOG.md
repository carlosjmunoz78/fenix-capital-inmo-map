# Changelog

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
