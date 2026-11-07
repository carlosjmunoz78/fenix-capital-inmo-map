# SEO Enterprise V2 · Changelog

## 2026-11-05 · URL ownership, anticannibalización responsable, embudos y audiovisual

- Contrato SEO `runtime/seo-owner-intent-funnel-v1.mjs`: 200 URL, 8 embudos, 24 parejas B2B/B2C preservadas, duplicidad Home/`inicio` por focus-keyphrase sin afirmar canibalización real.
- `runtime/seo-audiovisual-brief-v1.mjs`: encargo visual completo con paleta y Montserrat del manual 2025, derechos y requisitos SEO.
- `runtime/seo-owner-funnel-cli-v1.mjs` y workflow `cerebro-seo-owner-funnel-media-v1.yml`: ejecución física, QA y tribunal en [42119865699](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42119865699), 7/7 tests.
- Productora real (cola existente): job `c4012f43-c12f-400b-9610-2e5f2e286000` **QUEUED** para una imagen SEO privada, sin publicar, coste adicional previsto 0 €.
- Estado persistente: `seo-200-url-strategy-creative-order-v1.json` y `cerebro/docs/CEREBRO_SEO_ESTRATEGIA_200URL_EMBUDOS_PRODUCTORA_2026-11-05.md`. La verificación de calidad visual permanece pendiente.
- Sin auditoría nueva, sin redirecciones, sin cambios en WordPress/App/CRM, PR DRAFT.

## 2026-11-05 · Puente Cowboy WordPress DRAFT_ONLY verificado por simulación

- `wp_create_post` admite `status:'draft'` y `dry_run:true`; respuesta de simulación verificada sin crear entradas ni editar el sitio.
- Añadido `runtime/seo-wordpress-draft-bridge-v1.mjs` y su contrato. Es preparación de escritura en CMS, NO permiso de publicación ni ejecución PROD.
- Las escrituras reales continúan aisladas al archivo LAB; el piloto WordPress requiere IAM y backup/rollback físico.

## 2026-11-05 · WRITE-LAB real, cuatro jobs OIDC y 20 borradores editoriales

- Añadido `runtime/seo-draft-writer-lab-v1.mjs`: modo WRITE acotado al filesystem temporal del runner GitHub, productor de 20 JSON editoriales + manifiesto, no WordPress.
- Nuevo job `seo-corpus-sandbox-writer` con identidad OIDC distinta tras worker + QA + tribunal; tokens GitHub de solo lectura del repositorio.
- Físico [42114713494](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42114713494): 4/4 SUCCESS, 20 borradores escritos y archivados, canario de rollback LAB verificado.
- Test [42114713057](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42114713057): 144/144 SEO y suites 22/22 + 5/5 + 5/5 correctas.
- Próximo gate: IAM WordPress mínimo, CREATE_DRAFT (sin publicar), backup/restore por objeto y QA editorial. NO actuar en WordPress/App/CRM/Supabase hasta cerrar.
- Manifiesto `seo-isolated-write-evidence-v1.json` y runbook `cerebro/docs/CEREBRO_SEO_V2_ESCRITURA_CONTROLADA_LAB_2026-11-05.md`.

## 2026-11-05 · Fase L0: acciones por URL y ejecución de formación determinista

- Materializado el motor `runtime/seo-specialist-work-product-v1.mjs`: 141 propuestas especializadas ligadas al inventario aceptado y 200 acciones sobre URL existentes sin nuevo rastreo.
- Añadido `runtime/seo-specialist-practice-attempt-v1.mjs`: 423 prácticas deterministas ejecutadas sin simular aprobaciones de agentes. QA y tribunal contrastan cada respuesta contra el contenido ya guardado.
- `runtime/seo-corpus-job001-work-v1.mjs` integra ambos en ACTGW-001/JOB-001 y conserva el bloqueo de producción; 3 jobs OIDC y 142/142 tests SEO + suites complementarias GREEN.
- Evidencias en `seo-operational-readonly-evidence-v1.json`; runbook en `cerebro/docs/CEREBRO_SEO_ENTERPRISE_V2_L0_ENTREGABLES_2026-11-05.md`.
- Pendiente IAM individual, aprendizaje de agentes reales, host permanente y promoción gradual; cero cambios en WordPress/App/CRM/Supabase.

## 2026-11-05 · IAM efímero acotado y casos de formación

- Se conserva el corpus actual fijado por el propietario sin repetir auditorías.
- Se añade `runtime/seo-workload-role-lease-v1.mjs` para 141 pruebas Ed25519 de identidad delegada **NO-BEARER** y permisos de solo lectura; clave privada efímera por workflow, scope por especialidad y TTL limitado.
- Se añade `runtime/seo-specialist-exercise-engine-v1.mjs` con 423 prácticas derivadas de URLs reales; ningún examen se marca aprobado sin respuesta y QA independiente.
- `runtime/seo-corpus-job001-work-v1.mjs` ahora bloquea cada tarea si su prueba de permisos no verifica. QA recalcula 423 casos y firmas; tribunal confirma 141/423 sin promocionar a PROD.
- 137/137 pruebas SEO y 3/3 jobs OIDC de worker, QA y tribunal en verde. Véase `seo-role-scoped-training-evidence-v1.json`.
- Ninguna modificación de WordPress/App/CRM/Supabase, ningún servidor nuevo ni suscripción adicional.
- Estado real: preparado para vincular identidades reales y ejecutar exámenes auténticos; no se afirma autonomía en producción.
