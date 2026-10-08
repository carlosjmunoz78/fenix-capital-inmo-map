# CEREBRO OS · DEPENDENCY MAP

## Structural chain

`FACT-001 → GOV-001 → shared contracts/runtime → Phase 2 bindings → Phase 3 zero-cost platform → Phase 4 multi-company bootstrap → Phase 5 Console/Gateway → Governance V0 → persistent EVT/JOB reference`

## Existing-system preservation boundary

CEREBRO code under `cerebro/` wraps and references existing systems; it does not replace their runtime contracts. Evidence status is tracked separately from binding existence in `evidence/phase2-existing-bindings-audit.json`.

## Phase 2 bindings + current evidence state

- `CORE-001` → existing core/app contracts → `DOCUMENTED_PARTIAL`; no formal live CEREBRO Core claim.
- `SUP-001` → governance/supervision source surfaces → `DOCUMENTED_PARTIAL`; dedicated live supervisor audit still required.
- `TRN-001` → knowledge/training source surfaces → `DOCUMENTED_PARTIAL`; no autonomous training-engine claim.
- `APP-001` → existing App Fénix contracts → `CONFIRMED_OPERATIONAL` for the existing App surface only, via exact-SHA PROD deploy/smoke on `6bf6af92c1106884da87fb9a659f807093d47e0a`; this is not CEREBRO autonomy.
- `CRM-001` → CRM/Supabase boundary → `UNKNOWN_REQUIRES_AUDIT`.
- `DOC-001` → document contracts and previously green document/backfill scope → `DOCUMENTED_PARTIAL`; full DOC engine not proven.
- `SEO-001` → SEO contract target → `UNKNOWN_REQUIRES_AUDIT`.
- `WEB-001` → WordPress/web contract target → `UNKNOWN_REQUIRES_AUDIT` and must be audited in its own system/repository.
- `LAB-TRD` → Trading LAB → `UNKNOWN_REQUIRES_AUDIT`, explicitly isolated from App/CRM/CEREBRO PROD credentials and execution.

## Phase 3

- `RUNTIME-001` supplies shared execution semantics for reference engines.
- `EVT-001` supplies event/outbox-inbox semantics and now has an additive persistent local/self-hosted PREPROD single-writer adapter. It is not yet wired as a replacement for the in-memory runtime.
- `JOB-001` supplies job semantics and now has an additive persistent local/self-hosted PREPROD single-writer adapter with durable abandoned-claim recovery on reopen. It is not yet wired as a replacement for the in-memory runtime.
- `FINOPS-001` enforces additional-budget target 0 € and `MONEY_LIMIT` escalation.
- `DBOFF-001`, `STOROFF-001`, `FREE-001`, `AIBUD-001` remain defined contracts/targets.

## Governance V0

- `POL-001` evaluates versioned policy deterministically and fail-closed in PREPROD reference scope.
- `HEX-001` routes canonical HUMAN_REQUIRED exceptions with stable event identity and tenant isolation.
- Governance does not by itself authorize autonomous PROD execution.

## Phase 4 graph

The multi-company bootstrap contains exactly 17 canonical engines. `ENGACT-001` depends on `TENANT-001` being GREEN before activation becomes READY. All Phase 4 execution remains PREPROD-only in V0 and cannot autonomously promote to PROD.

## Phase 5 graph

- `CONSOLE-001`: console/session surface.
- `CTX-001`: company/context selection boundary.
- `CMD-001`: command execution surface.
- `CHAT-001`: chat surface.
- `ACTGW-001`: mandatory CEREBRO Gateway mediation boundary.

Commands and chat are Gateway-mediated; direct model access is forbidden by contract. Session `company_id`, `environment`, and `version` are authoritative and cannot be overridden by caller context.

## Shared safety dependencies

Every promoted engine must retain: contracts, permissions, tests, evaluation, tribunal, observability, backup, rollback, rebuild, measured cost, policy and PREPROD evidence. Green scaffold/reference or read-only audit status is not equivalent to autonomous production readiness.

Before wiring persistent `EVT-001`/`JOB-001` into `SharedRuntime`, require explicit OLD-vs-NEW comparison, rollback path, dependency review and multi-process/shared-worker safety design. The current persistent adapters remain parallel by design.

## VOICE-001 / Explicit Learning V1 · 2026-10-01

- `VOICE-001` remains browser-native for STT/TTS and therefore adds no paid voice service.
- Persistent interaction preferences follow: `CONSOLE-001 → ACTGW-001 → server-only preference RPC → fenix_prod.cerebro_user_preferences`.
- The preference store is actor/company scoped, versioned and auditable; anonymous/authenticated direct table/RPC access is denied.
- Durable learning is explicit only. Session corrections may be applied ephemerally; persistence requires an explicit instruction such as `guárdalo`, `recuérdalo` or `a partir de ahora...`.
- Existing `fenix-memory-api` is preserved for entity/CRM relationship memory and is not replaced or overloaded by this preference layer.
- Preference writes are a narrowly scoped exception to the Console reference rule of no operational Supabase writes; they do not authorize business-action writes, permission changes or autonomous PROD execution.

