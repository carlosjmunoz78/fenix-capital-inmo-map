# CEREBRO · AUTO-001 PREPROD PATCH EXECUTOR V0 · 2026-10-11

## Estado

**DEFINIDO / EN VALIDACIÓN.** Reutiliza AUTO-001; no crea un motor nuevo.

## Objetivo

Convertir un repair plan SELF-001 + QA source mapping verificado en un parche de código PREPROD estrictamente acotado, probado y enviado a PR sin tocar PROD.

## Primera clase certificada

`APP_AUTH_SHELL_ROLE_MAIN_V0`

Condiciones acumulativas: owner `HCI-001`, target `APP:*`, dimension `accessibility_semantics`, source mapping `SOURCE_HINT_VERIFIED`, repositorio canónico `carlosjmunoz78/fenix-capital-inmo-map`, `src/App.tsx` allowlisted y todas las fronteras de seguridad a false.

Transformación: añade `role="main"` exclusivamente a los dos shells públicos de autenticación ya identificados. El transform falla cerrado si la forma del fichero no coincide exactamente con la esperada.

## Gate de ejecución

`QA-001 -> SELF-001 -> QA Source Mapping -> AUTO-001 Patch Planner -> certified transform -> build -> targeted tests -> isolated branch -> PR`.

El PR no se fusiona automáticamente. Aún debe pasar OLD vs NEW, tribunal independiente, rollback/rebuild y la política de promoción.

## Seguridad

- snapshot por SHA de `main`;
- máximo 1 fichero;
- máximo 4 líneas de delta para esta clase;
- no shell arbitrario generado por hallazgos;
- no código externo;
- no datos de clientes;
- no Trading;
- no PROD write;
- no auto-merge;
- coste adicional 0 €.

## Backup / rollback / rebuild

El snapshot es el SHA base de `main`. El parche vive en rama determinista aislada. Rollback antes de merge = borrar rama/PR. Después de merge gobernado = revertir commit. Rebuild = regenerar el plan desde `qa-source-mapping.v0.json` y reaplicar el transform certificado sobre el SHA base compatible.
