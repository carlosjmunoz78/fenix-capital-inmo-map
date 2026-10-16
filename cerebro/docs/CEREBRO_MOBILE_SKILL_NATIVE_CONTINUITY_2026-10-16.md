# CEREBRO OS · MOBILE SKILL NATIVE CONTINUITY · 2026-10-16

## Estado de contexto

Android Final V2 queda aparcado hasta 2026-10-19. No tocar el bloque físico Android durante la línea móvil salvo incidencia de seguridad real. El checkpoint canónico está en `cerebro/android-worker-final-v2/STATE.md`.

El propietario continuará desde el móvil en otro chat del mismo proyecto. El trabajo elegido debe ser ejecutable desde cloud/repositorios/conectores y no requerir presencia delante del PC.

## Regla de ejecución por lotes

Trabajar SIEMPRE en lotes de 4 capacidades. No abrir un quinto frente hasta cerrar las cuatro anteriores como NATIVAS/FULL, salvo bloqueo externo real documentado como HUMAN_REQUIRED permitido. Si una capacidad necesita intervención física del PC, no entra en un lote móvil.

Una capacidad solo cuenta como NATIVA/FULL cuando:

1. está registrada y versionada en FACT/Skill Registry;
2. tiene `company_id`, `engine_id`, `environment`, `version`;
3. dispone de manifest, contrato de entrada/salida y eventos;
4. permisos y policy fail-closed están definidos;
5. el engine la invoca a través de Gateway/Router, no por atajo acoplado;
6. existe implementación real o wrapper estable del proveedor elegido;
7. existe alternativa/fallback razonable cuando aplica y se respeta coste adicional 0 €;
8. hay tests unitarios, integración y E2E o equivalente verificable;
9. existe evaluación/Tribunal y comparación OLD vs NEW cuando reemplaza/complementa algo;
10. observabilidad, idempotencia, errores y coste están medidos;
11. rollback, backup y rebuild están definidos/probados según riesgo;
12. runbook, changelog, dependencias y estado de autonomía quedan actualizados;
13. PREPROD queda GREEN antes de cualquier promoción;
14. no se declara FULL con evidencia documental únicamente.

## LOTE MÓVIL 1 · ACTIVO AHORA

### 1. FACT-SKILL-NATIVE · Fábrica inteligente de skills
Cerrar FACT-001 para que una skill pueda ser descubierta/importada, deduplicada, evaluada, registrada, versionada, analizada por impacto, probada OLD vs NEW/shadow, promovida o revertida y documentada automáticamente.

Objetivo: que cada skill futura sea más barata y rápida de incorporar y no dependa de trabajo manual repetitivo.

### 2. GH-SAFE-NATIVE · GitHub Safe Engineering
Convertir las operaciones GitHub aprobadas en capability nativa gobernada: inventario de repo, ramas seguras, commits, PR, checks/CI, comparación, promoción gradual, rollback y evidencia. No romper relaciones existentes ni tocar PROD sin gates.

### 3. DB-SAFE-NATIVE · Supabase/PostgreSQL Safe Ops
Capability nativa para inspección, migraciones gobernadas, análisis de rendimiento, seguridad/RLS, backups lógicos/contratos, regresión, coste y rollback. Supabase sigue siendo core transaccional; no cargarle research/jobs/logs pesados.

### 4. EVT-001 · First-party Event Capture
Fabricar captura first-party normalizada y multiempresa para eventos web/app/CRM, con contrato canónico, dedupe/idempotencia, consentimiento/policy, unión posterior con CRM y base para atribución/learning. PostHog puede actuar como benchmark/provider si aporta valor sin crear dependencia innecesaria.

## LOTE MÓVIL 2 · solo cuando Lote 1 esté FULL

1. Research/Technology Scout nativo.
2. COMPET · Competitor Intelligence nativa.
3. CAP · Acquisition/Prospecting nativa.
4. LEAD · scoring + conversion probability + expected value + next best action.

## LOTE MÓVIL 3

1. SALE · cadencias email/WhatsApp/call + recheck.
2. HUMAN_REQUIRED Agent Inbox nativo.
3. Agenda/booking/reminder/reschedule/no-show recovery.
4. Propuesta/presupuesto/entrega post-compra gobernada.

## LOTE MÓVIL 4 · backend de voz, dejando aceptación física Android para el lunes