## Conversational Learning + Dynamic Prosody V1 · 2026-10-01

- Flujo de memoria: `CONSOLE-001 → ACTGW-001 → RPC server-only → fenix_prod.cerebro_conversation_memory`.
- Cada recuerdo queda acotado por actor/company y registra `engine_id`, `environment` y `version`; no sustituye la memoria de entidades/CRM ni el conocimiento canónico de Notion.
- Los turnos relevantes y no sensibles del propietario se observan automáticamente; los duplicados se consolidan mediante hash y `seen_count`.
- Las consultas explícitas de recuerdo pueden recuperar memoria conversacional de sesiones anteriores. Para estado operativo, las fuentes vivas/canónicas conservan prioridad sobre recuerdos de conversación.
- Audio y valores sensibles quedan fuera de esta memoria general.
- La voz mantiene el ritmo base existente y añade prosodia determinista por segmentos mediante `speechSynthesis`: pequeñas variaciones de rate/pitch para preguntas, confirmaciones, listas y mensajes de riesgo.
- Estas escrituras internas de aprendizaje son una excepción acotada de service-role; no habilitan escrituras de negocio, ampliación de permisos ni autonomía PROD.
- `fenix-memory-api` existente permanece intacta para memoria relacional/CRM; no se sustituye.

## Spoken Summary V1 · 2026-10-01

- Salida escrita y salida hablada quedan separadas: `Gateway response → full written UI response → deterministic spoken summary → prosody segments → browser speechSynthesis`.
- La respuesta escrita conserva el detalle completo. La voz selecciona una síntesis corta y conversacional.
- Los enlaces se mantienen visibles/clicables en pantalla, pero se eliminan del TTS y se sustituyen por «te dejo el enlace por escrito».
- Los marcadores de enumeración se suprimen del canal hablado.
- Para acciones pendientes, el resumen hablado conserva la pregunta final de confirmación; esta capa no reduce ni amplía permisos.

## Spoken Summary V2 · 2026-10-01

- Flujo: `Gateway structured response → full written response → intent/status aware spoken summarizer → prosody segmentation → browser speechSynthesis`.
- No se añade un modelo ni una API de voz: la mejora reutiliza metadatos de la respuesta y reglas deterministas.
- `action` y `read_context` solo informan la presentación hablada; no alteran permisos, confirmaciones ni ejecución.
- El resumen hablado es una vista derivada. Nunca sustituye el mensaje escrito como evidencia completa.

## Verbal Barge-in V1 + Spoken Digest V3 · 2026-10-01

- Flujo normal: `microphone → SpeechRecognition → Gateway → written response → spoken digest → speechSynthesis`.
- Mientras TTS habla, un listener de voz acotado detecta únicamente órdenes de interrupción; al detectarlas cancela TTS y vuelve a la escucha conversacional normal.
- El listener de interrupción no envía mensajes al Gateway ni puede confirmar acciones.
- Spoken Digest V3 sigue siendo una vista derivada determinista; no sustituye texto, evidencia, memoria ni contratos de acción.
- No se añade infraestructura, modelo ni servicio de pago.

## Local VAD Barge-in V2 · 2026-10-01

- Flujo de interrupción: `micrófono → getUserMedia → Web Audio analyser → VAD adaptativo → cancel speechSynthesis → SpeechRecognition normal`.
- El VAD no interpreta contenido, no llama al Gateway y no puede confirmar acciones.
- La detección es local al navegador y no añade carga a Supabase ni servicios de pago.
- `SpeechRecognition` concurrente durante TTS queda como fallback, no como mecanismo primario.

## Human Dialogue + Knowledge Map + Clarification V1 · 2026-10-01

- Flujo: `pregunta usuario → Gateway detecta dominio/confianza → respuesta directa, mapa de conocimiento o aclaración → respuesta escrita completa → digest/lead conversacional → speechSynthesis + VAD`.
- Los mapas amplios de conocimiento son deterministas y están anclados a fuentes canónicas del dominio; no sustituyen la búsqueda detallada cuando la consulta es concreta.
- Legal/Inmobiliario usa como anclas canónicas la Base Maestra Belén, el contrato Fiscal/Legal sensible y la ficha maestra de Herencias; se mantiene separación entre experiencia operativa y criterio jurídico/fiscal profesional.
- La capa de aclaración se activa ante baja confianza y no tiene capacidad de ejecutar acciones.
- Los saludos personalizados y lead-ins son presentación conversacional; no alteran memoria, permisos, identidad ni contrato de acción.
- No se añade modelo, infraestructura ni suscripción de pago.

## Conversational Intelligence V2 · 2026-10-01

