# CEREBRO SEO-001 · Facturación cero · Piloto audiovisual privado · QA (2026-11-06)

**Empresa:** `fenix`  
**Motor origen:** `SEO-001`  
**Productora:** `FACT-001 / CREATIVE-PROGRAMMATIC-RENDER-V1`  
**Entorno del job:** `PROD` (artefacto privado, NO publicación)  
**Veredicto operativo:** `RENDER_SUCCESS_QA_VISUAL_HOLD`  
**Publicación WordPress:** `DENIED`

## 1 · Causa cerrada y activación puntual segura

Diagnóstico de solo lectura: workflow original `cerebro-creative-job-runner-v1.yml` en GitHub con estado API `disabled_fork` (estado real, no hipótesis); receipt: [run 42131416618](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42131416618), job 127608686516, reporte saneado `cerebro-seo-creative-worker-observer-v0`.

Acción correctiva **una sola ejecución**: [run 42131964855](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42131964855), habilitó temporalmente `disabled_fork → active`, solicitó un único `workflow_dispatch` de `main`, y deshabilitó inmediatamente `active → disabled_manually` con verificación de respuesta. No se dejó una programación permanente cada cinco minutos. No se imprimió token OIDC ni ningún secreto. Receipt `cerebro-seo-creative-single-dispatch-v0`.

Ejecución real del worker GitHub Actions: [run 42131975709](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42131975709), job `creative-worker` 127610581932. El paso `PROD queue worker` terminó `SUCCESS`: primero `status=SUCCEEDED` para el job real; segunda iteración `status=NO_JOB`. La programación sigue deshabilitada manualmente para evitar ejecuciones vacías. No se modificó el workflow original ni el código main de renderer.

## 2 · Prueba transaccional en Supabase

Tabla `public.cerebro_creative_job_v1` de `cluhljgonannaafpmblx`. Job único ya existente:
- `job_id=c4012f43-c12f-400b-9610-2e5f2e286000`
- `status=SUCCEEDED`; `attempt_count=1` / `max_attempts=1`; `error_code=null`
- `completed_at=2026-11-05 23:47:47.439397+00`
- `additional_cost_eur=0`; `publish_authorized=false`
- `artifact_manifest.bucket=cerebro-creative-assets` (PRIVADO)
- `artifact.path=fenix/PROD/c4012f43-c12f-400b-9610-2e5f2e286000/seo_image-c4012f43-c12f-400b-9610-2e5f2e286000.png`
- `mime=image/png`; `width=1200`; `height=630`; `bytes=43100`
- `sha256=bb88f1f907d9e2a6a13f984c2ed20707c0c1b4c69cd05a2bdb25ce71b73aac0c`

La prueba de procesamiento es concluyente. La existencia de un PNG no implica que esté listo para publicación.

## 3 · QA visual independiente sobre el PNG real

Visualizado mediante la interfaz autenticada **Supabase Storage** en sesión de lectura; sin extraer credenciales, generar URL firmada pública ni modificar el recurso. Vista privada: [carpeta del trabajo](https://supabase.com/dashboard/project/cluhljgonannaafpmblx/storage/files/buckets/cerebro-creative-assets?path=fenix%2FPROD%2Fc4012f43-c12f-400b-9610-2e5f2e286000&preview=seo_image-c4012f43-c12f-400b-9610-2e5f2e286000.png).

| Gate | Evidencia | Estado |
|---|---|---|
| Job origen SEO correcto | Enqueue original y salida trazable | PASS |
| 1200×630 | Manifest del objeto real | PASS |
| Sin promesas financieras inventadas | Texto «Hipoteca para autónomos», «Documentación y viabilidad en Córdoba» | PASS |
| Consentimiento/derechos | Gráfico sin fotografía de terceros ni datos personales | PASS PROVISIONAL (sin licencia externa necesaria) |
| PNG privado con checksum | Manifest y Storage | PASS |
| Montserrat exigida | El renderer MAIN `compositionHtml` declara `font-family:Arial,Helvetica,sans-serif`, no Montserrat | FAIL |
| Logotipo oficial | Vista final muestra marca tipográfica de texto, no recurso/logo real verificado | FAIL |
| Calidad editorial alta | Composición mayormente plana, barra morada y texto; escasa jerarquía visual de marca, no suficientemente diferencial | HOLD |
| Amarillo/naranja Fénix con identidad equilibrada | No se aprecia integración del sistema cromático completo; depende del renderer legacy | HOLD |
| ALT/WebP y prueba visual en el artículo | Todavía no se ha importado a WordPress | NOT RUN |
| QA D16/D26/D31 + tribunal | No completado | HOLD |

**Veredicto:** `REJECT_FOR_WORDPRESS_IMPORT_KEEP_AS_PRIVATE_EVIDENCE`. NO generar una segunda orden duplicada para el mismo job (ya agotó `max_attempts=1`). NO sustituir a ciegas el media WordPress. NO declarar imagen premium publicada.

## 4 · Reparación acotada, sin sustituir la productora

Priorizar mejora **en rama paralela** del compositor `SEO_IMAGE` con Montserrat verificable, logo auténtico Fénix en superficie clara, naranja `#FF5F00` y amarillo `#FFB71B`, jerarquía visual responsive y safe area, sin promesas financieras ni fotografías sin derechos. Reutilizar las políticas y componentes compatibles de PR #23 donde tengan sentido, **sin** incorporar APIs pagadas/credenciales al circuito de coste cero.

Antes del nuevo render sobre la misma intención: tests de fuente, logo/alpha, contraste, SHA, 1200×630, legal/rights, render real y QA independiente en PREPROD. Guardar OLD vs NEW y rollback; entonces solicitar un nuevo **job versionado** solo si fuese necesario, sin modificar ni sobrescribir el histórico correcto `c4012f43...`.

## 5 · Operación y coste

- No se ha publicado en WP ni Facebook. No hay cambios de App/CRM.
- No se ha alterado `main`, cron, colas ni funciones de Supabase. La transición de estado `disabled_fork → disabled_manually` afecta solo al habilitado del workflow GitHub, realizado de manera controlada.
- GitHub usa `ubuntu-latest` estándar en repositorio público; el coste de minutos de ejecución es gratis según términos oficiales, aunque cargas excesivas consumen recursos sin aportar valor.
- **Autonomía 24/7 pendiente**: dejar disabled y diseñar scheduler ligero que consulte backlog y despache únicamente cuando existan jobs válidos y con permisos, con límites observables y sin 288 instalaciones pesadas al día.
