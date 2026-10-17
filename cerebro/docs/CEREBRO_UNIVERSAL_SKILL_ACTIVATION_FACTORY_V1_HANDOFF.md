# CEREBRO OS · Universal Skill Activation Factory V1 · HANDOFF TOTAL

Fecha: 2026-10-18
Repositorio: `carlosjmunoz78/fenix-capital-inmo-map`
Rama: `cerebro/universal-skill-activation-factory-v1-20261017`
PR: `#784`
Último HEAD de código certificado: `a7df20aefca134086329273e9ee2be2aa3b6dd4a`
Entorno: `PREPROD`
Coste adicional: `0 €`
PROD write: `NO`
Auto-merge: `NO`
Trading: `AISLADO / NO ACCESS`

## MISIÓN
FACT-001 recibe skill/repo/URL, preserva provenance/licencia, normaliza y mapea capacidades a dominios/motores, genera o reutiliza adapters, hace binding real, OLD vs NEW, QA/EVA/JDG, LRN/OBSERV/FINOPS, backup/rollback/rebuild y termina en estado veraz. Catalogar no es integrar.

## HECHO
- Factory core, Registry y motores existentes preservados.
- Safe Engineering Profile reutilizado; no existe motor Ingeniero duplicado.
- Planner y contratos semánticos genéricos.
- Adapter Factory evidence-grounded y Auto Engineering gobernado.
- Real Binding, OLD vs NEW, QA/EVA/JDG, LRN, observabilidad, FinOps, backup/rollback/rebuild e idempotencia.
- Catálogo legacy 184 reconciliado sin afirmar “184 activas”.
- Repo desconocido y GitHub URL pública demostrados E2E.
- Source queue/event trigger: el chat no es conductor obligatorio.
- MATH V1 determinista.
- FACT Fast Lane industrial: concurrencia acotada >=5, batch 10-50+, dedupe, caches, JOB idempotente, blind catalog y telemetría.
- B15 Family Coverage/Terminal Truth cerrado.
- B16 Current Evidence + Web/SEO Debt cerrado.
- B17 Browser Automation + Physical Gates cerrado a nivel de gobernanza PREPROD, con residual físico actual veraz `BLOCKED_EXTERNAL`.

## CAPA TÉCNICA
- `CODE / SOFTWARE_ENGINEERING`: HECHO. Usa capacidades existentes de software-engineering/debugging + script/shell/openclaw_runtime + analysis/reasoning. Normal: worktree/sandbox. Elevated: dry-run first. Destructivo: HIGH_RISK. Credencial crítica: SECURITY_INCIDENT.
- `SYSTEMS`: HECHO PREPROD gate reutilizando durable worker/runtime/device profile; concurrencia, retry/checkpoint/recovery, no PROD.
- `DATA`: HECHO PREPROD gate reutilizando DB-SAFE-NATIVE; tenant/RLS y mutation fail-closed sin backup/rollback.
- `SECURITY`: HECHO PREPROD gate reutilizando IAM/credential foundation; mínimo privilegio, no secret exposure, fail-closed.
- `QA` e `INTEGRATOR`: core existentes reutilizados.
- `ARQUITECTO`: reutilización existente, todavía no se crea capa nueva innecesaria.
- `PERFORMANCE`: posterior.

## EVIDENCIA EXACT-HEAD EN `a7df20a...`
GREEN 12/12:
- Universal Skill Activation Factory V1 #104
- Universal Skill Activation Scale184 V1 #50
- Universal Skill Activation Scale184 V2 #46
- Universal Skill Repository E2E V1 #46
- Universal Skill GitHub Live E2E V1 #44
- Universal Skill B15 Integrity V1 #31
- Universal Skill B16 Current Evidence V1 #25
- Universal Skill B16 Web SEO Debt V1 #34
- Universal Skill B17 Browser Physical Gates V1 #2 (`run_id=39077601170`)
- Skill Supply Chain Gate #851
- Governed Main Integration V0 #665
- RSI Promotion Readiness Shadow V0 #831

## B17 · CIERRE
Archivos añadidos:
- `cerebro/runtime/universal-skill-b17-browser-physical-gates-v1.mjs`
- `cerebro/tests/universal-skill-b17-browser-physical-gates-v1.test.mjs`
- `.github/workflows/cerebro-universal-skill-b17-browser-physical-gates-v1.yml`
- `cerebro/registry/universal-skill-b17-browser-physical-gates.v1.json`

