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
