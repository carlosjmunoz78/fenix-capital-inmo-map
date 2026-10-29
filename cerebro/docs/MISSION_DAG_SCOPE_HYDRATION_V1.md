# CEREBRO OS · Mission DAG Scope Hydration V1

## Estado

- company_id: `fenix`
- engine_id: `ORCH-001` / ejecución `JOB-001`
- environment: `PREPROD`
- version: `mission-recursive-decomposer-v1` schema `1.1`
- autonomía de esta capa: `AUTONOMOUS_PREPROD_SCOPE_RESOLUTION`
- PROD write: `false`
- paid AI: `false`
- Trading access: `false`

## Fuente canónica

`/28_MACROFRENTES.md`, recuperado del traspaso canónico del 2026-10-28. El runtime exige 28 secciones ordenadas M01..M28, título y scope no vacíos. El contenido completo se sella con SHA-256 y cada misión recibe su propio `scope_fingerprint`.

SHA-256 esperado para esta revisión: `7329dcb5c3b063f228769a2d334f3a2114bc084e1b10d9a6a9d45a06ca0332b2`.

## Contrato OLD vs NEW

OLD: las 28 raíces existían con `canonical_scope_ref`, pero el texto no estaba embebido; `design`, `implement`, `accept` y `promote_gate` devolvían `SCOPE_HYDRATION_REQUIRED` y caían al worker V0.

NEW: las 28 raíces leen el scope canónico real. Cuando la fuente es válida, el DAG expone `scope_hydrated=true`, `hydrated_mission_count=28`, `canonical_source_sha256`, `mission_scope` y `scope_fingerprint`. Las fases sensibles pueden consumir ese alcance sin fallback por ausencia de texto.

Fail closed: si el fichero falta, está malformado, no contiene exactamente 28 raíces, cambia el orden o hay una raíz sin texto, el runtime conserva el comportamiento anterior `CANONICAL_REF_BOUND_SCOPE_TEXT_NOT_EMBEDDED` y vuelve a `SCOPE_HYDRATION_REQUIRED` solo donde corresponde.

## Dependencias

- `28_MACROFRENTES.md`
- `cerebro/runtime/mission-recursive-decomposer-v1.mjs`
- `cerebro/runtime/mission-derived-useful-work-v1.mjs`
- `cerebro/runtime/continuous-useful-work-factory-v0.mjs` como fallback preservado
- `.github/workflows/cerebro-cloud-useful-continuous-worker-v1.yml`

## Tests y aceptación

- hidratación 28/28 y SHA-256 válido;
- 2.352 unidades atómicas sin colisiones en el ciclo completo;
- 68 lanes iniciales sin colisiones;
- M01 y M28 verificadas contra títulos/scope canónicos;
- fallo de fuente probado con fallback fail-closed;
- PROD, paid AI y Trading siguen bloqueados;
- una unidad `implement` con scope hidratado debe quedar `SCOPE_HYDRATED_EVIDENCE_COLLECTED`, no `SCOPE_HYDRATION_REQUIRED` y no usar fallback V0.

`SCOPE_HYDRATED_EVIDENCE_COLLECTED` no significa que la implementación de negocio esté terminada: significa que esa unidad ya dispone del alcance canónico y puede analizar evidencia de forma correctamente contextualizada. La ejecución autónoma de cambios sigue sometida a sus gates de permisos, tests, evaluación y PREPROD.

## Backup / rollback / rebuild

Rollback inmediato: volver al commit `b55f131e8683d61635a1cd0df2aa4559a7273de3`. El worker V0 permanece intacto y sigue siendo fallback cuando la hidratación no es válida.

Rebuild: checkout del repo + Node.js + `28_MACROFRENTES.md`; el DAG se reconstruye determinísticamente desde la fuente, sin base externa ni suscripción nueva.

## Changelog

2026-10-29: se versiona la fuente M01..M28, se añade parser validado, fingerprint global y por misión, propagación del scope a work units, evidencia mission-aware y fallback fail-closed.
