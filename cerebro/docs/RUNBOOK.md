# CEREBRO OS · RUNBOOK V0

## Standard safe loop

1. CONSERVAR: inventory current behavior/contracts and identify exact HEAD/version.
2. ENTENDER: map dependencies, company scope, permissions, policies and risk boundaries.
3. ENVOLVER: add wrappers/reference code without replacing existing App/CRM/Supabase/Notion/WordPress/SEO/Training/Trading.
4. PROBAR: run deterministic tests and PREPROD gates.
5. MEJORAR: fix every red/P1/P2 with a regression test; rerun on the exact new HEAD.
6. MIGRAR: only after clean tribunal/review, merge with expected HEAD SHA; verify exact-SHA post-merge PROD deploy/smoke where applicable.

## Required PREPROD gate

For CEREBRO repository changes require:
- `CEREBRO Factory PREPROD` completed success.
- `PRE-PROD App Build` completed success.
- Clean review/tribunal on the exact HEAD, with no unresolved P1/P2.
- PR open, non-draft, mergeable and exact expected head.

## Post-merge safety gate

After merge to `main`:
- capture the merge SHA;
- require `PROD Live Deploy` success on that exact SHA;
- require `PROD Runtime Smoke` success on that exact SHA;
- if either is red, **do not claim green and execute rollback immediately when a failed deploy/smoke may have exposed a bad production snapshot**.

Canonical rollback procedure: repository-level `docs/PROD_ROLLBACK_RUNBOOK.md`.

Emergency sequence:
1. Identify the last known-good `main` SHA and the offending merge/commit.
2. Run `PROD Rollback Rehearsal` against the known-good SHA and require green.
3. Create a rollback branch from current `main`.
4. Revert only the offending commit(s); never reset or rewrite `main` history and never hand-edit/force-push `gh-pages`.
5. Open a rollback PR and require PREPROD build, Browser QA and smoke green.
6. Merge the rollback PR.
7. Require `PROD Live Deploy` success on the new revert SHA.
8. Require `PROD Runtime Smoke` success and exact deployed SHA on that same revert SHA.
9. Verify the reported user-visible production failure is gone.
10. Diagnose/fix forward on a separate branch through the normal PREPROD → review → merge → PROD → smoke sequence.

## Runtime boundaries

- V0 CEREBRO runtime/multi-company/console code is PREPROD-only unless a later promotion contract explicitly changes that boundary.
- No direct Supabase writes from these reference V0 paths.
- No direct model access from Console; use the Gateway boundary.
- No Trading credentials or execution resources may cross into App/CRM/CEREBRO PROD.
- Cross-company access defaults to deny.

## HUMAN_REQUIRED

HUMAN_REQUIRED_SET: `["LEGAL_REQUIRED","SIGNATURE_REQUIRED","LOW_CONFIDENCE","HIGH_RISK","POLICY_CONFLICT","SECURITY_INCIDENT","MONEY_LIMIT","CUSTOMER_HUMAN_REQUEST"]`.

## Failure handling

- Preserve original error where possible.
- Audit attempted command/chat failures separately from successes.
- Do not mutate engine/session state before validating/cloning the evidence/result required for the transition.
- Do not mark an engine GREEN from missing, stale or historical-only evidence.

## Rebuild smoke

```bash
cd cerebro
npm test
npm run validate
npm run generate -- --out ./.cerebro-generated
```

Generated Factory output is disposable; canonical sources are registry seed + factory/runtime/multicompany/console code and their tests.

## Explicit Learning V1 · safe preference changes

- Una corrección conversacional de estilo puede aplicarse solo a la sesión sin escritura durable.
- Persistencia durable solo con orden explícita del usuario; nunca inferir silenciosamente una preferencia permanente.
- Toda preferencia durable debe conservar `actor_code`, `company_id`, categoría, key, versión, fuente explícita y lineage `supersedes`.
- No almacenar audio, transcripciones completas, secretos, credenciales ni datos pesados en `cerebro_user_preferences`.
- Una preferencia nunca amplía permisos ni sustituye HUMAN_REQUIRED, política, seguridad, firma, obligación legal o límite económico.
- Rollback ordinario: revertir código/Gateway; no borrar la tabla ni el historial de preferencias. Borrado destructivo requiere snapshot/export, evaluación separada y autorización explícita.
- Tras DDL de preferencias ejecutar advisors de seguridad y rendimiento; corregir avisos nuevos atribuibles al cambio antes de cerrar promoción.


## Conversational Learning V1 · runbook

- Considerar automáticamente para memoria cada turno significativo del propietario, pero persistir solo si supera los filtros de sensibilidad y ruido.
- No guardar audio ni promover respuestas del asistente como conocimiento del propietario por el mero hecho de haber sido generadas.
- Los valores sensibles deben omitirse de la memoria general y permanecer en sus sistemas específicos cuando proceda.
- El estado operativo vivo y las fuentes canónicas tienen prioridad sobre recuerdos conversacionales; un recuerdo no puede sobrescribir silenciosamente CRM, Supabase, Notion u otra fuente autoritativa.
- Consultas de recuerdo no deben escribirse como nuevo conocimiento, para evitar auto-contaminación.
- Duplicados exactos incrementan `seen_count`; no deben crear filas equivalentes.
- Para olvido temático usar la ruta de desactivación; conservar la trazabilidad técnica salvo que exista una solicitud explícita de borrado destructivo y su procedimiento legal/técnico correspondiente.
- Rollback ordinario: revertir frontend/Gateway al source anterior y dejar la tabla aditiva inactiva; no destruir historial durante un rollback técnico.
- Después de cualquier DDL de memoria ejecutar advisors de seguridad/rendimiento y corregir regresiones nuevas atribuibles al cambio.

