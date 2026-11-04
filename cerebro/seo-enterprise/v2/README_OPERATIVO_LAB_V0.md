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
