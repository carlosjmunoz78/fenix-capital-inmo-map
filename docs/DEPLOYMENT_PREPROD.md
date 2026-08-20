# Deployment PRE-PROD · Fénix Capital Fase 1

## Alcance
Este runbook cubre exclusivamente PRE-PROD. No autoriza despliegue a PROD ni fusión automática a `main`.

## Fuente desplegable
- Rama: `preprod-app-phase1`
- Host canónico PRE-PROD: `https://fenix-capital-preprod.vercel.app`
- Build: `npm run build`
- QA navegador: `npm run test:e2e`
- Artefacto esperado: `dist/`
- CI: `.github/workflows/preprod-build.yml`

## Gates obligatorios
1. GitHub Actions en verde: instalación, build, Browser QA y artefactos.
2. PR contra `main` permanece draft hasta cierre técnico y aprobación humana.
3. Sin secretos server-side en frontend. Solo claves públicas previstas para cliente.
4. Auth TEST y API TEST únicamente en entorno PRE-PROD.
5. No escribir en CRM/Notion PROD desde frontend.
6. WordPress no se usa para suplir lógica pendiente.
7. La URL estable de Vercel debe servir el build actual de `preprod-app-phase1`; no fusionar `main` para conseguirlo.

## Procedimiento
1. Confirmar `git SHA` de la rama que se va a desplegar.
2. Ejecutar CI completa sobre ese SHA.
3. Verificar artefactos `fenix-preprod-dist` y `fenix-preprod-playwright-report`.
4. Confirmar despliegue Vercel en estado Ready/Success.
5. Abrir `https://fenix-capital-preprod.vercel.app` y verificar que corresponde al build actual.
6. Smoke test manual mínimo:
   - logo y shell Fénix visibles;
   - login TEST;
   - navegación autorizada;
   - tema Claro/Oscuro;
   - CAL-001;
   - logout;
   - recuperación de contraseña por OTP de 6 dígitos cuando el rate limit de Auth permita un envío.
7. Registrar SHA, fecha, entorno y resultado en changelog.

## Auth recovery
La recuperación PRE-PROD usa OTP de 6 dígitos en la plantilla de recuperación. Evitar solicitudes repetidas: el SMTP integrado de Supabase aplica rate limits. Si aparece HTTP 429, no insistir; esperar la ventana y ejecutar una sola prueba completa.

## Rollback
Rollback preferente: volver al último SHA PRE-PROD con CI verde. Snapshots de referencia:
- `backup/preprod-phase1-2026-08-19`
- `backup/preprod-phase1-2026-08-20`

## Prohibiciones
- No fusionar a `main` por automatismo.
- No reutilizar credenciales TEST en PROD.
- No publicar `service_role`, JWT, passwords, OTP ni PII.
- No cambiar contratos de API durante un rollback.
