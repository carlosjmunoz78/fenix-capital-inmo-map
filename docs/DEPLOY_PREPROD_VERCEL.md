# Deployment PRE-PROD · Vercel

## Objetivo
Publicar exclusivamente la rama `preprod-app-phase1` en un host PRE-PROD aislado para smoke testing del frontend Fénix Capital Fase 1.

## Decisión de hosting
El conector Hostinger disponible en ChatGPT corresponde a Hostinger Horizons y crea una aplicación nueva con su propio stack/backend. No se utiliza para este despliegue porque el objetivo es publicar el frontend existente Vite + React + TypeScript sin reconstruirlo ni sustituir Supabase.

Para este bloque se prepara Vercel como host PRE-PROD del artefacto existente.

## Fuente de despliegue
- Repositorio: `carlosjmunoz78/fenix-capital-inmo-map`
- Rama: `preprod-app-phase1`
- `main`: no desplegar ni fusionar en esta fase.
- Build: `npm run build`
- Salida: `dist`
- Router: SPA con fallback a `index.html` mediante `vercel.json`.

## Variables permitidas
Solo valores públicos/client-safe que ya formen parte del contrato del frontend TEST. Nunca introducir en Vercel:
- `service_role` de Supabase;
- contraseñas TEST;
- JWT persistentes;
- secretos de Brevo/LinkedIn;
- PII real.

## Gate de promoción
Antes de considerar PRE-PROD desplegado:
1. Importar el repositorio en Vercel.
2. Fijar la rama de Preview a `preprod-app-phase1`.
3. Ejecutar build remoto y comprobar éxito.
4. Abrir URL Preview HTTPS.
5. Smoke test: login TEST, `session/context`, navegación autorizada, Claro/Oscuro, CAL-001, rutas directas y refresh SPA.
6. Comprobar logout y ausencia de estado privado residual.
7. Registrar URL, commit SHA, fecha y resultado en Notion.
8. Mantener PR draft y `main` sin fusionar hasta autorización humana.

## Rollback
Rollback inmediato = volver al deployment Preview anterior o redeploy del snapshot Git `backup/preprod-phase1-2026-08-19`. No migrar datos, no tocar PROD y no usar WordPress como mecanismo de rollback.

## Estado
Configuración preparada. Pendiente conexión/autorización de Vercel y despliegue real.
