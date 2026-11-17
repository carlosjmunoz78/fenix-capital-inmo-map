# CEREBRO OS · SEO001 · End-to-end PREPROD circuit readiness runbook · 2026-11-06

## Misión y resultado verificable

**Empresa:** fenix. **Motor:** SEO-001. **Entorno:** PREPROD, salvo simulación de WP en herramienta real con dry_run. **Versión:** 0.1.0. **PR:** #22 DRAFT. **Estado:** `SAFE_ORCHESTRATION_AND_HANDOFF_GREEN_NO_AUTONOMOUS_PROD`.

El nuevo orquestador `runtime/seo-circuit-readiness-orchestrator-v0.mjs` reutiliza componentes existentes y no instala servidores nuevos, APIs de pago, modelos locales, ni cambia App/CRM/PROD. Procesa **dos fuentes V3 reales identificadas por sus blobs Git**, no documentos sintéticos, y ejecuta:

```text
Git registry + owner-approved STRATEGY (source SHA verified)
   -> JOB-001 real durable enqueue + replay from temp journal
   -> SEO-D15 technical inspector
   -> SEO-D31 style and human voice + SEO depth gate
   -> Tribunal historical technical status + separate new depth HOLD
   -> UMS-001 image request with text/logo forbidden + metadata outside pixels
   -> WordPress draft-only dry-run plan
   -> HUMAN/QA/MEDIA/BACKUP/IAM gates before any live action
```

Este flujo **no invoca** el motor IA cloud, la API de creación de imagen ni la API de escritura de WordPress. Cuando haya una **nueva salida real** de SEO-D13, `inspectCandidateSeoHandoff` admite un recibo con work_id y SHA256 verificables, invoca D32 (incluyendo profundidad y D31), rechaza contenidos insuficientes y prepara el mismo brief UMS + plan WP **solo si** pasa controles mecánicos. Un resultado de D32 **no equivale** a QA jurídica, profesional ni aprobación. La nueva V4 requerirá nueva fuente versionada, revisión de idempotencia y SHA.

## Pruebas ejecutadas físicamente

[GitHub Actions **42224931844**](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42224931844): **5/5 PASS**, CLI real completo, **0 llamadas IA**, **0 imágenes generadas**, **0 escrituras WP**.

Artifact `seo001-end-to-end-preprod-readiness-release-hold` ID `13505047535` (retención 14 días, disponible en la sección Artifacts del run):

- `report.json` — resultados por trabajo, contadores de palabras y stages con evidencias.
- `ums-order-1.json` y `ums-order-2.json` — solicitudes originales distintas para la productora, sin texto ni logos, título/ALT/leyenda/descripcion y licencias como campos fuera de los píxeles. **Pedidos no despachados a API real**.
- `wp-dryrun-plan-1.json` y `wp-dryrun-plan-2.json` — contrato `wp_create_post` con status `draft`, `dry_run=true`, slug y texto; **nunca son órdenes de publicación ni escrituras autorizadas**.
- `manifest.json` — SHA256 de cada archivo, estado de escritura y coste.

**Prueba contra herramienta WordPress de producción, solo simulación:** `Cowboy_MCP_web/wp_create_post` con el HTML real de cada artículo, su título y slug, `status='draft'` y `dry_run=true`. Ambos recibos devuelven `dry_run:true`, `action:create`, `resource:post`, `description:Would create post with the provided parameters.`. No post_id generado, no publicación.

**Core Guard:** `fenix-core-guard/health` identifica `environment_type=production`, `operational_writes_allowed=false`, `production_override=false`.

**Exploración de WordPress solo lectura:** `wp_list_posts` usando búsquedas de tema de los dos artículos. No implica chequeo exhaustivo de slug entre todos los tipos/estados y páginas. `wordpress_slug_collision_checked_live=false`.

## V3 historial OLD vs nueva política

| Fuente preservada | Total visible | Cuerpo sin FAQ | FAQ | Mínimos nuevos | Decisión |
|---|---:|---:|---:|---|---|
| Compradores B2C V3 | 663 | 454 | 6 | >=1000 / >=750 / 6 FAQ | `DEPTH_HOLD` |
| Inmobiliarias B2B V3 | 599 | 400 | 6 | >=1000 / >=750 / 6 FAQ | `DEPTH_HOLD` |

La antigua QA técnica sigue como prueba histórica, **no autoriza** liberar estas V3. Las futuras landings tienen mínimo 900 totales y 600 de desarrollo fuera de FAQ, con 8 FAQ.

