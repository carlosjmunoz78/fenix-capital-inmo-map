# Backup y restauración · PRE-PROD Fase 1

## Objetivo
Garantizar que el frontend PRE-PROD pueda recuperarse sin depender de memoria de sesión ni de cambios manuales no trazados.

## Copias mínimas
- Git: historial de `preprod-app-phase1`.
- Snapshot de código: rama `backup/preprod-phase1-2026-08-19`.
- Último SHA funcional de referencia: `45cf273f787517fd592e4b64750530e8e93dec5f`.
- Artefactos CI del run verde `32306269964`:
  - `fenix-preprod-dist` · artifact ID `9384830838` · digest `sha256:f8162605ceaca592723e8ae9d6d7717dfe171ade6bd47e60229830bc3ee37b9f`.
  - `fenix-preprod-playwright-report` · artifact ID `9384831193` · digest `sha256:b10e4020f336d16de9fabad293984c38b3759840769d91e226e3a7c00e881f1c`.
- Supabase: migraciones SQL versionadas y listado de Edge Functions desplegadas. Las claves y secretos no se copian a documentación.
- Notion: páginas maestras de continuidad y especificación, sin exportar PII real a fixtures.

## Restauración frontend
1. Identificar último SHA con CI verde.
2. Crear rama de recuperación desde ese SHA si la rama activa presenta regresión.
3. Ejecutar `npm install`, `npm run build` y `npm run test:e2e`.
4. No promover el artefacto si Browser QA falla.
5. Comparar el digest del nuevo `dist` con el artefacto esperado cuando la restauración deba ser bit-a-bit reproducible.
6. Publicar únicamente en PRE-PROD y validar login, navegación, tema, CAL-001 y logout.
7. Ejecutar FIN-A → logout → FIN-B y comprobar que no persiste estado privado del usuario anterior.

## Restauración de datos TEST
- No restaurar datos reales en `preprod_test`.
- Reaplicar solo migraciones TEST controladas y fixtures sintéticos.
- Revalidar RLS/RPC/Edge Functions y 401/403/404/409 antes de considerar recuperado el entorno.

## Gate de despliegue
Un backup recuperable no equivale a un deployment válido. Antes de marcar recuperación completa debe existir Preview HTTPS `READY` y smoke test superado. Mientras Vercel no exponga un proyecto PRE-PROD autorizado, la recuperación queda validada a nivel código/CI/artefacto, no a nivel host.

## Verificación de backup
Un backup solo se considera útil si existe SHA recuperable, la CI puede reconstruirlo, los artefactos tienen digest registrado y el entorno TEST mantiene aislamiento por usuario/rol.