1. VOICE-001 routing y contratos.
2. STT local/free-first (Whisper/faster-whisper u opción equivalente aprobada).
3. TTS free-first (Qwen3-TTS u opción equivalente aprobada).
4. Call/voice-message orchestration: llamada perdida, cualificación, audio WhatsApp/Telegram y role/persona/policy del lado servidor. La grabación física de llamadas y permisos del terminal siguen aparcados con Android.

## LOTE MÓVIL 5

1. Ads audit.
2. Competitor ads scan.
3. SEO/Local SEO wrappers sin sustituir SEO-001.
4. Social audit + offline conversion feedback.

## LOTE MÓVIL 6

1. Watch/video understanding.
2. HyperFrames/video programático.
3. FFmpeg/OpenMontage composition.
4. ComfyUI/image workflow o alternativa que gane el FREE_PARITY_GATE.

## PRIORIDAD ALTA DIFERIDA · BROWSER-SAFE-NATIVE

Browser/Computer Use/Browser Bridge sigue siendo prioridad alta ya aprobada. No entra en el Lote Móvil 1 únicamente porque su aceptación física Desktop/Browser Bridge puede necesitar presencia delante del PC y podría bloquear la regla de cerrar 4/4 antes de avanzar. Debe entrar en el primer lote elegible cuando esa dependencia física deje de bloquear.

## Reglas permanentes

- `CONSERVAR → ENTENDER → ENVOLVER → PROBAR → MEJORAR → MIGRAR`.
- Nunca `BORRAR → REHACER → ESPERAR`.
- Coste adicional 0 € por defecto.
- No crear un motor por cada herramienta; skills/adapters/providers viven dentro de motores existentes.
- Toda operación ordinaria cubierta por contrato/policy/presupuesto debe ser no-prompt-by-default.
- No evadir MFA, CAPTCHA, permisos, consentimiento, controles antiabuso ni seguridad de terceros.
- HUMAN_REQUIRED únicamente para LEGAL_REQUIRED, SIGNATURE_REQUIRED, LOW_CONFIDENCE, HIGH_RISK, POLICY_CONFLICT, SECURITY_INCIDENT, MONEY_LIMIT, CUSTOMER_HUMAN_REQUEST.
- Trading permanece aislado.
- Mantener Engine Registry, contratos, dependencias, runbook, changelog, backup/rebuild y autonomía al día.

## Android · NO REABRIR HASTA LUNES

Checkpoint resumido:
- Final V2 `es.cerebro.agent` 2.1.0 / code 210 instalado y firmado permanentemente.
- Accessibility GREEN.
- Notification listener GREEN.
- enrollment APPROVED.
- Gateway agent ONLINE.
- HEALTH E2E GREEN y semantic_verified=true.
- CEREBRO ya ejecutó HOME y OPEN_APP Facebook; readbacks separados confirmaron launcher Samsung y `com.facebook.katana`.
- verificador semántico directo de acciones sigue PARCIAL: algunas acciones ejecutan correctamente pero requieren postcondition/readback separado.
- UI humana en español está modificada en source, todavía no instalada como update físico.
- V1/V2 antiguos se conservan como rollback.

Reanudación del lunes, en este orden:
1. Facebook ❤️ con long press + postcondition real.
2. WhatsApp E2E sancionado sin envío accidental.
3. reboot/reconnect/network recovery/idempotency/kill switch.
4. actualización in-place con misma firma/package, mayor versionCode y UI española.
5. cámara, micrófono, localización y auditoría del adapter de grabación de llamadas/transcripción.

## Prompt operativo para otro chat

Leer primero este documento y el estado canónico del proyecto. No reconstruir por memoria. No reabrir Android antes del 2026-10-19. Trabajar únicamente en `LOTE MÓVIL 1`, de una capacidad a la vez pero manteniendo el lote cerrado de cuatro. Llevar cada capacidad desde inventario y contratos hasta implementación, tests, evaluación, PREPROD, rollback/rebuild, documentación y evidencia NATIVA/FULL. No pasar al Lote 2 hasta que las cuatro estén FULL. Ejecutar todo lo que sea posible mediante conectores/cloud/repositorios sin pedir al propietario que use el PC. Parar únicamente ante HUMAN_REQUIRED real. Antes de saturación, exportar un nuevo paquete de continuidad completo.