# CEREBRO OS · B20 · P0 ACCEPTANCE AND SCALE RELEASE CERTIFICATION V1

Fecha: 2026-10-18  
Repo: `carlosjmunoz78/fenix-capital-inmo-map`  
Rama: `cerebro/universal-skill-activation-factory-v1-20261017`  
PR: `#784`  
Entorno: `PREPROD`  
Coste adicional: `0 €`  
PROD: `NO` · Auto-merge: `NO` · Trading: `NO` · Customer data: `NO`

## Objetivo
Cerrar la aceptación P0 industrial de `FACT-001` sin rehacer B15–B19. B20 reconcilia, en una única certificación exact-head, la evidencia persistida de B19 con FAST_LANE/blind-batch, Scale184 V1/V2, Repository E2E y GitHub Live E2E.

La certificación debe demostrar que una entrada nueva estándar puede recorrer la fábrica sin añadir una rama candidate-specific al core y que se mantienen terminal truth, idempotencia, fail-closed, rollback/rebuild, 0 €, PREPROD y límites de autoridad.

## Base conservada
- B15: `HECHO_PREPROD`.
- B16: `HECHO_PREPROD`.
- B17: gobernanza `HECHO_PREPROD` con residual físico externo veraz `BLOCKED_EXTERNAL / PHYSICAL_EVIDENCE_PENDING`.
- B18: `HECHO_PREPROD`.
- B19: `HECHO_PREPROD`, final `NATIVE_FULL_PREPROD`, rollback/rebuild/idempotencia/auditoría/FinOps verdes.

B20 NO reconstruye esos bloques. Los consume como evidencia y ejecuta únicamente las regresiones necesarias para garantizar que el HEAD actual no los ha roto.

## Matriz de aceptación
1. **B19 lifecycle**: registro inicial HOLD, OLD→NEW medido, LRN persistido, Tribunal independiente, promoción non-PROD, rollback controlado, backup/rebuild/OBSERV/AUD/FINOPS/idempotencia, final `NATIVE_FULL_PREPROD`.
2. **Scale184 V1**: 184/184 con outcome observado veraz, sin convertir catálogo en activación física.
3. **Scale184 V2**: solo mejora a FULL cuando existe evidencia gobernada; `full_claim` global permanece false mientras exista deuda.
4. **Repository E2E**: repo no preparado → manifest/licencia/provenance → activation → binding → `FULL_SAFE_PREPROD` sin ejecutar código externo.
5. **GitHub Live E2E**: URL pública real → adquisición read-only → activación gobernada; sin token secreto, clone, install ni ejecución externa.
6. **FAST_LANE / blind-batch**: concurrencia acotada, dedupe por contenido, cache de preparación/baselines/familias, revalidación de binding obligatoria, idempotencia durable, un fallo no congela candidatos independientes.
7. **Entrada nueva**: fixture generado durante el test con nombre aleatorio que no puede existir previamente en el core; debe alcanzar estado correcto mediante contratos genéricos.
8. **Terminal truth**: manifest ausente → `LOW_CONFIDENCE`; licencia incompatible → `REJECTED`; metadata/config/synthetic no elevan a FULL.
9. **Autoridad**: no PROD, no auto-merge, no Trading, no customer data, no dependencia externa instalada, no ejecución de código externo, coste 0 €.
10. **Regresión**: suite completa CEREBRO aplicable GREEN.

## Implementación mínima
B20 es principalmente una **certificación**, no una nueva capa de runtime. La regla `REUSE_BEFORE_BUILD` obliga a reutilizar los componentes ya construidos. Solo se añade:
- contrato B20;
- test de aceptación B20;
- workflow exact-head B20;
- registry/evidence de B20;
- runbook/changelog/backup-rebuild/autonomy en este documento;
- actualización de continuidad.

No se añade lógica candidate-specific al core.

## Runbook
1. Verificar PR #784 y HEAD vivo.
2. Ejecutar test B20.
3. Ejecutar targeted matrix: B19, batch/FAST_LANE, blind real catalog, Scale184 V1/V2, Repository E2E, GitHub intake.
4. Ejecutar GitHub Live E2E read-only contra la URL pública gobernada.
5. Ejecutar full CEREBRO regression.
6. Materializar artifact B20 con exact HEAD, run id, límites de autoridad y resumen de gates.
7. Verificar workflow B20 `SUCCESS` sobre el HEAD exacto.
8. Verificar B19 exact-head `SUCCESS` en el mismo HEAD cuando sea disparado por cambios de continuidad.
9. Mantener PR DRAFT; no merge automático.
10. Persistir estado y `next_block`.

## Changelog
### v1.0.0
- Añadido contrato de aceptación P0 B20.
- Añadido test de entrada nueva no candidate-specific.
- Añadida reconciliación exact-head de Scale184 V1/V2, Repository E2E, GitHub Live E2E y FAST_LANE/blind-batch.
- Añadido artifact de certificación B20.
- Sin cambios de autoridad ni PROD.

## Backup / rollback / rebuild
- **Backup lógico**: B20 no reemplaza runtime existente; los commits del PR son reversibles y el baseline B19 permanece persistido.
- **Rollback**: revertir exclusivamente commits B20 devuelve el branch al estado B19 sin tocar PROD ni datos de cliente.
- **Rebuild**: checkout del HEAD + Node 24 + ejecución del workflow B20 reproduce la certificación sin servicios de pago.
- **No destructive migration**: no hay migraciones de datos, eliminación de archivos, cambio de RLS/RBAC ni despliegue PROD.

## Autonomía
- Autonomía B20: `PREPROD_AUTONOMOUS_WITHIN_POLICY`.
- No concede autoridad PROD.
- No concede gasto.
- No concede instalación/ejecución arbitraria de terceros.
- `HUMAN_REQUIRED` únicamente usa los ocho códigos canónicos.

## Tribunal / no self-judging
B20 no sustituye el Tribunal. Reutiliza la evidencia B19 con Tribunal independiente y exige full regression + gates separados. El mismo actor que clasifica una entrada no puede elevarla a FULL sin cumplir evidencia de binding y evaluación.

## Criterio de cierre
`B20_GREEN_PREPROD` solo cuando el workflow `CEREBRO Universal Skill B20 P0 Acceptance and Scale Release V1` sea `SUCCESS` sobre el HEAD exacto del PR y no exista expansión de autoridad.

Después de B20, el siguiente trabajo no es rehacer la Factory: es auditar/certificar especializaciones de ingeniería aún no FULL, empezando por `ARQUITECTO` y `PERFORMANCE`, salvo que el estado vivo defina un next_block más reciente.
