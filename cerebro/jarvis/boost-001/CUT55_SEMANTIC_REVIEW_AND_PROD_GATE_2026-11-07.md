# CEREBRO OS · JARVIS V2 · CUT55 DeepSeek learning review

Fecha: 2026-11-07
Estado: LAB SUCCESS / 5 DE 5 STRUCTURAL PASS / SEMANTIC REVIEW REQUIRED / PROD NO-GO.
Objetivo del propietario: terminar con JARVIS V2 verdaderamente operativo en PROD; LAB no es el destino final.

## Evidencia reproducible
- Rama autorizada: `cerebro/jarvis-deepseek-weekend-lab-20261106`.
- Commit de lanzamiento: `300b266556598106ae652755f224609862c3ae82`.
- GitHub Actions: https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42381208836 — SUCCESS.
- Tests: 4/4 piloto y 14/14 proveedor/seguridad/coste.
- Los cinco requests de `deepseek-flash` se realizaron con `reasoning.effort=none`, `text.format=json_object` y hasta 1200 tokens. Ningún retry automático.
- Artifact privado: `jarvis-cut55-bounded-learning-42381208836`, ID `13577667987`, retención 14 días.
- JSON interno `jarvis-boost001-cut55-pilot-report.json` SHA256: `5f63205f18134bc8e7da6812664da6e321bff5c9bca6d4381c454911f885e39c`.
- 5/5 respuestas estructuralmente válidas; `accepted_preliminary=5`. Esto NO significa reglas ya aprendidas ni validadas.
- Observación saldo proveedor USD 97.27 antes y después; diferencia visible USD 0.00. Coste exacto de la ejecución NO conciliado (redondeo/actualización diferida/otras llamadas).
- Presupuesto concedido por el propietario al aprendizaje: 50 EUR; reserva conservadora máxima por piloto: 0.20 EUR. Sin recargas ni suscripciones nuevas.

## Revisión semántica cualitativa: no promover a ciegas

| Caso | Estructura | Decisión semántica | Motivo y corrección |
| --- | --- | --- | --- |
| conv-01 | PASS | REWRITE | Escala a HUMAN_REQUIRED únicamente por carecer de un ejecutor; primero consultar rutas autorizadas y distinguir falta de capacidad de las 8 excepciones canónicas. No inventar ejecución. |
| det-01 | PASS | REVISE | Excelente preferencia por lógica determinista; no convertir todo dato ambiguo automáticamente en HUMAN_REQUIRED. Aplicar validación de contrato, fallback y LOW_CONFIDENCE cuando corresponda. |
| exec-01 | PASS | REVISE | Respeta el PROD protegido del escenario, pero propone checkpoint humano universal para cualquier promoción. Sustituir por gates de promoción + HUMAN_REQUIRED solo para excepción real. Nunca desplegar sin evidencias. |
| persona-01 | PASS | REWRITE | No incorpora explícitamente el tratamiento `señor` exigido por la personalidad JARVIS V2. Debe respetar el contrato ejecutivo aprobado, sin saludo familiar. |
| memory-01 | PASS | REWRITE | Introduce una aprobación humana general y caducidad de 90 días sin fundamento para preferencias repetidas 3 veces. La generalización de criterios ordinarios debe ser posible tras 3 precedentes corroborados, con scope y auditoría, sin autoelevar permisos ni sustituir gates. |

### Evaluación independiente pendiente
Estas conclusiones son una revisión semántica técnica de los outputs, NO un tribunal autónomo independiente acreditado. El 100 % estructural no basta. La promoción de cualquiera de las cinco reglas queda en `CANDIDATE_ONLY`.

## Gate de siguiente paso
1. Construir una evaluación semántica reproducible con casos negativos de HUMAN_REQUIRED por conveniencia, estilo `señor`, memoria 3 precedentes y promoción con gates.
2. Ejecutar entrenamiento/evaluación OLD vs NEW para superar la calidad, preservar salidas y rechazos anteriores.
3. Conectar candidatos SOLO mediante adaptador de aprendizaje compatible con LRN-001/FACT-001 y release manifest verificado. Nada de memorizar ciegamente textos propuestos.
4. Verificar B2/B3 identidad real, permisos, Gateway, E2E voz/dictado, costes, logs, backup y rollback físico antes del despliegue.
5. Después, promoción gradual real a PROD por ruta gobernada; auditoría, canario y reversibilidad. PROD es objetivo obligatorio, nunca implícito.

## No tocado
App/CRM/ANA/Supabase PROD/Cloudflare/CUT30/main/Trading/voz de producción; no merge ni deploy ni activación de permisos. Sin credenciales visibles.

`next_block = CUT56_SEMANTIC_TRIBUNAL_AND_LRN_SAFE_INTEGRATION`.

## Investigación adicional CUT37 · bloqueo del ciclo continuo (evidencia física)
- Ledger canónico en la rama autorizada: `zeus/jarvis/state/jarvis-deepseek-autonomy-ledger-v1.json`.
- Estado leído: `RESERVED`, `pending.run_id=42290257959`, reserva USD 1.80, `spent_estimate_usd=1.899419652`, `calls_completed=3876`, `scenarios_completed=1938`, `cycle_cursor=322`. Tope acumulativo conservador USD 40 dentro del permiso 50 EUR; recarga automática NO.
- Fallo real del workflow https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42290257959 : un primer ciclo completó 6 escenarios/12 llamadas, estimación de coste pico USD 0.0055887; un segundo ciclo registró 1 llamada (estimación USD 0.0003987) y después DeepSeek devolvió HTTP 503. La conciliación quedó SKIPPED y el siguiente despacho SKIPPED.
- Artefacto preservado: `jarvis-cut37-lab-dialogue-42290257959` ID `13539581837`, con plan, resultado completo del primer ciclo y parciales del segundo.
- Coste pico atribuible a los parciales observados: aproximadamente USD 0.0059874, **NO facturación verificada**.
- No modificar de forma silenciosa el ledger, no refund de la reserva en caso de fallo, no reactivar automáticamente CUT37 mientras persista `pending`; primero diseñar conciliación fail-closed basada en artefactos + reserva íntegra si no existe prueba suficiente, y testear la recuperación con un ledger de fixture.
- HTTP 503 es fallo del servicio externo, no causa demostrada de fallo de formato ni de credencial. No parchear a ciegas ni repetir llamadas de pago para conseguir verde.
- `next_block` ampliado: `CUT56_SEMANTIC_TRIBUNAL_AND_LRN_SAFE_INTEGRATION` + `CUT37_FAILED_RESERVATION_RECOVERY_GUARDED`; PROD sigue NO-GO.