**Escritor SEO-D13:** hubo una primera generación Gemini Free real (3.5 Flash-Lite), conservada como muestra y rechazada por tono. La segunda prueba recibió HTTP 503, y su retry está bloqueado. No existe aún borrador V4 que cumpla toda la norma. No se ha realizado nueva inferencia por este orquestador.

## Puertas restantes de autonomía, sin permisos inventados

1. **SEO-D03/D05** — investigar intención, competencia, canibalización y dudas verdaderas de cada buyer persona, con enlaces/fuentes originales. Después SEO-D13 debe producir una **V4 real de >=1000 palabras** (>=750 fuera de FAQ), no rellenada; el trabajo debe pasar los QA de D15/D31/D32 y el tribunal.
2. **UMS-001** — conectar el adaptador **fotográfico limpio** y producir binarios originales. El renderizador gráfico histórico puede contener titulares o logos, por lo que no debe utilizarse a ciegas. El adapter de `existing-creative-pipeline` consultado es actualmente de **vídeo**, no un productor fotográfico certificado. No atribuir imágenes generadas. Falta recepción de bytes, hash, perceptual hash, inventario global, licencia, QA visual independiente y metadatos verificados. No ejecutar paid image provider sin presupuesto autorizado y límite técnico.
3. **WordPress** — inventario de slug y canonical actual, snapshot físico verificable de los afectados, prueba real de restauración/rollback, IAM de mínimo privilegio exclusivamente borradores, prueba segura de creación de nuevo borrador y confirmación Core Guard. No tocar contenido publicado ni habilitar el WordPress operativo sin estos gates.
4. **Aprobación** — contenido exacto por hash, QA YMYL, tribunal independiente y permiso de publicación separado. Auto-publicación solo si se cumplen todas las condiciones y no hay HUMAN_REQUIRED real. La presente política no autoriza esa promoción.
5. **Operación continua** — no programar cron de generación, tareas pagadas o reintentos sin coste/observabilidad/quota-limiter durables; evitar duplicar automatizaciones SEO que ya existen. El workflow CI de revisión corre con cambios en PR #22, no constituye scheduler de producción.

## Estado de seguridad

`HECHO` — Composición de subsistemas, tests, artefactos, WordPress dry-run real, Core Guard intacto.

`PARCIAL` — Writer cloud probado en una muestra previa, productor visual y handoff preparados pero no despachados; versión V4 todavía no creada.

`BLOQUEADO` — media física, QA independiente, backup-restauración y permisos de borrador/producción, aprobación individual y operación permanente.

**Invariantes:** `company_id,engine_id,environment,version`, cero dependencias en PCs locales, cero modelos de pago activados en este circuito, cero subscriptions nuevas, PR #22 DRAFT, branch `main` intacta, App/CRM/Supabase PROD/WordPress publicado no modificados, trading aislado.

Esta evidencia no dice `TODO OPERATIVO`, dice `CIRCUITO DE PREPARACIÓN Y QA INTEGRADO CON BLOQUEOS REALES`. Mantener el principio CONSERVAR → ENTENDER → ENVOLVER → PROBAR → MEJORAR → MIGRAR.

## Actualización física del mismo día · V4 Free cloud y nuevas puertas

**HECHO** el redactor real SEO-D13 ha ejecutado dos versiones B2C y B2B en Gemini Free desde GitHub Actions, siempre sin datos personales, sin proveedor pagado, sin reintentos automáticos ni escritor local.

- [Run 42230677924](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42230677924) — primer piloto V4 cloud con **2 respuestas reales** y 6 FAQ cada una, pero **993 / 829 palabras**. Ambas `DEPTH_HOLD`, preservadas para aprendizaje.
- [Run 42231912203](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42231912203) — segundo piloto, **2 respuestas reales** con **1629 / 1585 palabras**. B2C `H2_TOO_LONG`; B2B precontrol técnico anterior verde, pero QA posterior detectó recomendaciones que parecían hacer obligatoria la derivación tras la segunda visita y otras afirmaciones a matizar.
- Nuevas barreras en `seo-d31-human-voice-risk-gate-v0.mjs` y tests: coste fiscal de plusvalía atribuido inadecuadamente, consentimiento RGPD como obligación universal, hitos fijos arbitrarios, palabras clave forzadas, exceso de certeza de una nota simple y ejemplos de viviendas inventados presentados como observados.
- [Run **42233493715**](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42233493715) — reutilización **sin ninguna llamada IA adicional** de ambas muestras completas por SHA y reparación determinista, seguida de D31, longitud, D32 y generación de **planes UMS y WordPress** limitados a PREPROD. **2/2 `TECHNICAL_PRECHECK_PASS_RELEASE_HOLD`**; 6 FAQ por artículo.
- El mecanismo `seo-d13-v4-canonical-deterministic-repair-v0.mjs` solo admite los SHA originales exactos y cambios específicos. Nunca reescribe borradores V3 ni aplica "arreglos" indiscriminados a textos no reconocidos.

