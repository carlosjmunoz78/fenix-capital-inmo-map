# Backup y restauración · PRE-PROD Fase 1

## Objetivo
Garantizar que el frontend PRE-PROD pueda recuperarse sin depender de memoria de sesión ni de cambios manuales no trazados.

## Copias mínimas
- Git: historial de `preprod-app-phase1`.
- Snapshots de código verificados:
  - `backup/preprod-phase1-2026-08-19`.
  - `backup/preprod-phase1-2026-08-20`.
- SHA reproducible canónico validado: `cc206c410adedf2bfcf3a5527e1f87c7e9f285e4`.
- `package.json` con versiones directas fijadas y `package-lock.json` lockfileVersion 3 versionado.
- Node objetivo CI: `24.x`.
- Workflow verde canónico: `PRE-PROD App Build` run `32351314083`.
- Resultado del run: `npm ci` success + Build success + Browser QA success + artefactos success + snapshot `gh-pages` success.
- Browser QA: 19 passed, 8 skipped intencionadamente, 0 failed.
- Artefactos CI canónicos:
  - `fenix-preprod-dist` · artifact ID `9399962154` · digest `sha256:196cfe24b564f24759a356a3fc9800f6bd8303eeb52e16d0f839f095c6a22abd`.
  - `fenix-preprod-playwright-report` · artifact ID `9399962776` · digest `sha256:1560e71c47a70f5226f4d84a3c0a867d61a4ca3abb7f3b492a3dee82534e7de3`.
- Supabase: migraciones SQL versionadas y listado de Edge Functions desplegadas. Las claves y secretos no se copian a documentación.
- Notion: páginas maestras de continuidad y especificación, sin exportar PII real a fixtures.

## Restauración frontend
1. Identificar el SHA reproducible canónico con CI verde.
2. Crear rama de recuperación desde ese SHA si la rama activa presenta regresión.
3. Ejecutar `npm ci`, `npm run build` y `npm run test:e2e`.
4. No promover el artefacto si Browser QA falla.
5. Comparar el digest del nuevo `dist` con el artefacto esperado cuando la restauración deba ser bit-a-bit reproducible.
6. Publicar únicamente en PRE-PROD y validar login, navegación, tema, CAL-001 y logout.
7. Ejecutar FIN-A → logout → FIN-B y comprobar que no persiste estado privado del usuario anterior.

## Restauración de datos TEST
- No restaurar datos reales en `preprod_test`.
- Reaplicar solo migraciones TEST controladas y fixtures sintéticos.
- Revalidar RLS/RPC/Edge Functions y 401/403/404/409 antes de considerar recuperado el entorno.

## Gate de despliegue
Un backup recuperable no equivale a un deployment válido. Antes de marcar recuperación completa debe existir URL HTTPS PRE-PROD verificable y smoke test superado. Mientras Vercel no exponga un proyecto recuperable o GitHub Pages no quede confirmado públicamente, la recuperación queda validada a nivel código/CI/artefacto, no a nivel host.

## Verificación de backup
Un backup solo se considera útil si existe SHA recuperable, el lockfile está versionado, la CI puede reconstruirlo con `npm ci`, los artefactos tienen digest registrado y el entorno TEST mantiene aislamiento por usuario/rol.

## Regla de seguridad
- No modificar `main` durante restauración PRE-PROD.
- No copiar passwords, JWT, `service_role` ni OTP a este documento.
- No sustituir el SHA canónico por el último commit sin confirmar primero CI verde.
