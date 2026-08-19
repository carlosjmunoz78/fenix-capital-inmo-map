# Deployment PRE-PROD · Fénix Capital Fase 1

## Alcance
Este runbook cubre exclusivamente PRE-PROD. No autoriza despliegue a PROD ni fusión automática a `main`.

## Fuente desplegable
- Rama: `preprod-app-phase1`
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

## Procedimiento
1. Confirmar `git SHA` de la rama que se va a desplegar.
2. Ejecutar CI completa sobre ese SHA.
3. Verificar artefactos `fenix-preprod-dist` y `fenix-preprod-playwright-report`.
4. Publicar `dist/` solo en el host PRE-PROD autorizado.
5. Verificar manualmente login TEST, navegación, tema Claro/Oscuro, CAL-001 y logout.
6. Registrar SHA, fecha, entorno y resultado en changelog.

## Rollback
Rollback preferente: volver al último SHA PRE-PROD con CI verde. Existe una rama de respaldo puntual `backup/preprod-phase1-2026-08-19` creada desde el hito previo a documentación.

## Prohibiciones
- No fusionar a `main` por automatismo.
- No reutilizar credenciales TEST en PROD.
- No publicar `service_role`, JWT, passwords ni PII.
- No cambiar contratos de API durante un rollback.