| Trabajo | SHA256 V4 revisada | Palabras visibles | Cuerpo excluidas FAQ | Media y WordPress |
|---|---|---:|---:|---|
| B2C Compradores | `875720fb5d22a3b325ab81eef39c10b9f4de71a4577a52c26a7e127c5625548b` | **1643** | **1432** | Brief UMS; WP dry-run plan, no ejecución |
| B2B Inmobiliarias | `8342799e75d8ec1aca3afa9df362dffa8948d92473dde0a8953339833bfbd83f` | **1588** | **1434** | Brief UMS; WP dry-run plan, no ejecución |

Registro de procedencia no aprobado `registry/seo001-v4-cloud-free-candidates-review-only-2026-11-06.json`, más artefacto GitHub `seo001-v4-source-locked-repair-review-only` ID `13509932634`. La vista maquetada de revisión se produjo como copia separada sin cambiar el texto fuente.

### WordPress y rollback — comprobaciones sin riesgo

Se había probado el conector `wp_create_post` en modo `dry_run=true,status=draft` con ambas V3 y devolvió confirmación de simulación. Para **las dos nuevas V4** existen planes técnicamente comprobados, **no se ha enviado su HTML a WordPress ni siquiera como nueva simulación oficial**. Es necesario no confundir un plan con un CMS post creado.

Una lectura del plugin de WordPress ha confirmado un checkpoint de base de datos histórico del **05-11-2026**, y la operación `wp_create_checkpoint` fue verificada **solo en dry-run** hoy. El checkpoint histórico **no** constituye backup actualizado para estas versiones ni prueba de restauración; no se ejecutó `wp_restore_checkpoint` porque puede borrar modificaciones posteriores de toda la base de datos. El `fenix-core-guard/health` mantiene producción con `operational_writes_allowed=false`, `production_override=false`.

### Próxima promoción segura

1. Validar de forma independiente afirmaciones hipotecarias, fiscales, registrales y RGPD, revisión de enlaces reales, buyer persona, canibalización y SEO on-page. El resultado `PRECHECK_PASS` de D31 no demuestra revisión profesional.
2. Enviar briefs de fotografía a **UMS-001** únicamente cuando haya identidad del adaptador fotográfico, coste y derechos acreditados. El renderizador gráfico existente NO sustituye a fotografía sin letras/logos. Esperar binarios con hashes, licencias, inventario de duplicados y QA de píxeles.
3. Probar snapshot reciente y **restauración aislada** sin poner en riesgo cambios posteriores del WordPress de producción, luego IAM mínimo solo borradores y Core Guard habilitado bajo política.
4. Aprobar individualmente **el SHA V4 exacto** y distinguir aprobación de contenido de autorización de publicación. Solo entonces ensayar promoción gradual.
5. Diseñar una cola durable y cron gobernados para autonomía habitual después de verificar presupuestos, límites de cuota, observabilidad y rollback. Hoy no se ha activado ningún scheduler nuevo.

**Estado global:** `V4_CONTENT_2_OF_2_MACHINE_PRECHECK_GREEN`, `YMYL_MEDIA_AND_WP_RELEASE_HOLD`, `AUTONOMOUS_PROD_NOT_READY`, `PR22_DRAFT`. No cambiar main/App/CRM/PROD/DNS ni el Trading LAB.

### Verificación adicional de rollback sin alterar WordPress

Se invocó oficialmente `Cowboy_MCP_web/wp_restore_checkpoint` con el checkpoint histórico #70 y `dry_run=true`. Resultado literal de la herramienta `dry_run:true, action:restore, resource:checkpoint, description:Would restore checkpoint #70 with the provided parameters.`. **No se restauró ninguna tabla ni se modificó producción.** Este dry-run solo confirma contrato y disponibilidad de la herramienta, no prueba de recuperación real, consistencia post-restore ni preservación de cambios posteriores; la restauración física sigue requiriendo entorno aislado. Core Guard volvió a comprobarse como `production, operational_writes_allowed=false, production_override=false`.

[Run 42234283595](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42234283595) validó además **5/5 pruebas** del orquestador tras dejar expresamente prohibido dirigir las fotografías sin textos/logos al renderizador creativo antiguo que superpone texto.

