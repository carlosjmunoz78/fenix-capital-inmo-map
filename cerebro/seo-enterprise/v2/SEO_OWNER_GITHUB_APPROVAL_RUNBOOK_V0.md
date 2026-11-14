# SEO-001 · Canal de aprobaciones GitHub sin Work · 2026-11-06
Estado: **CONTRATO PREPROD**, no instalado como servicio web ni escritor WordPress.
Proveedor de aprobación: GitHub REST, comentario en PR #22 hecho por la cuenta del propietario `carlosjmunoz78` (ID numérico de GitHub verificado anteriormente), en su PR DRAFT.

## Comandos de aprobación versionados
- Estrategia vigente: `CEREBRO_SEO_APPROVE STRATEGY fenix 1c0e4897ca9bd44efd1b1965e7ad60af76207bef`.
- Borrador específico (ejemplo únicamente): `CEREBRO_SEO_APPROVE DRAFT fenix 52656 <SHA256_REAL_CONTENIDO_FINAL>`.
- No se permite aprobar una versión que haya cambiado, ni reutilizar una aprobación entre empresas.
- La consulta técnica de comentario `GET /repos/carlosjmunoz78/fenix-capital-inmo-map/issues/comments/<id>` debe efectuarse desde servidor con token existente, secreto no registrado. Se verifican ID del propietario, PR #22, versión y comentario no editado. Un payload con `server_verified:true` no es prueba.
- Cada aprobación se trata como **intención de progreso por gate**, no permiso operativo autónomo.

## Permisos por escalón
1. Aprobación estrategia → preparar briefs y borradores sujetos a QA, sin crear página publicada.
2. Aprobación de borrador con hash exacto → pasar a tribunal de liberación, **no** ejecutar `wp_update_post(status=publish)`.
3. Publicación → acceso explícito autenticado y revocable de publicación, QA independiente, snapshot y restore físico, revisión de claims financieros y costes, pruebas de endpoint, gate Core Guard. Por ahora **HOLD**, nunca inferirlo de un comentario.

## WordPress
**PROHIBIDO WPVibe.** Utilizar únicamente `Cowboy_MCP_web`, `wp_create_post` con status `draft`, `wp_update_post` bajo snapshot/rollback, y guardia propia `fenix-core-guard`; no desactivar su bloqueo de operaciones. Los sistemas actuales `fenix-cerebro-leads` y `fenix-seo-cerebro` se conservan. El post 52656 se mantiene `draft` y no debe duplicarse.

## Persistencia y relevo
Documentar versión, persona, compañía, actor, hash, instante, QA y resultado de tribunal en registro. No aceptar campos autorreferenciales; consultar proveedor. Las pruebas sintéticas de esta PR **no** acreditan todavía una aprobación del dueño ni una publicación física. El estado final es `DEFINED_AND_CI_TESTED`, con binding del controlador a un runner JOB-001 por finalizar, y sin sobreescribir `main`.

## Rollback
Ninguna acción muta WordPress. Para desactivar esta capacidad, dejar de invocar el módulo; no hace falta modificar el sitio. Cuando exista un plugin de publicación activo, exigir backup físico y ensayo de restauración antes de activar permisos.
