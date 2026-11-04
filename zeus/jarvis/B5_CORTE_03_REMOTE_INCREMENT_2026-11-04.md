# ZEUS / JARVIS · B5 CORTE 03 · INCREMENTO REMOTO PROBADO
Fecha: 2026-11-04 (Europe/Madrid). Estado: **PARCIAL, CI GREEN; PROD NO OPERATIVO**.

## Continuidad desde el corte canónico
Se leyó el ZIP de Biblioteca `ZEUS_JARVIS_TRASPASO_TOTAL_B5_PROD_READY_2026-11-04.zip`, íntegro, con B5 Corte 02 y plan de 10 macrobloques. No se rehízo B1–B4 ni se tocó `main`, `src/cerebroVoice.ts`, PR #12, App, CRM, WordPress, DNS o Trading. La rama B5 sigue dependiendo de PR #14 y ésta de PR #13, todas DRAFT.

## Código realmente añadido/corregido
- `core/jarvis-b5-guarded-preview.mjs`: envoltorio **PREVIEW_ONLY** con identidad B2, ámbito owner/tenant/session, control B5 y permiso B3 inyectados, auditoría previa y respuesta sin capacidad de mutación. STOP local no depende de autenticación; ningún transcript/secret entra en el audit.
- `core/jarvis-b5-guarded-preview.test.mjs`: 17 casos adversarios aislados.
- `core/jarvis-b5-cut03-integration.test.mjs`: 9 casos usando el compilador, adaptador Web Speech y diálogo B5 reales (solo los adaptadores de auth y audit son mocks).
- `core/jarvis-b5-model-router.mjs`: DENY ante supuesto LOCAL con coste marginal >0; el balance y el ledger deben corresponder a `companyId` y `environment`. Balance real verificado con marca temporal válida de los últimos **15 minutos** (sin fechas futuras).
- `core/jarvis-b5-cut03-budget.test.mjs`: 9 casos adversarios de coste, caducidad y aislamiento presupuestario. El router sigue siendo **preview**; no reserva ni llama API.
- `core/jarvis-b6-capability-preflight.mjs`: planificación, sin ejecución, sobre el registro de capacidades existente; coste 0, aislamiento tenant, permisos B3 y prioridad API → MCP → CLI → BROWSER; 13 tests.
- `core/jarvis-b9-resilience-decision.mjs`: decisión sin ejecutar para anti-loop tras 3 fallos iguales, bloqueo ante AUTH/CREDENTIALS/POLICY/PERMISSIONS, límite económico y excepciones HUMAN_REQUIRED; 12 tests.

## Evidencia reproducible
Código antes de documentación, último commit: `8725eff93c159693116b506330e02e7721ef7b32`.
Workflow JARVIS LAB `41743864577`: **229/229 PASS, 0 FAIL**, obtenido de logs reales.
Workflow CEREBRO Governed Main Integration `41743864470`: **SUCCESS**; el paso de promoción real está **SKIPPED** por los controles.
Sin nuevas suscripciones, sin llamadas DeepSeek, sin gastos de modelos, sin llamadas reales de audio, sin escrituras B4.
Rollback del código: revertir los commits exclusivos posteriores a `95097b7944f1ff72f428f5b7d3725c84667b6c5a` en PR #15. Nunca eliminar tablas B3/B4 ni cambiar su flag por el rollback del código.

## Estado BLOQUES 1–10
| Bloque | Estado | Avance o bloqueo real |
|---|---|---|
| B1 | EXISTENTE/CERRADO documental | Conservar |
| B2 | PARCIAL | OWNER_ROOT autenticado, misión durable, recuperación y E2E PC+móvil |
| B3 | PARCIAL PROD LOCKED | Vault/grants reales, revocación y auditoría E2E |
| B4 | PARCIAL PROD LOCKED | concurrencia PostgreSQL real, retención, backup físico + restore |
| B5 | PARCIAL LAB/CI 229 PASS | preview segura; STT/TTS reales, B2/B3, Gateway y benchmark pendientes |
| B6 | PARCIAL LAB | preflight de capacidades; ninguna herramienta real invocada |
| B7 | DEFINIDO / POR AUDITAR | reutilizar FACT-001, workers compartidos, evaluación y tribunal; no crear infraestructura duplicada |
| B8 | PARCIAL en tests / NO OPERATIVO | test tenant en B5/B6, falta E2E real dos empresas y delegación |
| B9 | PARCIAL LAB | helper anti-loop, falta watchdog/observabilidad/recuperación/DR ensayado |
| B10 | PLANIFICADO / NO-GO | activación por capacidades solo tras certificación y pruebas físicas |

## Gates NO-GO concretos
1. Verificar OWNER_ROOT en Auth server-side y misión estable entre dos dispositivos; no aceptar claims frontend.
2. Contratos B3 + grants reales + Vault, revocación y auditoría de permisos.
3. Backups/restauración reales B4, ensayo con PostgreSQL concurrente, GDPR/retención y aislamiento.
4. Audio con consentimiento real en navegador y móvil (STT/TTS y latencia); preservar `src/cerebroVoice.ts`; comparar OLD vs NEW.
5. DeepSeek: saldo real por proveedor, secreto seguro y permiso B3, consentimiento/DLP, reserva **atómica** y conciliación. Hasta entonces 0 llamadas; presupuesto el menor de 50 EUR y saldo verificado; sin recargas automáticas.
6. Endpoint Gateway aislado bajo flags OFF, QA/tribunal/observabilidad y restore/rollback probado antes de promover cualquier capacidad real.
7. Respetar `company_id`, `engine_id`, `environment`, `version` y workers compartidos.

## Siguiente acción
Continuar la verificación REMOTA de contratos B2/B3/B4, hacer E2E de PostgreSQL/backup solamente en entorno aislado con copia restaurable y sin coste nuevo, y catalogar STT/TTS gratuitos. Reservar para PC/MFA las pruebas físicas de navegador, micro y dos dispositivos; no declarar B5/B6/B9 PROD.