Resultado:
- se reutilizan Browser Transversal Autonomy, Authorized Execution Device Profile, Identity Session Lifecycle, Credential Lifecycle y Physical Adapter Audit; no se crea provider/engine duplicado;
- configuración/perfil no valen como prueba física;
- atestación fresca sola tampoco: exige observación física bounded/fail-closed en LAB/PREPROD;
- kill-switch requerido, coste 0, no PROD/public mutation, no customer data, no Trading;
- campos inesperados de evidencia se rechazan para no aceptar tokens/secretos como prueba;
- targeted + current-truth + full CEREBRO regression GREEN;
- sintético prueba la lógica del gate, no la presencia física actual;
- el contexto de orquestación actual no puede observar la superficie física autorizada del Browser Bridge: `BLOCKED_EXTERNAL / PHYSICAL_EVIDENCE_PENDING`, no HUMAN_REQUIRED;
- el residual es local y no bloquea B18.

## PARCIAL / NO SOBREAFIRMAR
- `FULL_SAFE_PREPROD` no es PROD.
- El residual físico Browser/device se cerrará solo con evidencia PREPROD fresca real.
- PR #784 sigue sin merge automático autorizado.
- ARQUITECTO/PERFORMANCE mantienen su clasificación previa hasta su bloque correspondiente.

## next_block
`B18_LRN_MEASURED_ENGINEER_OUTCOME_LOOP`

1. Inventariar/reutilizar LRN, Safe Engineering, OLD vs NEW, QA/EVA/JDG, observabilidad y rollback existentes; no crear engine nuevo.
2. Elegir fixture PREPROD determinista/segura, sin customer data ni Trading, con baseline y defecto/mejora medibles.
3. Evidencia -> learning LRN trazable -> decisión de ingeniería gobernada -> cambio reversible.
4. Medir NEW con la misma métrica/contrato y ejecutar OLD vs NEW.
5. Evaluator/Tribunal independiente; rollback obligatorio ante no-mejora o regresión.
6. Exigir evidencia de siguiente ciclo para probar que el aprendizaje altera la próxima decisión.
7. Prohibido cerrar por metadata, plan-only, synthetic-only o self-judging.
8. Targeted + full regression + exact-head CI.

## HUMAN_REQUIRED
Únicamente `LEGAL_REQUIRED`, `SIGNATURE_REQUIRED`, `LOW_CONFIDENCE`, `HIGH_RISK`, `POLICY_CONFLICT`, `SECURITY_INCIDENT`, `MONEY_LIMIT`, `CUSTOMER_HUMAN_REQUEST`.
Actualmente: ninguno activo.

## SUPERLOOP / COMUNICACIÓN
- Continuar exactamente desde el estado persistido; no reiniciar ni repetir auditorías cerradas.
- Bucle: `EJECUTA -> PRUEBA -> CORRIGE -> VUELVE A PROBAR -> DOCUMENTA -> SIGUE CON EL SIGUIENTE BLOQUE LÓGICO`.
- En LAB/PREPROD resolver sin permiso toda acción segura/reversible.
- No detenerse tras commits, tests, CI, docs, hitos o errores reparables.
- Informar solo hitos importantes o ~20–30 min en una frase: `HECHO: [resultado]. AHORA: [siguiente bloque]. BLOQUEO: ninguno.`
- Después de informar, continuar sin esperar respuesta.
- Detenerse únicamente por HUMAN_REQUIRED canónico.
- Antes de saturación, actualizar este HANDOFF con HECHO/PARCIAL/PENDIENTE, rama, HEAD, commits, tests/CI, archivos, decisiones, next_block, problemas y estas mismas reglas.

## PROMPT EXACTO DE CONTINUIDAD
```text
CONTINÚA EXACTAMENTE DESDE DONDE ESTÁS. NO REINICIES, NO REPITAS AUDITORÍAS Y NO RECONSTRUYAS CONTEXTO.
Activa MODO SUPERLOOP: EJECUTA -> PRUEBA -> CORRIGE -> VUELVE A PROBAR -> DOCUMENTA -> SIGUE.
Repo: carlosjmunoz78/fenix-capital-inmo-map
Branch: cerebro/universal-skill-activation-factory-v1-20261017
PR: #784
Certified code head: a7df20aefca134086329273e9ee2be2aa3b6dd4a
PREPROD. Coste adicional 0 €. No PROD, no auto-merge, no Trading, no customer data.
B15, B16 y B17 están cerrados. No los reconstruyas.
Residual físico B17: BLOCKED_EXTERNAL / PHYSICAL_EVIDENCE_PENDING; no HUMAN_REQUIRED y no bloquea trabajo independiente.
Entra directamente en B18_LRN_MEASURED_ENGINEER_OUTCOME_LOOP y demuestra baseline -> LRN -> cambio de ingeniería -> NEW medido -> OLD vs NEW -> tribunal independiente -> aceptar o rollback -> siguiente ciclo.
Solo detente por HUMAN_REQUIRED canónico. Comunica muy poco y continúa después de cada hito.
```
