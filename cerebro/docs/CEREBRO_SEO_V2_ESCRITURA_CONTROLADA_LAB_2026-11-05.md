# CEREBRO SEO V2 · Escribir, no solo leer · Fase LAB completada

**Fecha:** 2026-11-05. **Repo:** `carlosjmunoz78/fenix-capital-inmo-map`, PR #22 DRAFT. **Estado:** `REAL_SANDBOX_WRITE_GREEN`, `WORDPRESS_WRITE_DENIED`.

## Resultado físico
En [GitHub Actions 42114713494](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42114713494) han finalizado los cuatro trabajos: lectura SEO, QA, tribunal y **un cuarto job OIDC de escritura**; todos `SUCCESS`.

El escritor ha:
- Autenticado la identidad de GitHub mediante firma OIDC y API, sin exponer tokens.
- Verificado que los otros tres jobs finalizaron correctamente y que el tribunal aceptó las evidencias, **sin aprobar producción**.
- Volcado a archivos reales **20 borradores editoriales** relacionados con 20 de las 200 URL conservadas (metadescripción candidata, CTA, párrafo auxiliar, fuente de copy y restricciones legales).
- Generado un manifiesto de 20 archivos con hashes de contenido.
- Probado repetición idempotente: misma solicitud no modifica archivos; solicitud con discrepancias de contenido se deniega.
- Probado una **restauración física en LAB**: crea un archivo testigo, lo elimina y verifica que un archivo previo sigue intacto.
- Archivado resultados y manifiesto en **`seo-editorial-write-lab-v1`**, [artefacto ID 13455159335](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42114713494). Retención configurada: 14 días.

El workflow solo tiene permisos GitHub `contents:read`, `actions:read`, `id-token:write`. La escritura real se produce **dentro del runner efímero**, no sobre WordPress, CRM, App, DNS ni main. Los archivos de edición son propuestas, no publicaciones ni cambios aplicados a una URL pública.

## Control técnico
- API: `cerebro/seo-enterprise/v2/runtime/seo-draft-writer-lab-v1.mjs`.
- Contrato: `SEO_WRITE_EDITORIAL_DRAFT_FILES_LAB` conectado a ACTGW-001 V1, PREPROD, sin escritura PROD.
- Tarea: `seo-corpus-sandbox-writer` después de trabajador, QA y tribunal.
- Políticas: identidad OIDC separada, todos los trabajos previos comprobados por GitHub API, ruta de escritura aislada, permiso específico, `wx` (sin sobrescribir), hashes, rollback canario y ningún gasto de suscripción.
- Pruebas CI [42114713057](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42114713057): **144/144** SEO, **22/22**, **5/5** y **5/5**; 0 fallos.

## Capacidad de escritura siguiente: WordPress
La transición precisa 5 condiciones, todas verificables:

1. **Contrato de identidad** para un escritor WordPress con permisos de borrador, sin `publish` ni `edit_published_posts` por defecto.
2. **Backup y rollback de cada objeto** antes de cualquier mutación: contenido, metadatos, shortcodes, referencias de bloque, imágenes asociadas y efectos colaterales.
3. **QA de copy real**, especialmente en hipotecas y publicidad financiera, más verificación de imágenes/licencias, enlaces, canibalización e intención.
4. **OLD vs NEW y ejecución acotada**, primero un borrador separado; ningún cambio masivo de 200 URL.
5. **Promoción independiente por política**; ni una identidad GitHub ni un test de laboratorio autorizan por sí solos WordPress PROD.

Solo cuando esos contratos funcionen en el Gateway y se obtengan evidencias físicas podrá activarse `CREATE_WORDPRESS_DRAFT`. `PUBLISH` y editar páginas ya publicadas permanecen bloqueados.

## Protección y continuidad
El inventario actual se reutilizó sin auditorías. STAGING sigue aparcado. La App, CRM, Supabase y WordPress se preservaron. La PR #22 sigue DRAFT. El rollback sobre WordPress **NO** se ha probado; no atribuir al canario LAB propiedades de restauración PROD.

**Siguiente etapa técnica:** writer WordPress `DRAFT_ONLY` detrás de IAM/backup/QA/tribunal; no crear permisos de escritura globales ni transferir el token GitHub a WordPress.
