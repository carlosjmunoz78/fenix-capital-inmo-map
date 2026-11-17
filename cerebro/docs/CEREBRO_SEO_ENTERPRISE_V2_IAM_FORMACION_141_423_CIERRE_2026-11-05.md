# CEREBRO SEO Enterprise V2 · Fase 2 · IAM por especialidad y formación

**Fecha de evidencia:** 2026-11-05. **Fuente:** PR #22 y ejecuciones reales de GitHub Actions.  
**Alcance:** 32 departamentos / 141 especializaciones; corpus de 200 URL ya almacenado y aceptado; sin nueva auditoría.

## Verificación física
- [Ejecución completa 42110095814](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42110095814): tres jobs `worker`, `qa`, `tribunal` con **SUCCESS**.
- [CI de arquitectura 42110095874](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42110095874): **137/137** pruebas SEO, más suites de 22, 5 y 5 sin fallos.
- Se generaron 141 pruebas criptográficas Ed25519 **no bearer** para confirmar el alcance de lectura de cada rol lógico desde un worker autenticado por OIDC. QA y tribunal verificaron todas las firmas.
- Se prepararon 423 casos de estudio y examen (141 especialidades × 3) basados en contenido real guardado, con procedencia, riesgo, ejercicio, campos de respuesta y limitaciones explícitas. QA volvió a computarlos contra el corpus.
- FACT-001 genera contratos de subagentes, ACTGW-001 controla una capacidad `SEO_FROZEN_CORPUS_EVIDENCE_READONLY`, JOB-001 persiste trabajos idempotentes, D31 recalcula evidencias y tribunal D32 supervisa formación. Todo en trabajos efímeros de GitHub, sin servidor nuevo.

## Qué ES y qué NO ES
- **ES:** 3 identidades de jobs GitHub Actions verificadas mediante OIDC y GitHub API; 141 controles de autorización criptográficos dentro de un worker; 423 casos preparados.
- **NO ES:** 141 identidades personales IAM, 141 procesos autónomos, 423 intentos respondidos, exámenes profesionales corregidos, servicios 24/7 ni SEO PROD autónomo.
- El algoritmo Ed25519 firma evidencias **no credenciales**. La clave privada es efímera y no sale del proceso trabajador; el verificador recibe clave pública y firmas para comprobar integridad, sin convertirlas en tokens de acceso a otros motores.
- OIDC firmado de GitHub autentica **al job**, no a cada una de las 141 personas o agentes lógicos.
- El corpus es un **snapshot aceptado**. Distinguir faltas de datos en el snapshot de errores del sitio renderizado; nunca fabricar indexación, rankings, métricas GSC/GA4 o datos bancarios.

## Operación habitual y aislamiento
1. La PR DRAFT recibe cambios en `cerebro/seo-enterprise/v2/**`, lo que ejecuta el workflow de contrato con permisos `contents:read`, `actions:read` e `id-token:write`.
2. El runner pide a GitHub un OIDC, valida firma JWKS, issuer, audiencia y claims de ejecución, y comprueba el job mediante API GitHub. Si falla, niega.
3. ACTGW-001 permite solo lectura del corpus guardado y solo en PREPROD; nunca WordPress PROD.
4. El host verifica una prueba Ed25519 con `company_id`, `role_id`, `source_digest`, `work_digest`, caducidad y capacidad sin escritura para cada una de las 141 tareas.
5. JOB-001 produce informes y 423 casos de práctica. QA y tribunal corren en jobs de GitHub separados con su OIDC propio y contrastan todo sin dar permiso PROD.
6. El resultado queda registrado en artifact GitHub durante la retención configurada (14 días) y en el manifiesto de evidencia con IDs y SHA. El manifiesto no conserva secretos.

## Falta para verdadera autonomía
- **IAM individual por actor:** no usar una firma delegada del mismo host como identidad independiente. El diseño IAM-001 deberá vincular cada subagente a un principal autenticado y un permiso mínimo. No crear 141 usuarios/personas/secretos artificiales.
- **Formación real:** un actor autenticado deberá responder los casos de su especialidad; QA D31 revisa exactitud y fuente, tribunal autoriza caso por caso, D32 registra aprendizaje, repetición y mejora. Cero certificados emitidos hasta eso.
- **Host operativo:** existe ejecución efímera en GitHub, no Gateway permanente. Antes de desplegar un endpoint accesible desde CEREBRO Console se exige threat model, IAM y aislamiento del core App/CRM.
- **Promoción:** snapshot/backup, OLD vs NEW, rollback físico, auditoría, coste, permisos y aprobación estratégica antes de cualquier escritura real. Sin STAGING por orden del propietario, LAB aislado y pruebas controladas son obligatorios.

## Rollback y preservación
Solo se añadieron archivos y se extendieron los módulos SEO de la rama de PR #22. No hay mutaciones a WordPress, App, CRM o Supabase. Revertir commits de la rama restaura el estado previo. PR DRAFT, sin merge ni publicación.

## Estado de cierre
**HECHO:** conocimiento 32/32, subagentes lógicos 141/141, rol firmado 141/141, casos 423/423, run físico y CI GREEN.  
**PARCIAL:** autenticación IAM, formación real y hosting.  
**PENDIENTE:** 32/32 autonomía real certificada.  
**COSTE:** 0 € suscripciones nuevas; consumo de GitHub Actions ya disponible.
