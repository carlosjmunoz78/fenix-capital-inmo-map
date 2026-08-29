# Backup y restauración · PRE-PROD

## Objetivo
Garantizar que el frontend PRE-PROD pueda recuperarse sin depender de memoria de sesión ni de cambios manuales no trazados.

## Copias mínimas
- Git: historial de `preprod-app-phase1`.
- Snapshots históricos de código verificados:
  - `backup/preprod-phase1-2026-08-19`.
  - `backup/preprod-phase1-2026-08-20`.
- SHA reproducible canónico validado actual: `42cc9852db74dae482bb1c5ee7eefa8dbeb1a1dc`.
- Snapshot GitHub Pages correspondiente: `efeec066d9055a7e3d63da381b3bb12d421b18da` con mensaje exacto `deploy: PRE-PROD Pages snapshot 42cc9852db74dae482bb1c5ee7eefa8dbeb1a1dc`.
- `package.json` con versiones directas fijadas y `package-lock.json` lockfileVersion 3 versionado.
- Node objetivo CI: `24.x`.
- Workflow verde canónico actual: `PRE-PROD App Build` run `33266665953` / #2722.
- Resultado del run: instalación reproducible success + Build success + Browser QA success + artefactos success + build Pages success + publicación snapshot `gh-pages` success.
- Artefactos CI canónicos actuales:
  - `fenix-preprod-dist` · artifact ID `9718883094` · digest `sha256:22de1d34f67df44035f174d9a369bc44f393549a4e42debde3a1d6b35ee2802e`.
  - `fenix-preprod-playwright-report` · artifact ID `9718883282` · digest `sha256:45c8e890612430b599926cee8844ebb5068d02e6e68e0e836267ff4295ca63b6`.
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
Un backup recuperable no equivale a un deployment válido. Antes de marcar recuperación completa debe existir URL HTTPS PRE-PROD verificable y smoke test superado. GitHub Pages PRE-PROD debe corresponder al SHA exacto validado; un snapshot de otro commit no sirve como evidencia del HEAD actual.

## Verificación de backup
Un backup solo se considera útil si existe SHA recuperable, el lockfile está versionado, la CI puede reconstruirlo con `npm ci`, los artefactos tienen digest registrado y el entorno TEST mantiene aislamiento por usuario/rol.

## Regla de seguridad
- No modificar `main` durante restauración PRE-PROD.
- No tocar PROD ni Supabase PROD desde este procedimiento.
- No copiar passwords, JWT, `service_role` ni OTP a este documento.
- No sustituir el SHA canónico por el último commit sin confirmar primero CI verde y snapshot exacto.
- Las funciones evolutivas posteriores al arranque real de la app (OCR transversal, audio→texto, chat interno, notificaciones/búsqueda avanzadas y demás mejoras de uso) no forman parte de este gate de recuperación.