- Flujo inmediato: `últimos turnos UI → conversation_context acotado → Gateway validation → contextualizeMessage → knowledge/action routing`.
- La resolución contextual no amplía permisos ni confirma acciones; solo reconstruye el significado de consultas de lectura/follow-up.
- Flujo de memoria: `user turn → sensitivity/noise filter → structured classification → observe_v2 RPC → CANDIDATE/EPISODIC`; una corrección explícita puede ejecutar `supersede_server` sobre el recuerdo previo relacionado.
- Supabase almacena solo esta memoria transaccional ligera; no se usa para audio, jobs pesados ni razonamiento prolongado.
- `fenix-memory-api` relacional/CRM sigue intacta y separada.
- Currentness: preguntas sensibles al tiempo pueden quedar marcadas `REQUIRES_CURRENT_VERIFICATION`; la verificación externa/canónica ocurre antes de usar el dato como decisión vigente.
- No se añade modelo, worker, servidor ni suscripción de pago.

## FACT-001 Automatic Factory V0 · 2026-10-08

Verified dependency chain:

`structured request → GOV-001 canonical Engine Registry → existing FACT-001 deterministic generator → structural verification → immutable CI artifact evidence`

Git-backed automatic ingress is verified on `main`: run `37830400943` attempt 1 was triggered by push and completed GREEN; attempt 2 reproduced the same request idempotency key, generated bundle SHA-256 and registry SHA-256 against the same immutable source SHA. FACT-001 is therefore `AUTOMATIC_SCAFFOLD_VERIFIED` for connected canonical SCAFFOLD request generation.

Ingress remains bounded to `cerebro/factory/requests/*.json`, explicit workflow dispatch, or defined `repository_dispatch` from CEREBRO Gateway. The automation has repository `contents: read` only. It cannot mutate the registry, App, CRM, Supabase, WordPress, SEO, Training, Trading, or any PROD surface.

`ACTGW-001 → repository_dispatch` is **DEFINED / POR AUDITAR LIVE**; no claim is made that Gateway dispatch itself has been physically/live verified yet.

Target-engine output stays `SCAFFOLD`; behavioral evaluation, tribunal, PREPROD and all production promotion gates remain downstream. FACT-001 automation verification does not transfer autonomy to generated engines.

## COMP-ONB-001 Structural Onboarding V0 · 2026-10-08

Verified structural dependency chain:

`bounded company request → existing COMP-REG/Phase 4 dependency graph → verified FACT-001 AutoFactory → 17 canonical Phase 4 scaffolds → immutable structural evidence`

The adapter preserves the existing `multicompany-bootstrap.json` graph and `MultiCompanyBootstrap` state machine. FACT generates generic SCAFFOLD bytes; tenant identity is carried in request/evidence metadata rather than rewriting canonical scaffold files.

Structural automation is verified on `main` at source SHA `cb46c0c95b4e628608990404e4c1ac38e889b79e`. Run `37833181826` attempt 1 completed SUCCESS after automatic push ingress; attempt 2 completed SUCCESS as a deterministic rerun. Both produced 17 Phase 4 engines, 306 structural files and identical aggregate SHA-256 `295be8b701fe80ea57b034e882da1698def79a97502b9831e9453871c7fc1ed6`. COMP-ONB-001 is therefore `AUTOMATIC_COMPANY_SCAFFOLD_VERIFIED` for the structural scope only.

A structural run is explicitly prohibited from turning any business engine GREEN. `COMP-REG-001` / `TENANT-001` and all later scan/SEO/social/local/marketing/knowledge/CRM/App/automation/Training/activation steps still require real PREPROD execution evidence.

The workflow is hostless and repository read-only, with automatic main self-check plus explicit and defined repository dispatch. `ACTGW-001 → cerebro_new_company_scaffold` remains **DEFINED / POR AUDITAR LIVE** until a real Gateway request is observed.

## COMP-REG-001 + TENANT-001 PREPROD reference execution · 2026-10-08

Verified dependency progression:

`REGISTERED_PREPROD → COMP-REG-001 GREEN → {COMP-ONB-001 READY, TENANT-001 READY} → TENANT-001 GREEN → COMP-ONB-001 remains READY → SCAN-001 / ENGACT-001 remain BLOCKED`

This path is verified on `main` source SHA `6710067e0f1beb28f930c038aceebfb9168f965a` by workflow run `37838584276` attempts 1 and 2, both SUCCESS and both reproducing execution SHA-256 `c1dc362d98ac5b5ad23d441a8299d64182d2bb4e6bfd271e13ca45538ad1cdc8`.

A separate synthetic control tenant remains unchanged during the primary execution, providing bounded tenant-isolation evidence. Promotion remains denied with `PHASE4_NOT_ALL_GREEN`.

The current dependency authority remains `MultiCompanyBootstrap`, whose company registry is an in-memory `Map`. Therefore the accepted state is `PREPROD_REFERENCE_EXECUTION_VERIFIED`, not durable operational registration. `supabase_writes=false` remains enforced.

Next dependency gate: `DURABLE_COMPANY_REGISTRY_PREPROD_PERSISTENCE_REQUIRED`. Before binding persistence, inventory existing Supabase company/tenant/registry schemas, RLS/RPCs and App/CRM dependencies; then implement additive PREPROD persistence with backup, rollback and OLD-vs-NEW evidence.
