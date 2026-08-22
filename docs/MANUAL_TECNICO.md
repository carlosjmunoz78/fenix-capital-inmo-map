# Manual técnico · APP Fénix Capital · Fase 1 PRE-PROD

## 1. Stack
- Vite
- React
- TypeScript
- React Router
- Supabase JS
- Playwright
- GitHub Actions
- Supabase Auth, RPC y Edge Functions
- Notion como fuente canónica de datos operativos seleccionados

## 2. Principios de arquitectura
- Frontend SPA con router interno.
- Backend/API como autoridad de permisos y datos.
- Supabase Auth para identidad/sesión.
- RLS/RPC/Edge Functions para control server-side.
- El navegador nunca decide rol, propietario operativo ni ampliación de ámbito.
- Notion se consume mediante runtimes Edge autorizados; el navegador no accede directamente al token de Notion.
- Una entidad tiene una única fuente maestra; las relaciones se realizan por identificadores, no duplicando datasets.
- PRE-PROD se desarrolla en `preprod-app-phase1`; `main`, PROD y WordPress quedan fuera de alcance sin autorización explícita.

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

La referencia verde vigente es CI #690 `32545169273`: **207 tests / 79 passed / 128 skips intencionales / 0 fallos**. Los skips corresponden principalmente a casos deliberadamente restringidos por proyecto/viewport; no deben interpretarse como fallos.

La batería cubre, entre otros: shell, tema, CAL-001, navegación real normalizada, responsive, back/forward, logout, RBAC por rol, aislamiento 403, módulos canónicos, perfil desde cabecera, foto de sesión, preview antes de escritura, Notarías y ausencia de `PRO` visible.

## 6. Auth, gateway y navegación
El frontend obtiene la sesión de Supabase y llama a `fenix-app-gateway-test` con el JWT de usuario. El cliente no decide `role`, `actor_code` ni `worker_id`; la autoridad se resuelve en backend.

`fetchAppApi` normaliza dos formas reales del gateway:
- `/session/context`: extrae `context` cuando el backend lo envuelve.
- `/navigation`: convierte rutas string autorizadas (`/expedientes`, `/notarias`, etc.) en `{route,label}` para que todos los shells consuman una interfaz común.

Esta normalización es exclusivamente de presentación: no añade rutas ni permisos.

La navegación PRE-PROD vigente:
- Dirección incluye `/notarias` y no incluye `/perfil`.
- Financiero incluye `/notarias` y no incluye `/perfil`.
- Visitador no incluye `/notarias` ni `/perfil`.

`/perfil` sigue siendo una ruta válida y se abre desde la identidad/avatar de cabecera mediante `ProfileLauncherGuard`.

### Recuperación de contraseña
La recuperación PRE-PROD usa Supabase Auth. El frontend solicita el reset, valida el OTP con `verifyOtp(... type:'recovery')` y solo después ejecuta `updateUser({password})`.

No guardar passwords, OTP ni JWT en código, Notion o evidencias.

## 7. CAL-001
- Motor local: `src/calculator.ts`.
- Fórmula: amortización francesa `CAL-FR-1.0.0`.
- Estado temporal por `session.user.id` en `sessionStorage`.
- Logout elimina estado privado no guardado.
- Simulación no equivale a aprobación financiera.
- La interfaz visible no utiliza la etiqueta `PRO`.

## 8. Tema
`COM-THEME-001` utiliza `data-theme` en `<html>` y persiste en `sessionStorage` durante la sesión de navegador.

## 9. Runtimes Notion canónicos
`fenix-notion-runtime-test` expone recursos operativos ya reconciliados con RBAC de backend: expedientes, clientes, inmobiliarias, tareas, documentos, tasaciones, firmas, contactos bancarios y comunicaciones.

Las escrituras contextuales se canalizan por `fenix-notion-actions-test` y deben mantener preview previo y allowlist de campos/roles.

### Notarías
`fenix-notarias-runtime-test` v1 es un runtime PRE-PROD de solo lectura para el directorio maestro `Notarías · Fénix Capital`, data source `053afd8f-0809-4d24-8006-1afd265e03a9`.

Endpoints:
- `GET /health`
- `GET /notarias`
- `GET /notarias/:id`

Roles:
- Dirección: lectura autorizada.
- Financiero: lectura autorizada.
- Visitador: 403.

El runtime devuelve únicamente campos existentes del directorio. La base operativa `Notaría y firma · Fénix Capital` permanece separada y se relaciona mediante `Notaría maestra`; no debe fusionarse ni duplicarse con el directorio.

## 10. Shells y aislamiento
Las pantallas específicas se montan en `src/main.tsx`. `OperationalShellGate` y `DetailShellGate` impiden que shells genéricos y dedicados se superpongan en el DOM, evitando lecturas duplicadas y ambigüedad de interacción.

`ProfileLauncherGuard` convierte las identidades `.avatar` y `.ops-profile` en controles accesibles para abrir `/perfil`. La ficha de perfil toma nombre/email/foto únicamente de la sesión; una foto HTTPS real se muestra si existe y, en su ausencia, se usan iniciales.

## 11. Deployment PRE-PROD
Workflow: `.github/workflows/preprod-build.yml`.
Orden actual: checkout → Node 24 → dependencias → Chromium → build → Browser QA → artefactos → build de snapshot GitHub Pages → push `gh-pages`.

El snapshot `gh-pages` no equivale por sí solo a un smoke HTTPS público. El job `deploy-preprod-pages` permanece omitido, por lo que el smoke público sigue pendiente de verificación real.

## 12. Seguridad
- Nunca incluir `service_role` ni `NOTION_TOKEN` en frontend.
- Nunca guardar passwords/JWT/OTP en repositorio, Notion o evidencias.
- Los filtros UI no sustituyen RBAC.
- Datos y fixtures PRE-PROD sintéticos.
- Cualquier acción sensible requiere gates humanos definidos por contrato funcional.
- Los RPC `SECURITY DEFINER` expuestos a `authenticated` deben conservar control de contexto.
- No asignar propietarios operativos por intuición; los backfills deben ser deterministas y auditables.
- Leaked Password Protection y SMTP propio deben revisarse antes de PROD.

## 13. Deuda de asignación conocida
- Expedientes: 71 total; 11 con ID financiero operativo, 60 sin asignación segura.
- Clientes: 83 total; 5 con ID financiero operativo.
- Inmobiliarias: 251 total; 2 con ID visitador operativo.

No resolver esta deuda mediante asignaciones masivas inferidas.

## 14. Backup y recuperación
Consultar `docs/BACKUP_RESTORE.md`. El rollback se hace por SHA conocido con CI verde, nunca editando PROD a mano.

## 15. Antes de PROD
Repetir inventario de endpoints/Edge Functions, QA negativa de permisos, revisión de secretos, autenticación, SMTP, responsive, accesibilidad, logs, backups/restauración y smoke HTTPS PRE-PROD. No fusionar a `main` hasta autorización explícita.