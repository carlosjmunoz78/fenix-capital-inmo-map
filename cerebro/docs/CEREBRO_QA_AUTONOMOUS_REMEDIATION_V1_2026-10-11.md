# CEREBRO QA · AUTONOMOUS REMEDIATION V1 · 2026-10-11

## Estado

- **EXISTENTE:** QA-001, QAB-001, REG-001, SELF-001, LRN-001, EVA-001, JDG-001, HCI-001 y los owners APP-001 / WEB-001 / SEO-001 / MKT-001.
- **HECHO EN ESTE CAMBIO:** observación humana read-only enriquecida, scout determinista de mejoras, routing de bugs y mejoras a candidatos versionados PREPROD compatibles con la fábrica RSI existente y resumen diario de mejora continua.
- **NO CAMBIA:** autoridad de escritura de APP/WEB/SEO/MKT en PROD. Siguen asistidos donde ya lo estaban.
- **POR AUDITAR:** harness autenticado sintético de App PREPROD y objetivo canónico PREPROD de productos digitales.

## Regla de conservación

Este cambio aplica CONSERVAR → ENTENDER → ENVOLVER → PROBAR → MEJORAR → MIGRAR. No sustituye QA-001 ni crea un motor paralelo para la misma función. Envuelve el estado existente de QA-001 y reutiliza el contrato de candidatos de mejora RSI ya operativo.

## Inventario y dependencias

Entradas: `tests/cerebro-human-readonly.spec.ts`, `cerebro/qa/quality-delta.mjs`, `cerebro/qa/targets.v0.json`, estado persistido `cerebro/runtime/qa-daily-quality-state.v0.json` en la rama dedicada de estado.

Nuevos componentes: `cerebro/qa/improvement-scout.mjs`, `cerebro/qa/autonomous-remediation-loop.mjs`, `cerebro/qa/autonomous-remediation-loop.contract.v0.json`, tests asociados y persistencia de `qa-improvement-scout.v0.json` + `qa-remediation-state.v0.json` en la misma rama de estado.

Dependencias reutilizadas: Playwright existente, Node 24, `improvement-candidate-factory.mjs`, `continuous-improvement-contract.mjs`, GitHub Actions existente y el correo ejecutivo ya conectado a QA.

Dependencias nuevas de pago: ninguna. Coste adicional objetivo y contractual: 0 €.

## Contrato actual

1. PROD solo se navega en modo READ_ONLY público.
2. No se envían formularios ni se realizan mutaciones de negocio.
3. No se usan datos de clientes.
4. No se toca Trading.
5. Cada bug se convierte en caso con reproducción, test de regresión permanente, OLD vs NEW, PREPROD, juez independiente, rollback y rebuild como gates obligatorios.
6. Cada oportunidad de mejora nace de una observación medible; no se afirma un defecto sin evidencia.
7. APP/WEB/SEO/MKT no reciben autoridad automática de escritura en PROD por este cambio.
8. Hallazgos de seguridad o cambios potencialmente destructivos fallan cerrados con HUMAN_REQUIRED canónico.

## Flujo operativo

`DISCOVER → HUMAN_READONLY_OBSERVE → DETECT BUG / IMPROVEMENT → OWNER ROUTE → LRN COMPATIBLE RECORD → VERSIONED PREPROD CANDIDATE → OLD VS NEW → PREPROD → JUDGE → PROMOTION GATE → LEARN → RETEST`.

El workflow `CEREBRO Continuous Human QA V0` se ejecuta en `main` y también por cron cada cuatro horas. Primero mide, luego descubre mejoras, después construye el handoff PREPROD y finalmente persiste solo evidencia QA en la rama de estado dedicada.

## Qué puede mejorar aunque nada esté roto

El scout mide de forma read-only señales como landmark principal, jerarquía H1, controles sin nombre accesible, inputs sin label, imágenes sin `alt`, objetivos táctiles pequeños, overflow horizontal, CTA detectable y duración del recorrido. Estas señales generan candidatas PREPROD; no generan cambios de producción directos.

## Tests y OLD vs NEW

Tests deterministas incluidos:

- estado QA GREEN / fallo nuevo / resolución / reincidencia;
- scout de mejoras con señales humanas observadas;
- routing normal a candidato PREPROD;
- fail-closed a `SECURITY_INCIDENT`;
- reutilización del contrato RSI de candidato versionado;
- enriquecimiento del email diario con mejora continua.

La calidad mantiene `previous_quality_score`, `quality_score` y `quality_delta`. Los candidatos mantienen `baseline_version`, `candidate_version` y `next_gate=OLD_VS_NEW_EXPERIMENT`.

## Backup, rollback y rebuild

Backup lógico: el estado previo se conserva en `state.before.json` durante cada ejecución y la evidencia queda en artifacts de GitHub Actions durante 30 días. La rama `cerebro/qa-state-v0` conserva el estado canónico fuera de la rama de código.

Rollback de código: revertir el PR de esta versión devuelve el workflow y los tests al comportamiento previo sin tocar datos de negocio. Los archivos nuevos de estado dejan de actualizarse pero no alteran el estado histórico de calidad.

Rebuild: ejecutar de nuevo `CEREBRO Continuous Human QA V0` reconstruye `state.after.json`, `improvements.json` y `remediation.json` exclusivamente desde código versionado + estado QA anterior + evidencia Playwright viva.

## Engine Registry

No se añade ningún `engine_id`. El Engine Registry existente se conserva. Este cambio solo amplía operativamente QA-001 / SELF-001 y enruta a motores ya registrados. Por tanto el `count` y la lista maestra de IDs no deben cambiar.

## Estado de autonomía

- QA read-only público: **HECHO / AUTÓNOMO SEGURO**.
- Descubrimiento de mejoras medibles: **HECHO / AUTÓNOMO SEGURO**.
- Creación de learning records y candidatos PREPROD: **HECHO / AUTÓNOMO SEGURO**.
- Corrección arbitraria de código APP/WEB sin revisión: **NO AUTORIZADA**.
- Promoción a PROD: **NO AUTORIZADA por este cambio**; requiere todos los gates del motor propietario.
- App autenticada PREPROD: **POR AUDITAR**.
- Productos digitales PREPROD: **POR AUDITAR**.

## Changelog

2026-10-11: se añade el cierre de triage QA hacia candidatas PREPROD y un scout de mejora continua basado en observaciones humanas read-only, sin nuevas suscripciones, sin permisos de PROD y sin reemplazar motores existentes.