### Aceptación física
1. Introducir un hecho nuevo, inocuo y único en CEREBRO.
2. Recargar o abrir una nueva sesión.
3. Preguntar «¿qué te dije sobre <tema>?» y verificar recuperación exacta suficiente.
4. Ordenar «olvida lo que te dije sobre <tema>».
5. Repetir la consulta y comprobar que el recuerdo activo ya no se devuelve.
6. Escuchar una pregunta, una confirmación y una enumeración para validar variación de entonación sin ralentización global.


## Spoken Summary V1 · runbook

- Mantener siempre separadas la respuesta escrita completa y la salida hablada resumida.
- No pronunciar enlaces completos, hashes largos ni marcadores de formato cuando el dato puede quedar visible por escrito.
- Si existen enlaces, mantenerlos completos en pantalla y decir únicamente «te dejo el enlace por escrito» o equivalente.
- Eliminar del habla marcadores de lista como `1.`, `2.`, `-` o viñetas; el contenido sí puede resumirse.
- En respuestas largas, hablar solo las primeras ideas relevantes y avisar de que el detalle completo está escrito.
- En propuestas de acción, no resumir fuera la decisión crítica: destinatario/alcance relevante y pregunta de confirmación deben seguir siendo comprensibles.
- Un resumen hablado nunca puede modificar el significado, ampliar permisos ni transformar una no-ejecución en una afirmación de éxito.
- Rollback de presentación: volver al source frontend anterior `374bd89d7e8ee97a26b3bdcf1bb5249a613489be`; Gateway/memoria no requieren rollback para este cambio frontend-only.

### Aceptación física mínima
1. Pedir una respuesta con lista numerada y confirmar que no pronuncia «uno punto/dos punto».
2. Pedir una respuesta que incluya un enlace y confirmar que no lee el enlace completo; debe indicar que queda escrito.
3. Pedir una respuesta larga y confirmar que habla un resumen, mientras el texto completo sigue visible.
4. Probar una acción con confirmación y verificar que la pregunta de confirmación sigue oyéndose claramente.


## Spoken Summary V2 · acceptance

- La respuesta escrita sigue siendo el registro completo; la voz es una capa de síntesis.
- Priorizar intención y estado estructurados sobre simple posición de frases.
- No verbalizar identificadores técnicos largos, enlaces completos ni correos completos salvo necesidad explícita y segura.
- Mantener audible cualquier negación, fallo, bloqueo, riesgo o confirmación requerida.
- Para listas, convertir elementos seleccionados en frase natural («Lo principal es…») y dejar el resto escrito.
- Para acciones, conservar contexto suficiente para entender qué se propone y mantener la pregunta final de confirmación.
- Rollback de presentación: `b64050f0320f31e1685fa028744e73e5920c8655`.

### Prueba física V2
1. Pedir una respuesta técnica larga: no debe recitar SHA/PR/runs.
2. Pedir próxima publicación social: debe decir red/fecha y remitir texto e imagen a pantalla.
3. Pedir un contacto con varios correos: debe resumir opciones sin leer direcciones completas.
4. Preparar un correo: debe decir destinatario/asunto, dejar cuerpo escrito y preguntar confirmación.
5. Provocar una respuesta normal con lista: debe sonar como frase natural, no enumeración mecánica.


## Verbal Barge-in V1 + Spoken Digest V3 · runbook

- Mientras CEREBRO habla, mantener un recognizer separado del recognizer conversacional normal.
- Ese recognizer no envía texto al Gateway: solo puede cancelar TTS cuando la frase normalizada coincide con el vocabulario cerrado de interrupción.
- No usar matching por substring para «para»; debe evitarse que «para Belén», «para mañana» o «prepara» silencien accidentalmente la respuesta.
- Tras una interrupción válida: cancelar TTS, cerrar el recognizer de barge-in y reabrir la escucha conversacional.
- Si el navegador no permite STT concurrente con TTS, conservar siempre el botón visible como fallback; no declarar barge-in físico operativo sin prueba real.
- Spoken Digest V3 debe hablar una sola idea principal en prosa ordinaria, salvo listas/accciones donde haga falta más contexto.
- Los fallos, negaciones, riesgos y preguntas de confirmación siguen siendo contenido oral prioritario.
- Rollback frontend: `f670d65136b8a09630ab5183d23961fea098af24`.

### Aceptación física mínima
1. Iniciar voz y pedir una respuesta suficientemente larga.
2. Mientras CEREBRO habla, decir «para». Debe callarse y volver a escuchar sin pulsar ningún botón.
3. Repetir con «stop» y «calla».
4. Pedir algo que contenga «para Belén» y comprobar que esa frase no activa una interrupción falsa.
5. Comparar una respuesta normal larga con V2: V3 debe hablar solo la idea principal y dejar el detalle escrito.


## Local VAD Barge-in V2 · runbook

- No depender de reconocimiento semántico simultáneo mientras TTS reproduce audio.
- Mientras CEREBRO habla, abrir VAD local con micrófono y Web Audio API.
- Calibrar ruido de fondo antes de TTS y eco residual al inicio de la locución.
- Interrumpir solo tras actividad sostenida por encima del umbral adaptativo; ignorar picos breves.
- Al detectar voz: cancelar TTS, cerrar VAD y reabrir `SpeechRecognition` normal.
- Mantener siempre el botón visible como fallback.
- Rollback frontend: `d8b89b4f1f541d5d7ebea1ab5fd5cd8446a4bc43`.

### Aceptación física
1. Pedir una respuesta larga.
2. Mientras habla, empezar a decir «para» o cualquier frase.
3. Debe callarse sin tocar botones.
4. Debe volver a escucharte inmediatamente.
5. Repetir con volumen normal y comprobar que el propio altavoz no provoca cortes falsos.
