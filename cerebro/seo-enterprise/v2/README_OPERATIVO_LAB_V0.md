# CEREBRO SEO Enterprise V2 · primer bloque ejecutable LAB

**Estado:** PARCIAL · WORKER LAB ADITIVO, no departamento certificado. **Fecha:** 2026-11-05.
**Ubicación:** PR #22, rama \`cerebro/seo-enterprise-family-staging-contract-v1-20261105\`.
**No modifica PROD, App, CRM, WordPress ni el Engine Registry.**

## Inventario / reutilización

- La organización canónica V2 ya tiene 8 familias / 32 departamentos en \`organization.manifest.json\`; no generar un segundo catálogo.
- Motor \`SEO-001\` existente en \`cerebro/registry/engine-registry.v1.json\`.
- FACT-001 existe en \`cerebro/factory.mjs\` y \`cerebro/runtime/mission-fact001-scaffold-bridge-v1.mjs\`; no recreado.
- Reutilización **real en código**: \`cerebro/runtime/evaluation-tribunal.mjs\` para OLD vs NEW y juicio independiente.
- La relación con el router duradero, las identidades de IAM y STAGING **no está acreditada aún**; no marcarla como hecha.
- \`competency-coverage-and-board-v0.json\` cubre **141 asignaciones de competencia** y mantiene los 32 departamentos en \`DEFINED_NOT_READY\` mientras falten pruebas físicas.

## Trabajadores LAB del primer circuito

- \`SEO-D15-COPY-INSPECTOR\`: localiza errores de copy y emite evidencias con hash, sin modificar publicaciones.
- \`SEO-D31-INDEPENDENT-QA\`: verifica las observaciones y comprueba que el autor no sea su propio revisor.
- \`SEO-INDEPENDENT-JUDGE\`: declara resultado LAB; ningún veredicto habilita automáticamente publicación.
- La identidad de cada actor todavía es una referencia de entrada de laboratorio, **no una cuenta IAM validada**.
- \`recordMerit\`: genera exclusivamente candidato a insignia, nunca premio efectivo, permiso, sueldo o capacidad financiera.
- \`assessReplacement\`: aplica OLD vs NEW, shadow, prueba de rollback y permisos iguales; nunca realiza la sustitución automáticamente.

## Ejecutar una unidad de trabajo

Enviar a stdin un JSON con \`mission_id\`, \`company_id\`, \`environment=LAB\`, \`version\`, los IDs distintos \`author_actor_id\`, \`reviewer_actor_id\`, \`judge_actor_id\`, \`text\`, \`sources\`, \`budget_eur=0\`, \`allow_writes=false\` y \`allow_paid_ai=false\`.

\`\`\`bash
node cerebro/seo-enterprise/v2/runtime/seo-workforce-cli-v0.mjs < mission.json
node --test cerebro/seo-enterprise/v2/tests/*.test.mjs
\`\`\`

El ejecutor recibe una **captura de texto suministrada** y devuelve JSON con hallazgos, posiciones, hash, veredicto, coste y denegación de promoción. No descarga páginas ni certifica actualidad de fuentes. Solo procesa datos públicos o autorizados.

## Gates de publicación

**No acreditado:** snapshot de WordPress STAGING, aislamiento físico, integración de API/Abilities, consentimiento y formulario→CRM E2E, indexabilidad, revisión financiera, métrica GSC/GA4, OLD vs NEW de página real, recuperación de backup, rollback real y monitorización canary. Sin todos los gates → publicación denegada.

**No confundir** que el CI supere tests del ejecutor con un departamento \`CONFIRMED_OPERATIONAL\` o un SEO aprobado. El entorno STAGING WEB no es App PREPROD; App/CRM reales quedan intactos.

## Meritocracia universal

El contrato cubre autores, agentes, subagentes, responsables, supervisores, QA, jueces, tribunal, guardianes y meta-supervisores. No autopuntuación ni autoasignación. Falta persistencia duradera de scorecards, roles IAM comprobados, pruebas shadow con un sustituto real y reexamen de todos los trabajadores; no inventar premios otorgados.

## Next block

1. Verificar Actions del SHA y resolver solo los errores reales.
2. Auditar bindings FACT-001/SEO-001 y catalogar identidades, permisos y handlers ya reutilizables.
3. Enlazar la unidad de trabajo al runtime/gateway compartido con identidad autenticada, idempotencia y ledger persistente.
4. Completar workers por competencia siguiendo la matriz, comenzando D05/D08/D09/D13-D16/D17/D24/D29/D31-D32; no inventar efectivos.
5. Obtener snapshot/lectura de STAGING por conector WordPress autorizado, ejecutar una misión transversal de solo lectura con evidencia y plan de rollback antes de cualquier escritura.
6. Someter cada departamento a criterios de LISTO físicos, entrenamiento y evaluación independiente. Estado final hasta entonces: PARCIAL.

## Rollback

Todo cambio de esta PR es aditivo en \`cerebro/seo-enterprise/v2/\`; no despliega. Rollback de código: revertir los commits nuevos de la rama tras comprobar las referencias, sin borrar la historia ni modificar producción. Rollback físico WordPress no aplica porque no se ha realizado ninguna escritura.


## Actualización de evidencia · 2026-11-05 · CI y STAGING

- **CI validado**: 37 tests de contrato y lógica SEO v1/v2, 37 PASS / 0 FAIL (GitHub Actions `41938566584`, commit `9beca1387d63a36b6b0437201aee79b7948c7278`).
- **STAGING físico**: lectura HTTP 200, `noindex` confirmado y 0 escrituras. Misión transversal D09 → D15 → D31 de solo lectura, 6/6 tests del workflow de inspección anterior: `41938001107`.
- **Ocho observaciones adicionales de una única portada**: D11, D12, D17, D21, D23, D24, D25, D26. Fuente física `41938332022` (SUCCESS). No equivalen a departamentos desplegados ni a pruebas de GSC, GBP, PageSpeed, CRM, consentimiento, Core Web Vitals de campo o índice de Google.
- **Métricas observadas en la portada STAGING**: 176 enlaces internos (ocurrencias, no URLs únicas), 12 H2, 1 bloque JSON-LD parseable (sin certificar tipos), mención de Córdoba, HTML 237226 bytes, 8 imágenes, 2 elementos `form` (método GET observado), 0 imágenes sin atributo alt y 1 con alt vacío (requiere valoración contextual). **No deducir una incidencia sin evaluación de contexto**.
- **D05/D08**: cálculo de candidatas de anticanibalización en fixtures de LAB, nunca datos GSC verificados ni redirecciones efectuadas.
- **Tablero actualizado**: `v2/competency-coverage-and-board-v0.json`: 13/32 con evidencia **PARCIAL**, 19/32 **DEFINIDO**, **0/32 LISTO**, y **0 identidades de agentes/subagentes V2 certificadas como activas**.
- **Bloqueos de conectividad**: el conector WordPress de STAGING reporta error interno; Opera no responde en el plazo y GSC Wizard exige suscripción (NO CONTRATAR). El workflow CI propio permite lecturas públicas sin depender de esas rutas, pero no permite cambios autenticados en WordPress.
- **Seguridad**: `main`, PROD WordPress, App, CRM, Supabase, datos de clientes, Trading y presupuesto siguen intactos. Toda la ejecución nueva se limita a la rama DRAFT de PR #22 y a HTTP GET públicos.

### Siguiente bloque operativo sin duplicar sistemas

Auditar identidades y permisos efectivos de `cerebro/registry/role-agent-registry.v1.json`, el router de trabajo compartido y los bindings de FACT-001; conectar los ejecutores LAB a roles IAM verificables con auditoría durable y supervisión independiente real; después completar fuentes GSC/GA4 autorizadas y pruebas recuperables de STAGING. No subir estado `LISTO` por tests unitarios ni datos sintéticos. Antes de cualquier publicación, snapshot, aislamiento, OLD vs NEW, consentimientos, CRM E2E y rollback físico.


## Continuación ejecutada · JOB-001 / méritos / shadow

**Fuente física:** [GitHub Actions 41979543288](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/41979543288) y [contrato 41979543158](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/41979543158).

1. **JOB-001 real reutilizado**: `seo-job001-workunit-v0.mjs` encola en `DurableJobRuntimeV1` (contexto exacto `fenix / SEO-001 / PREPROD / 0.1.0`), reclama, checkpoint, completa y reabre el journal. Se verifica idempotencia entre procesos. El HTML se conserva solo de forma efímera en runner; el journal almacena hashes y métricas.
2. **Tres procesos Linux distintos ejecutados en GitHub Actions**: worker `SEO_D15_WORKER`, QA independiente `SEO_D31_QA`, juez `SEO_JUDGE_A`; verificación de PID distinto, huella de fuente, coherencia de informe y journal. Este aislamiento de proceso **no** equivale a autenticación IAM de cada rol.
3. **Merit Ledger v0**: `AtomicV8Journal` persistente reutilizado para registrar **candidato** a mérito sobre evidencia de una misión real. Score 95/100 de *integridad operativa de esta misión*, no evaluación de SERP, conversiones o crecimiento. `awarded=false`, `permissions_added=[]`, `autonomy_changed=false`. QA, juez y meta-supervisión continúan pendientes de evaluación independiente autenticada.
4. **Shadow OLD vs NEW y rollback**: tres procesos distintos ejecutan dos reglas deterministas sobre fixtures sintéticos públicos; la regla corregida mejora F1, el tribunal comparte lógica de `evaluation-tribunal.mjs`, y el runner vuelve a OLD para probar igualdad exacta. **No** es entrenamiento de modelo, ni reentrenamiento autónomo de agentes, ni rollback físico de WordPress, ni shadow sobre clientes reales.
5. **CI** sobre SHA previo al registro final: `49/49` tests de arquitectura/contratos SEO y `20/20` tests del circuito STAGING, 0 fallos. El run completo `41979543288` archiva journal, recibos, mérito y shadow sin volcar el HTML completo.

**Tablero ahora:** `14/32 PARCIAL`, `18/32 DEFINIDO`, `0/32 LISTO`. D32 gana evidencia parcial de shadow sintético. Los 3 roles son **ejecutores lógicos en procesos reales, sin identidad IAM autónoma autenticada**; la cifra de agentes/subagentes activos **certificados** sigue siendo cero. Reutilizar el runtime y registro existente, no declarar escalado a 32 sin misiones reales por competencia.

**Bloque siguiente:** (1) IAM para identidad del actor y scopes por rol; (2) evidencias de supervisión universal independiente sobre juez y guardián; (3) formularios→consentimiento→CRM con snapshot STAGING y rollback físico probado; (4) D13/D14/D16 YMYL editorial, D29 GSC/GA4 por fuente gratuita autenticada si existe; (5) cerrar suites e integración sin afectar PROD. GSC Wizard requiere suscripción: **no contratar**. Ninguna promoción hasta superar gates de seguridad.

## Continuación 2026-11-05 · Identidad de workload y control de rol

Fuente física: https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/41982256299

**VERIFICADO:** un trabajo de GitHub Actions con token existente de solo lectura consultó la API del proveedor y confirmó repositorio, rama, workflow, evento PR, run ID y job ID. El token no se persiste ni se imprime. Esta comprobación no verifica por separado la identidad de cada agente ni el alcance real del token.

**EJECUTADO:** el pipeline habilita el gate de scopes por rol antes de ejecutar trabajador, QA y tribunal; se deniegan scope/empresa/entorno/rol no reconocidos. Tres procesos emitieron recibos firmados con ED25519. QA verifica la firma del trabajador y el tribunal verifica ambas. Las claves privadas son efímeras y no se guardan. Las firmas son autofirmadas por proceso en un mismo runner, **no credenciales IAM ni PKI externa**.

**TESTS:** 60/60 generales y 31/31 STAGING, cero fallos. Acceso API de lectura, sin nuevas suscripciones, nuevos secretos, OIDC, permisos PROD ni cambios en WordPress, App, CRM, Supabase, DNS, producción o rama main.

**GATES PENDIENTES:** cuentas/workloads diferenciados y verificación IAM fuerte por actor; evaluación independiente autenticada de juez, supervisor y metaevaluador; publicación WordPress STAGING con backup y rollback físico recuperable; GSC/GA4 de fuente autorizada; formulario/consentimiento/CRM E2E; promoción OLD vs NEW en sitio real; continuidad durable entre ejecuciones de GitHub (el archivo de evidencias del run dura 14 días).

**ESTADO NO INFLADO:** 15/32 PARCIAL, 17/32 DEFINIDO y 0/32 LISTO, cero agentes/subagentes V2 certificados activos. Las seis observaciones hipotecarias de D16 son candidatos documentales; no son seis incumplimientos o afirmaciones falsas verificadas.

## Continuación · 2026-11-05 · Tres trabajos GitHub realmente separados

**HECHO y validado por GitHub:** [run 41989528379](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/41989528379), commit `bce7e5b1...`.

El workflow existente incorporó tres jobs aditivos con permisos GitHub `contents:read` + `actions:read`, sin permisos de escritura: `seo-worker-isolated` (job `127118165570`) → `seo-qa-isolated` (`127118220340`) → `seo-tribunal-isolated` (`127118306547`). GitHub confirmó los tres jobs SUCCESS. El revisor comprobó por API el SUCCESS del trabajador y el tribunal volvió a verificar por API los dos jobs predecesores; todos comparten la misma ejecución GitHub y commit y son IDs de job distintos.

Cada fase se ejecutó en un job de GitHub separado, con recibos ED25519 autofirmados, control de procedencia y verificación de huellas. Worker guardó `JOB-001` (journal persistente) en artefacto temporal, QA lo reabrió y recalculó una muestra reproducible desde el mismo código; tribunal comprobó los dos recibos. No se transfirió HTML vivo, ni se accedió a WordPress/CRM/PROD. Los artefactos de Actions caducan a los 14 días; el manifiesto de evidencias se conserva en el repo.

**Pruebas del commit físico:** 65/65 pruebas generales SEO y 36/36 de STAGING, sin fallos. El análisis HTTP real de portada STAGING permanece en el job heredado de solo lectura; el circuito de tres jobs se ha probado **únicamente con contenido sintético** para evitar almacenar datos públicos dinámicos o potenciales secretos.

**POR AUDITAR:** si una identidad autónoma individual de cada agente está autenticada por IAM/PKI/OIDC. Un job de GitHub autenticado es una identidad de workload independiente en Actions, **no** una cuenta IAM autónoma o un subagente certificado. Tampoco se acreditan evaluación de SEO real con tres equipos, GSC, GA4, consentimientos, publicaciones, backup/rollback real de WordPress, ni coste GitHub Actions ilimitado. No se contratan suscripciones, pero los minutos consumidos por Actions dependen del plan existente.

**Estado canónico sin inflación:** 15/32 PARCIAL, 17/32 DEFINIDO, **0/32 LISTO**, 0 agentes/subagentes IAM certificados. Ninguna promoción, autopremio, escritura WordPress ni despliegue PROD.

## 2026-11-05 · FACT-001 extiende la organización SEO de manera no destructiva

**HECHO:** extensión `cerebro/factory/seo-org-v0.mjs` y CLI `seo-org-cli-v0.mjs`. En Actions [42062356983](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42062356983) se generaron **74 JSON** derivados de 8 familias y 32 departamentos: 8 familias, 32 manifiestos, 32 contratos, 1 supervisión y 1 índice. Segunda ejecución idéntica: 0 archivos creados y 74 conservados. Pruebas específicas 5/5, SEO 66/66 y gobierno 22/22. La fábrica original de 177 motores quedó intacta.

**No inflar autonomía:** esos documentos se generaron en el runner de CI, son contratos y modelos de puesto lógico, NO agentes IAM conectados ni departamentos LISTO. Permanecen 15 PARCIAL, 17 DEFINIDO, 0 LISTO. La verificación de sólo lectura del sitio STAGING reportó HTTP 503 en la misma secuencia de CI; no alterar ni esconder ese fallo. No cambiar PROD.

## 05-11-2026 · Departamento integral preparado documentalmente para órdenes

**El propietario no quiere volver a auditar toda la web**. Se trabaja desde inventarios guardados, cursos y backlog. Ficheros:
- `seo-existing-content-assets-source-registry-v1.json`: V4 original con **204 URLs y sus copys**, **680 imágenes** y mapeo de enlaces, incluido ZIP verificado en la rama histórica `cerebro/seo001-staging-audit-v5-20261018` y Notion canónico. Solo referencia hasta montar físicamente los datos, nunca asumir equivalencia STAGING/PROD.
- `seo-specialist-training-and-commands-v1.json`: 32 cursos de especialización, examen propio, evidencias y tribunal.
- `seo-marketing-plan-for-owner-approval-v1.json`: propuesta de seis canales, cuatro públicos, calendario semanal, campañas por intención y embudos, pendiente de aprobación estratégica del dueño.
- `runtime/seo-director-order-router-v1.mjs`: doce tipos de órdenes, dirección de familia y especialistas, revisión QA y tribunal. Las órdenes se guardan solamente en LAB, no ejecutan escrituras reales.
- `runtime/seo-ops-console-cli-v1.mjs`: CLI de consulta, plan, entrenamiento y demostración de encolado. Se genera 32 currículos + índice; regenerar es idempotente y rechaza sobrescrituras.
- Deuda visual de landings de pueblos moradas/rosas: backlog gradual **una URL por vez**, usando patrón de ciudades, no cambios en PROD ahora.

**Diferenciar:** PREPARADO (32 módulos formativos y contrato operativo), NO ACREDITADO (32 especialistas reales formados, IAM individual, continuidad de worker, acceso real al ZIP en JOB-001), PENDIENTE APROBACIÓN (estrategia marketing), PENDIENTE PRODDUCCIÓN (autonomía con permisos). El corpus V4 preserva copy visitante, no markup crudo del editor.
