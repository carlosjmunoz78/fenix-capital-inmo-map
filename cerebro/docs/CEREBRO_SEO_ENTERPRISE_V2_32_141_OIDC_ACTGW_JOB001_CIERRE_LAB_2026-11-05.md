# CEREBRO SEO Enterprise V2 · Cierre físico OIDC → ACTGW-001 → JOB-001 → QA → Tribunal

**Fecha:** 2026-11-05  
**Estado:** HECHO LAB/PREPROD de ejecución del corpus; **NO PROD AUTÓNOMO**.

## Orden del propietario
- No realizar más auditorías, recrawls ni consultas a WordPress.
- Utilizar el inventario ya guardado y aceptado como vigente.
- STAGING fuera del alcance de esta misión.
- Completar agentes y subagentes de los 32 departamentos usando los motores compartidos existentes; sin suscripciones nuevas ni cambios a la web o App/CRM.

## Base ya construida
- 8 familias profesionales y 32 departamentos.
- 32 knowledge packs especializados y 141 contratos de subagentes por competencia.
- 192 instrucciones específicas y fichas de fuente, ejercicio, riesgos, entregable y supervisión.
- Factory FACT-001 genera 141 scaffolds de especialidad, con esquema de permisos, rollback, backup, training, pruebas y observabilidad.
- Archivo de trabajo **actual**: 166 páginas + 34 posts publicados y 629 imágenes; 200 documentos con copy y metadatos en 10 bloques versionados. No se ha capturado la web de nuevo.
- El inventario previo de 204 URLs y 680 imágenes es histórico y no suplanta al corpus declarado como actual.

## Ejecución física verificada
[GitHub Actions run 42106497539](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42106497539) **SUCCESS**, fuente PR DRAFT SHA `473371bef2480335c84bfe117189d6c350e01598`.

| Job | GitHub job ID | Identidad | Función |
|---|---:|---|---|
| seo-corpus-worker | 127522579964 | OIDC firmada y GitHub API | Contratos y 141 jobs sobre corpus guardado a través ACTGW-001 + JOB-001 |
| seo-corpus-qa | 127522680612 | OIDC firmada y GitHub API | Recomputación independiente de las 141 evidencias desde la misma fuente |
| seo-corpus-tribunal | 127522788681 | OIDC firmada y GitHub API | Verifica separación, fuentes y control de no-promoción PROD |

Los tres jobs terminaron con `success`. Los artefactos están archivados en GitHub Actions, con IDs 13451502710 (trabajador), 13451927273 (QA) y 13453020382 (tribunal), con retención del workflow (14 días). Los identificadores y controles quedan asimismo declarados en `cerebro/seo-enterprise/v2/seo-iam-workload-binding-v1.json`.

**No son 141 llamadas de IA ni 141 agentes de servicio.** Son 141 trabajos deterministas de evidencia por competencia en un ejecutor compartido, usando documentos ya almacenados. Una prueba de trabajo auténtico sobre datos reales, pero parcial respecto a cada profesión.

## Política de seguridad
1. El token OIDC se valida contra firma pública del emisor GitHub, audiencia aislada, claims de repositorio/ramas/workflow/run y caducidad. Token y credenciales **no se guardan ni muestran**.
2. El token GitHub del workflow solo tiene `contents:read`, `actions:read` e `id-token:write`. No hay secretos WordPress, Supabase ni CRM.
3. ACTGW-001 permite exclusivamente la capacidad de análisis de corpus, mediante JWT OIDC validado y política PREPROD con coste 0 y bloqueos PROD.
4. JOB-001 materializa en journal persistente trabajos idempotentes; el QA recalcula el resultado sin usar únicamente la declaración del trabajador.
5. Tribunal acepta evidencia **sin conceder** publicación, dinero, premio, entrenamiento certificado ni permisos permanentes.
6. GitHub ID de job verificado no es identidad IAM de agente independiente. Las credenciales individuales de 141 plantillas siguen pendientes.

## Reglas de aceptación para verdadera autonomía
- IAM real e independiente donde lo requiera el modelo de amenaza.
- Binding a Gateway permanente y proveedor de herramientas autorizadas.
- Tareas específicas con evidencias comprobables por competencia; GSC/GA4/GBP o mercado solo si hay fuente real autorizada.
- Tres trabajos independientes con evaluación de D31/Tribunal y formación por D32, sin autoevaluación ni autoconcesión de permisos.
- OLD vs NEW y rollback medido, control económico, observabilidad, conservación de activos y autorización de estrategia.
- Solo entonces activación paulatina de L1-L4 por especialidad, **nunca** declaración masiva ficticia 32/32.

## Estado consolidado
- **HECHO:** conocimientos 32/32, contratos 141/141, CI LAB de 141 trabajos, 3 identidades de jobs GitHub OIDC + API, ACTGW/JOB, QA y tribunal.
- **PARCIAL:** enlace de ejecución real específico a cada profesión; se han usado datos de corpus, no todas las fuentes sectoriales.
- **DEFINIDO:** autoridad, perfiles, exámenes y policy.
- **POR AUDITAR:** IAM propio de agentes, binding a host 24/7, entrenamiento especializado, autonomía PROD.
- **PROD:** 0/32 departamentos certificados, sin cambios web/App/CRM.
- **Coste:** 0 € de nuevas suscripciones; se consumen minutos existentes de GitHub Actions.

## Rollback y continuidad
Esta entrega es **aditiva** en la rama de la PR #22. El rollback de código consiste en revertir los commits de la rama; no existe ninguna modificación WordPress que restaurar. Mantener PR DRAFT sin merge hasta superar gates. No repetir auditoría completa ni reiniciar fábrica.
