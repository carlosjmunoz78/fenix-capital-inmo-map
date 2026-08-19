# Backup y restauración · PRE-PROD Fase 1

## Objetivo
Garantizar que el frontend PRE-PROD pueda recuperarse sin depender de memoria de sesión ni de cambios manuales no trazados.

## Copias mínimas
- Git: historial de `preprod-app-phase1`.
- Snapshot de código: rama `backup/preprod-phase1-2026-08-19`.
- Artefactos CI: `fenix-preprod-dist` y `fenix-preprod-playwright-report` de ejecuciones verdes.
- Supabase: migraciones SQL versionadas y listado de Edge Functions desplegadas. Las claves y secretos no se copian a documentación.
- Notion: páginas maestras de continuidad y especificación, sin exportar PII real a fixtures.

## Restauración frontend
1. Identificar último SHA con CI verde.
2. Crear rama de recuperación desde ese SHA si la rama activa presenta regresión.
3. Ejecutar `npm install`, `npm run build` y `npm run test:e2e`.
4. No promover el artefacto si Browser QA falla.
5. Publicar únicamente en PRE-PROD y validar login, navegación, tema, CAL-001 y logout.

## Restauración de datos TEST
- No restaurar datos reales en `preprod_test`.
- Reaplicar solo migraciones TEST controladas y fixtures sintéticos.
- Revalidar RLS/RPC/Edge Functions y 401/403/404/409 antes de considerar recuperado el entorno.

## Verificación de backup
Un backup solo se considera útil si existe SHA recuperable, la CI puede reconstruirlo y el entorno TEST mantiene aislamiento por usuario/rol.
