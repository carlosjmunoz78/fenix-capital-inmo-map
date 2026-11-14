# CEREBRO SEO-001 · Evidencia física: JOB-001 → D15 → D31 → tribunal técnico

**Fecha:** 2026-11-06. **Estado:** **QA_TÉCNICO_PRELIMINAR_VERDE / LIBERACIÓN HOLD**, no implantado como scheduler autónomo.
**Empresa:** fenix · **motor:** SEO-001 · **entorno:** PREPROD · **versión:** 0.1.0 · **PR:** #22 DRAFT sin fusión.

## Origen y gates ya verificados

- Aprobación de dirección estratégica del propietario [GitHub issue comment 6682124001](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/pull/22#issuecomment-6682124001), usuario GitHub `carlosjmunoz78` ID `130542695`, fecha de creación y modificación `2026-11-06T09:54:51Z`, texto exacto y blob de plan `1c0e4897ca9bd44efd1b1965e7ad60af76207bef`. CI vuelve a consultar API GitHub con token de lectura y confirma autenticidad sin loguear credenciales.
- Registro PREPROD de aprobación separado: `public.cerebro_seo_owner_strategy_approval_preprod_v0` con política `PREPARE_BRIEFS_AND_DRAFTS_ONLY`. Ningún permiso de publicación.
- Dos borradores completos ya presentes en GitHub, no en WordPress y no duplicados en el corpus de 200 URL; cola PREPROD `public.cerebro_seo_editorial_queue_preprod_v0`, dos entradas `DRAFT_READY_FOR_QA`.
- El artículo WordPress #52656 se ha preservado como borrador. No hay cambios en posts, páginas, contactos, newsletter, API de pagos, App, CRM o PROD.

## QA real en GitHub Actions

**Ejecución satisfactoria:** [42200237347](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42200237347), 4 tests reales y negativos correctos; confirmación GitHub REST de aprobación; procesamiento de ambos borradores reales por JOB-001 durable, D15, D31, tribunal; artefacto `seo001-editorial-preprod-review-evidence-v0` (ID GitHub `13493323007`, retención 7 días).

| Work ID | Persona | SHA256 exacto del HTML | Gate |
|---|---|---|---|
| `SEO001-FENIX-B2C-EDITORIAL-001` | Particulares | `636e98f2f30d85f36f91bf5aa2fab1f1a2e36c1e1861b325ef39c42e53c3d3b5` | `TECHNICAL_PRECHECK_PASS_RELEASE_HOLD` |
| `SEO001-FENIX-B2B-EDITORIAL-002` | Inmobiliarias | `954d02aa09ece325e05bd1fdf6f9f94504c95e330d830c03e39ccfbc196715f7` | `TECHNICAL_PRECHECK_PASS_RELEASE_HOLD` |

**Qué se ha probado:** huellas de archivos reales y git blobs, segregación B2C/B2B, versión correcta, IDEMPOTENCIA de JOB-001 con recuperación desde journal en runner, inspección determinista del texto, estructura SEO mínima, CTAs y límites de claims, QA técnica en proceso separado y tribunal de control de permisos sin publicación. `WordPress writes=0`, `publish=0`. No se declara fuente GSC actual, éxito de ranking, editorial visual, identidad IAM de cada agente, aprobación independiente experta ni rollback físico WordPress.

**Persistencia física adicional:** tabla nueva `public.cerebro_seo_editorial_technical_qa_preprod_v0` creada con migración `seo_editorial_technical_qa_appendonly_preprod_20261106`; dos recibos reales del run `42200237347` y job GitHub `127833424152` insertados con scope empresa y SHA; `rls=true`, `anon SELECT=false`, `authenticated INSERT=false`, `service_role INSERT/SELECT=true`, `service_role UPDATE/DELETE=false`. Las dos filas conservan `independent_professional_qa_verified=false` y `publish_authorized=false`.

## Revisión individual preparada — NO APROBADA AÚN

El verificador GitHub de estrategia se ha ampliado para aceptar una decisión editorial **por work ID + SHA exacto del HTML** y la une al actual contenido bloqueado. [Tests CI 42200820928](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42200820928): **7/7 GREEN**, 0 fallos.

Los comandos para revisión desde la cuenta personal del propietario, en **dos comentarios separados**, son:

B2C:
`CEREBRO_SEO_APPROVE EDITORIAL fenix SEO001-FENIX-B2C-EDITORIAL-001 636e98f2f30d85f36f91bf5aa2fab1f1a2e36c1e1861b325ef39c42e53c3d3b5`

B2B:
`CEREBRO_SEO_APPROVE EDITORIAL fenix SEO001-FENIX-B2B-EDITORIAL-002 954d02aa09ece325e05bd1fdf6f9f94504c95e330d830c03e39ccfbc196715f7`

**La decisión editorial autorizada no equivale a publicación**, ni a escritura en WP antes de backup, IAM acotado, Core Guard y QA jurídico/financiero cuando proceda. Si se modifica un byte del borrador, el comando de la versión previa debe ser rechazado en fase de cotejo con GitHub.

## Bloqueos para pasar a WordPress

1. Owner decision por artículo (GitHub) todavía no emitida. Excepción `CUSTOMER_HUMAN_REQUEST` no aplica: es validación del propietario, no cliente; **HUMAN_REQUIRED=SIGNATURE_REQUIRED** solo si llega a requerirse firma legal; aquí hay **POLICY_CONFLICT** sin aprobación vinculada.
2. QA editorial humano o agente realmente acreditado, verificación de fuente local, claims YMYL hipotecario, privacidad B2B, licencias y visual, no simulaciones.
3. Snapshot y restore físico del sitio, configuración de permisos mínima de Cowboy + Core Guard que en el último inventario mantiene `operational_writes_allowed=false`.
4. Primero crear **solo borradores WordPress** con IDs nuevos, no editar contenido publicado; después segunda aprobación por versión del post para `publish`, monitorización y rollback.
5. La cola PREPROD existe y se ha consumido **mediante un manifiesto inmutable verificado** por un runner CI, luego recibos persistidos en Supabase por operación conectada. **NO** existe todavía un scheduler externo permanente que lea esta tabla automáticamente ni un secreto servidor provisionado que permita al runner escribir directamente en Supabase. No afirmar ejecución autónoma continua.
6. Descarga PDF privada/Brevo E2E y las dos newsletters siguen bloqueadas fuera del presente lote.

## Revertibilidad y contratos

Se añadieron únicamente scripts/tests/workflows en PR DRAFT y tabla PREPROD append-only. No modificar `main`, WordPress publicado, App/CRM ni Supabase transaccional PROD. La tabla no concede permisos `UPDATE` o `DELETE` al rol servicio. El historial de migraciones conserva reversibilidad administrativa, no invocar un DROP por defecto. El tribunal exige `OWNER_EXACT_CONTENT_APPROVAL`, `IAM`, `BACKUP_RESTORE` antes de considerar liberación.

## Ruta de operación

GitHub PR → comentario autenticado propietario → digest exacto de HTML → revisión técnica JOB-001/D15/D31/tribunal → ledger QA privado PREPROD → revisión independiente y prueba de rollback → borrador WordPress con nuestro plugin → aprobación de revisión WordPress ligada a versión → publicación solo con gate explícito y revocable → aprendizaje por métricas verificadas.

**Prohibidos:** WPVibe, Make para este flujo, costes de API o suscripciones adicionales sin justificación; no promover por tests sintéticos. No mezclar empresas, Trading o CRM.
