# Deployment PRE-PROD · Vercel

## Objetivo
Publicar exclusivamente la rama `preprod-app-phase1` en un host PRE-PROD aislado para smoke testing del frontend Fénix Capital Fase 1.

## Decisión de hosting
El conector Hostinger disponible en ChatGPT corresponde a Hostinger Horizons y crea una aplicación nueva con su propio stack/backend. No se utiliza para este despliegue porque el objetivo es publicar el frontend existente Vite + React + TypeScript sin reconstruirlo ni sustituir Supabase.

Para este bloque se mantiene Vercel como host PRE-PROD del artefacto existente.

## Fuente de despliegue validada
- Repositorio: `carlosjmunoz78/fenix-capital-inmo-map`
- Rama: `preprod-app-phase1`
- SHA funcional validado: `45cf273f787517fd592e4b64750530e8e93dec5f`
- `main`: no desplegar ni fusionar en esta fase.
- Build: `npm run build`
- Salida: `dist`
- Router: SPA con fallback a `index.html` mediante `vercel.json`.

## Evidencia CI cerrada
GitHub Actions `PRE-PROD App Build`:
- Run: `32306269964`
- Job: `build-and-browser-qa`
- Resultado: `success`
- Build: `success`
- Chromium: `success`
- Browser QA: `success`
- Upload dist: `success`
- Upload Playwright report: `success`

Artefactos del run:
- `fenix-preprod-dist` · artifact ID `9384830838` · digest `sha256:f8162605ceaca592723e8ae9d6d7717dfe171ade6bd47e60229830bc3ee37b9f`
- `fenix-preprod-playwright-report` · artifact ID `9384831193` · digest `sha256:b10e4020f336d16de9fabad293984c38b3759840769d91e226e3a7c00e881f1c`

El artefacto `dist` validado contiene únicamente:
- `index.html`
- `assets/index-DbaCPDU0.css`
- `assets/index-BpdBtyn9.js`

## Variables permitidas
Solo valores públicos/client-safe que ya formen parte del contrato del frontend TEST. Nunca introducir en Vercel:
- `service_role` de Supabase;
- contraseñas TEST;
- JWT persistentes;
- secretos de Brevo/LinkedIn;
- PII real.

## Gate de promoción
Antes de considerar PRE-PROD desplegado:
1. Vercel debe mostrar un proyecto PRE-PROD autorizado para el team `team_qnh6u1Ofy2WPp0MGEKlyMA50` o aceptar un Preview directo válido.
2. Desplegar exclusivamente `preprod-app-phase1` / SHA verde equivalente.
3. Comprobar estado `READY`.
4. Abrir URL Preview HTTPS.
5. Smoke test: login TEST, `session/context`, navegación autorizada, Claro/Oscuro, CAL-001, rutas directas y refresh SPA.
6. Comprobar logout FIN-A → FIN-B y ausencia de estado privado residual.
7. Registrar URL, commit SHA, fecha y resultado en Notion.
8. Mantener PR draft y `main` sin fusionar hasta autorización humana.

## Bloqueo actual · 20/08/2026
La conexión Vercel reconoce el team `team_qnh6u1Ofy2WPp0MGEKlyMA50`, pero `list_projects` devuelve `0` proyectos visibles. Los intentos previos de deployment no quedan resolubles desde la integración. El código, build y Browser QA están verdes; el bloqueo es de autorización/visibilidad del proyecto en Vercel, no de frontend.

El wrapper de deployment confirma que un Preview directo exige `target=preview`, `name` y `files`, con cada fichero representado como `file + data` (base64). No se debe enviar un deployment parcial o incompleto solo para forzar la creación del proyecto.

## Rollback
Rollback inmediato = volver al deployment Preview anterior o redeploy del snapshot Git `backup/preprod-phase1-2026-08-19`. No migrar datos, no tocar PROD y no usar WordPress como mecanismo de rollback.

## Estado
**Código + build + Browser QA + artefacto deployable: CERRADOS.**

**Único bloqueo previo al smoke HTTPS: visibilidad/autorización del proyecto PRE-PROD en Vercel.**
