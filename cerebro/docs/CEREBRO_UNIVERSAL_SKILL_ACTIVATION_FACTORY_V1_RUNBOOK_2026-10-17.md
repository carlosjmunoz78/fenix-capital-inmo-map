# CEREBRO OS · Universal Skill Activation Factory V1 · RUNBOOK

## Contexto
Repo: `carlosjmunoz78/fenix-capital-inmo-map`
Branch: `cerebro/universal-skill-activation-factory-v1-20261017`
PR: `#784`
Último código certificado: `48feedf2e932d38ce74bf5c9663e53ed69a10d98`
Entorno autorizado: `PREPROD`.

## Inicio / reanudación
1. Leer HANDOFF, MASTER, RUNBOOK y state.
2. Comprobar HEAD de branch y PR #784.
3. Comprobar CI exact-head.
4. Si HEAD coincide con `certified_code_head_sha`, entrar directamente en `next_block`.
5. Si no coincide, comparar delta y validar solo la evidencia afectada; no rehacer auditorías completas sin causa.

## Gates de la Factory
- provenance/license
- capability/domain classification
- canonical engine mapping
- exact semantic contract
- safe wrapper/adapter
- real semantic binding
- OLD vs NEW
- QA/EVA/independent Tribunal
- LRN/OBSERV/FINOPS
- backup/rollback/rebuild
- physical PREPROD when required

## Tests principales
- `node --test cerebro/tests/universal-skill-*.test.mjs`
- `node --test cerebro/tests/cerebro-math-solver-profile-v1.test.mjs`
- Full: `node --test cerebro/tests/*.test.mjs`

No considerar GREEN hasta que los workflows exact-head relevantes estén SUCCESS. No interpretar un workflow antiguo como evidencia del HEAD nuevo.

## Anti-loop
Ante fallo:
1. leer evidencia/log exacto;
2. aislar causa;
3. cambiar una variable;
4. ejecutar test enfocado;
5. ejecutar regresión afectada/full según alcance;
6. documentar.
Tras tres fallos de la misma familia, reevaluar estructura antes de repetir.

## Seguridad
- No direct-main write.
- No auto-merge.
- No PROD mutation/publish/deploy.
- No raw external skill code execution salvo contrato futuro explícito y gobernado.
- No instalaciones/dependencias silenciosas.
- No gasto incremental automático.
- Trading aislado.
- HUMAN_REQUIRED solo: LEGAL_REQUIRED, SIGNATURE_REQUIRED, LOW_CONFIDENCE, HIGH_RISK, POLICY_CONFLICT, SECURITY_INCIDENT, MONEY_LIMIT, CUSTOMER_HUMAN_REQUEST.

## Rollback
Todos los cambios de esta misión permanecen en la branch/PR hasta promoción gobernada. Para un bloque defectuoso, restaurar el parent exacto del commit del bloque o revertir el commit en la rama; nunca arreglar alterando PROD. Confirmar después tests/regresión y reconstruibilidad.

## Continuidad preventiva
Actualizar HANDOFF/MASTER/RUNBOOK/state antes de saturación del chat o después de un cambio arquitectónico importante. Deben contener: branch, PR, último código certificado, CI, HECHO/PARCIAL/POR AUDITAR, next_block, reglas de comunicación y prompt exacto de siguiente chat.

## Comunicación
No usar al usuario como conductor. Trabajar continuamente. Solo hitos relevantes, una frase, alias-first. Formato: `Hito GREEN: X; sigo con Y.` Un rojo ordinario se corrige sin interrumpir; escalar solo HUMAN_REQUIRED real o decisión estratégica nueva.
