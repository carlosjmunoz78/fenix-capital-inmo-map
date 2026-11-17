/* LAB artifact: exact existing CerebroGatewayV0 class body, with registry statically inlined instead of node:fs runtime read. Source of truth: cerebro/console/gateway.mjs + cerebro/registry/console-v0.json, never deploy to App. */
const REGISTRY={"schema_version":"2.1.0","phase":"PHASE_5_CEREBRO_CONSOLE_V0","environment":"PREPROD","additional_cost_target_eur":0,"prod_execution_enabled":false,"direct_model_access":false,"required_context":["company_id","engine_id","environment","version"],"human_required_reasons":["LEGAL_REQUIRED","SIGNATURE_REQUIRED","LOW_CONFIDENCE","HIGH_RISK","POLICY_CONFLICT","SECURITY_INCIDENT","MONEY_LIMIT","CUSTOMER_HUMAN_REQUEST"],"engines":[{"engine_id":"CONSOLE-001","name":"CEREBRO Console","depends_on":["ACTGW-001"],"mode":"DETERMINISTIC_REFERENCE"},{"engine_id":"CHAT-001","name":"CEREBRO Chat","depends_on":["CTX-001","ACTGW-001"],"mode":"GATEWAY_MEDIATED_REFERENCE"},{"engine_id":"CTX-001","name":"Context Selector","depends_on":[],"mode":"DETERMINISTIC_REFERENCE"},{"engine_id":"CMD-001","name":"Command Executor","depends_on":["CTX-001","ACTGW-001"],"mode":"DETERMINISTIC_REFERENCE"},{"engine_id":"ACTGW-001","name":"CEREBRO Action Gateway","depends_on":["CTX-001"],"mode":"DETERMINISTIC_REFERENCE"}],"policy":{"gateway_required":true,"direct_model_access":false,"cross_company_access":"deny","supabase_writes":false,"live_writes":false,"autonomous_prod":false,"trading_access":false,"promotion_requires_preprod_green":true,"owner_exception_decision":true,"single_confirmation_after_exact_proposal":true,"explain_before_owner_decision":true,"preference_writes":"EXPLICIT_USER_ONLY","durable_learning_mode":"EXPLICIT_PREFERENCES_PLUS_CONVERSATIONAL_MEMORY_V1","conversation_memory":"AUTO_BOUNDED_NON_SENSITIVE_USER_TURNS","internal_learning_writes":"SERVICE_ROLE_BOUNDED","spoken_output_mode":"HUMAN_DIALOGUE_KNOWLEDGE_V1","spoken_raw_urls":false,"voice_conversation":{"turn_limit":null,"mode":"CONTINUOUS_UNTIL_USER_ENDS_OR_FATAL_MIC_ERROR","auto_resume_after_response":true,"auto_resume_after_recognition_end":true,"artificial_question_cap":false},"conversation_context":{"max_turns":10,"max_chars":8000,"follow_up_resolution":"DETERMINISTIC_DOMAIN_AND_NUMBERED_ITEM_V1","artificial_turn_limit":null}},"human_decision_protocol":{"mode":"OWNER_DECISION_BY_EXCEPTION","owner_role":"AUTHORIZED_HUMAN","query_behavior":"READ_WITHIN_AUTHORIZED_KNOWLEDGE_WITHOUT_CONFIRMATION","action_behavior":"EXACT_ACTION_PROPOSAL_THEN_SINGLE_EXPLICIT_CONFIRMATION","clarification_behavior":"EXPLAIN_OR_REVISE_WITHOUT_CONSUMING_CONFIRMATION","changed_scope_behavior":"INVALIDATE_PREVIOUS_PROPOSAL_AND_RECONFIRM","human_required_behavior":"EXPLAIN_CAUSE_OPTIONS_AND_EXACT_RESOLUTION_STEP","resolution_examples":{"SIGNATURE_REQUIRED":"RETURN_SIGNING_LINK_AND_RESUME_AFTER_SIGNATURE","MONEY_LIMIT":"RETURN_AMOUNT_REASON_PAYMENT_OR_APPROVAL_LINK_AND_RESUME_AFTER_APPROVAL","HIGH_RISK":"EXPLAIN_RISK_CONSEQUENCES_AND_REQUEST_OWNER_DECISION","POLICY_CONFLICT":"EXPLAIN_CONFLICT_AND_REQUEST_SCOPED_OWNER_DECISION","LOW_CONFIDENCE":"ASK_ONLY_FOR_MISSING_DECISION_OR_DATA"},"override_scope":"SCOPED_TO_EXACT_ACTION_UNLESS_OWNER_EXPLICITLY_CHANGES_POLICY","learning":"RECORD_OWNER_EXCEPTION_DECISIONS_AS_PRECEDENTS_FOR_FUTURE_POLICY_PROPOSALS","non_bypassable":["LEGAL_REQUIREMENT_ITSELF","MISSING_EXTERNAL_PERMISSION_OR_CREDENTIAL","SECURITY_INCIDENT_CONTAINMENT"]},"live_evidence":{"gateway_prod":{"status":"ACTIVE","version":26,"service":"cerebro-console-gateway-v0","artifact_sha256":"fa441dba9e32d48a12554117efbf28e5fae3991f4a8add2d9015493dbd4e2c08"},"mobile_canary":{"status":"PUBLISHED_CI_VERIFIED","path":"/cerebro/","source_sha":"d8b89b4f1f541d5d7ebea1ab5fd5cd8446a4bc43"},"knowledge_adapter":{"status":"ACTIVE_READ_ONLY","source":"NOTION","authorized_role":"DIRECCION","writes":false},"action_execution":{"status":"PARTIAL_BINDING_REQUIRED","prod_execution":false},"explicit_learning":{"status":"PROD_DEPLOYED_PHYSICAL_ACCEPTANCE_PENDING","storage":"fenix_prod.cerebro_user_preferences","write_mode":"EXPLICIT_USER_ONLY","direct_anon_access":false,"direct_authenticated_access":false,"service_role_only":true,"additional_cost_target_eur":0,"physical_acceptance":"PENDING","frontend_source_sha":"7fad08ac3225e89cbf3aa5a732674201dc67a8e6","prod_live_deploy_run":159,"prod_runtime_smoke_run":302},"conversational_learning":{"status":"PROD_DEPLOYED_RECALL_CONFIRMED_FORGET_PENDING","storage":"fenix_prod.cerebro_conversation_memory","automatic_safe_turn_learning":true,"direct_anon_access":false,"direct_authenticated_access":false,"service_role_only":true,"audio_storage":false,"assistant_reply_auto_promotion":false,"canonical_live_data_priority":true,"additional_cost_target_eur":0,"frontend_source_sha":"b64050f0320f31e1685fa028744e73e5920c8655","gateway_version":26,"prod_live_deploy_run":162,"prod_runtime_smoke_run":305,"physical_acceptance":"PARTIAL_RECALL_CONFIRMED","physical_recall_acceptance":"CONFIRMED_2026-10-01","physical_forget_acceptance":"PENDING"},"spoken_summary":{"status":"PROD_DEPLOYED_PHYSICAL_ACCEPTANCE_PENDING","mode":"NATURAL_CONVERSATIONAL_V4","previous_v2_owner_feedback":"NO_MATERIAL_IMPROVEMENT","structured_meta":["status","intent","action","read_context"],"raw_url_speech":false,"raw_email_speech":false,"long_hash_speech":false,"numbered_list_marker_speech":false,"technical_ci_noise_spoken":false,"generic_prose_target":"ONE_PRIMARY_IDEA_PLUS_WRITTEN_DETAIL","domain_specific_digests":["seo","finance","marketing","social","newsletter","autonomy","platform","trading","multiempresa"],"action_confirmation_preserved":true,"failed_action_warning_preserved":true,"behavioral_corpus":"GREEN","additional_cost_target_eur":0,"frontend_source_sha":"fbdbb99e22a821b578874157c86d73789f111e10","previous_rollback_source_sha":"c12edfae5f65fdb95c1dbf6b6fcfd921509ca21e","prod_live_deploy_run":182,"prod_runtime_smoke_run":325,"physical_acceptance":"PENDING","source_question_context":true,"repetitive_screen_boilerplate_reduced":true,"preferred_voice_policy":"ES_ES_FEMALE_NATURAL_WHEN_AVAILABLE","preserves_base_rate":true},"voice_barge_in":{"status":"CONFIRMED_OPERATIONAL","mode":"LOCAL_VAD_V2","trigger":"SUSTAINED_USER_SPEECH_DURING_TTS","implementation":["getUserMedia","Web Audio API","echoCancellation","noiseSuppression","autoGainControl","adaptive_noise_echo_threshold","sustained_frames"],"speech_recognition_during_tts":"FALLBACK_ONLY","frontend_source_sha":"96eb6effb4ab4077ccdc6158858c5158e3be825e","previous_rollback_source_sha":"d8b89b4f1f541d5d7ebea1ab5fd5cd8446a4bc43","prod_live_deploy_run":174,"prod_runtime_smoke_run":317,"additional_cost_target_eur":0,"physical_acceptance":"CONFIRMED_2026-10-01","physical_acceptance_scope":"OWNER_CONFIRMED_TTS_INTERRUPTS_BY_SPEAKING_PARA_WITHOUT_BUTTON","broader_false_positive_matrix":"NOT_PHYSICALLY_EXHAUSTIVE"},"human_dialogue":{"status":"PROD_DEPLOYED_PHYSICAL_ACCEPTANCE_PENDING","gateway_version":27,"gateway_artifact_sha256":"cccc3dce290dbf9530f185501341ca837058defcece06a862ee6fd805123e485","owner_greeting_name":"Carlos","affectionate_greeting_variants":true,"affectionate_term":"guapo","natural_lead_ins":["Claro","Mira","Vale","Te cuento"],"broad_knowledge_maps":["legal","finance","seo","marketing","social","newsletter","autonomy","platform","trading","multiempresa"],"legal_canonical_sources":["3bf81b1a-756d-81e6-b4d5-eaeb99a8152e","3be81b1a-756d-81b6-a75f-cb6bbe842766","3c781b1a-756d-8178-8950-e2c6b740df68"],"low_confidence_clarification":true,"guess_on_low_confidence":false,"preserves_local_vad_barge_in":true,"preserves_unbounded_voice_turns":true,"additional_cost_target_eur":0,"frontend_source_sha":"fbdbb99e22a821b578874157c86d73789f111e10","previous_rollback_source_sha":"c12edfae5f65fdb95c1dbf6b6fcfd921509ca21e","prod_live_deploy_run":182,"prod_runtime_smoke_run":325,"physical_acceptance":"PENDING"},"conversational_intelligence_v2":{"status":"PROD_DEPLOYED_PHYSICAL_ACCEPTANCE_PENDING","gateway_version":28,"gateway_artifact_sha256":"4a6cf9ac3065b5ad8ab5283f0df99b8853490e4f6c941026d011e55cc03aa00b","frontend_source_sha":"2d157dd4e74c101b25000bb64adf5bac5719a82e","previous_rollback_source_sha":"fbdbb99e22a821b578874157c86d73789f111e10","prod_live_deploy_run":185,"prod_runtime_smoke_run":328,"context_window":{"turns":10,"max_chars":8000},"structured_memory_kinds":["USER_TURN","FACT","DECISION","CORRECTION","PREFERENCE","OPERATIONAL_KNOWLEDGE"],"subject_key":true,"explicit_supersession":true,"freshness_gate":"REQUIRES_CURRENT_VERIFICATION","preprod_exact_migration_rollback":"GREEN","additional_cost_target_eur":0,"physical_acceptance":"PENDING"}}};
const ENGINE_IDS = new Set(REGISTRY.engines.map(e => e.engine_id));
const HUMAN_REQUIRED = new Set(REGISTRY.human_required_reasons);
const TYPED_ARRAY_BUFFER_GETTER = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(Uint8Array.prototype), 'buffer')?.get;
const DATA_VIEW_BUFFER_GETTER = Object.getOwnPropertyDescriptor(DataView.prototype, 'buffer')?.get;

function requiredString(value, label) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${label} must be a non-empty string`);
  return value;
}

function assertPreprod(value) {
  if (value !== 'PREPROD') throw new Error('Console V0 requires PREPROD');
}

function intrinsicViewBuffer(value) {
  const getter = value instanceof DataView ? DATA_VIEW_BUFFER_GETTER : TYPED_ARRAY_BUFFER_GETTER;
  if (typeof getter !== 'function') throw new TypeError('unsupported ArrayBuffer view');
  return getter.call(value);
}

function rejectUnsafeCloneValue(value, seen = new WeakSet()) {
  if (value === null || (typeof value !== 'object' && typeof value !== 'function')) return;
  if (typeof WebAssembly !== 'undefined' && typeof WebAssembly.Memory === 'function' && value instanceof WebAssembly.Memory) {
    throw new TypeError('WebAssembly.Memory not supported');
  }
  if (typeof SharedArrayBuffer !== 'undefined' && value instanceof SharedArrayBuffer) {
    throw new TypeError('shared memory not supported');
  }
  if (ArrayBuffer.isView(value)) {
    const buffer = intrinsicViewBuffer(value);
    if (typeof SharedArrayBuffer !== 'undefined' && buffer instanceof SharedArrayBuffer) throw new TypeError('shared memory view not supported');
    return;
  }
  if (value instanceof ArrayBuffer) return;
  if (seen.has(value)) return;
  seen.add(value);
  if (value instanceof Map) {
    Map.prototype.forEach.call(value, (v, k) => { rejectUnsafeCloneValue(k, seen); rejectUnsafeCloneValue(v, seen); });
    return;
  }
  if (value instanceof Set) {
    Set.prototype.forEach.call(value, v => rejectUnsafeCloneValue(v, seen));
    return;
  }
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor) continue;
    if (descriptor.get || descriptor.set) throw new TypeError('accessor properties not supported');
    rejectUnsafeCloneValue(descriptor.value, seen);
  }
}

function safeClone(value) {
  rejectUnsafeCloneValue(value);
  const cloned = structuredClone(value);
  rejectUnsafeCloneValue(cloned);
  return cloned;
}

function safeErrorText(error) {
  try { return String(error); } catch { return '[unstringifiable error]'; }
}

function canonicalContext({ company_id, engine_id = 'CONSOLE-001', environment = 'PREPROD', version = '0.1.0' }) {
  assertPreprod(environment);
  const eid = requiredString(engine_id, 'engine_id');
  if (!ENGINE_IDS.has(eid)) throw new Error('unknown Console V0 engine');
  return Object.freeze({
    company_id: requiredString(company_id, 'company_id'),
    engine_id: eid,
    environment,
    version: requiredString(version, 'version')
  });
}

export class CerebroGatewayV0 {
  #environment;
  #version;
  #sessions = new Map();
  #audit = [];
  #commands = new Map();
  #chatAdapter = null;

  constructor({ environment = 'PREPROD', version = '0.1.0' } = {}) {
    assertPreprod(environment);
    this.#environment = environment;
    this.#version = requiredString(version, 'version');
  }

  get environment() { return this.#environment; }
  get version() { return this.#version; }

  createSession({ session_id, company_id, context = {} }) {
    assertPreprod(this.#environment);
    const sid = requiredString(session_id, 'session_id');
    if (this.#sessions.has(sid)) throw new Error('session already exists');
    if (context === null || typeof context !== 'object' || Array.isArray(context)) throw new TypeError('context must be an object');
    const engine_id = context.engine_id ?? 'CONSOLE-001';
    const ctx = canonicalContext({ company_id, engine_id, environment: this.#environment, version: this.#version });
    const session = { session_id: sid, context: ctx, history: [] };
    this.#sessions.set(sid, session);
    this.#audit.push({ type: 'SESSION_CREATED', session_id: sid, context: ctx });
    return safeClone(session);
  }

  selectContext({ session_id, company_id, engine_id = 'CONSOLE-001' }) {
    assertPreprod(this.#environment);
    const session = this.#getSession(session_id);
    if (company_id !== session.context.company_id) throw new Error('cross-company context switch denied');
    session.context = canonicalContext({ company_id, engine_id, environment: this.#environment, version: this.#version });
    this.#audit.push({ type: 'CONTEXT_SELECTED', session_id, context: session.context });
    return safeClone(session.context);
  }

  registerCommand(name, handler) {
    assertPreprod(this.#environment);
    const command = requiredString(name, 'command');
    if (typeof handler !== 'function') throw new TypeError('handler must be a function');
    if (this.#commands.has(command)) throw new Error('command already registered');
    this.#commands.set(command, handler);
  }

  setChatAdapter(adapter) {
    assertPreprod(this.#environment);
    if (adapter !== null && typeof adapter !== 'function') throw new TypeError('chat adapter must be a function or null');
    this.#chatAdapter = adapter;
  }

  async execute({ session_id, command, payload = {} }) {
    assertPreprod(this.#environment);
    const session = this.#getSession(session_id);
    const name = requiredString(command, 'command');
    const handler = this.#commands.get(name);
    if (!handler) return this.#humanRequired(session, 'LOW_CONFIDENCE', `unknown command:${name}`);
    const operationContext = Object.freeze({ ...session.context });
    try {
      const input = safeClone(payload);
      const result = await handler({ context: operationContext, payload: input });
      const safeResult = safeClone(result);
      this.#validateHumanRequired(safeResult);
      if (safeResult?.status === 'HUMAN_REQUIRED') {
        session.history.push({ kind: 'HUMAN_REQUIRED', source: 'COMMAND', command: name, context: operationContext, result: safeResult });
        this.#audit.push({ type: 'HUMAN_REQUIRED', source: 'COMMAND', session_id, command: name, context: operationContext, result: safeResult });
      } else {
        session.history.push({ kind: 'COMMAND', command: name, context: operationContext, result: safeResult });
        this.#audit.push({ type: 'COMMAND_EXECUTED', session_id, command: name, context: operationContext, result: safeResult });
      }
      return safeClone(safeResult);
    } catch (error) {
      const failure = { status: 'ERROR', error: safeErrorText(error) };
      session.history.push({ kind: 'COMMAND_ERROR', command: name, context: operationContext, result: failure });
      this.#audit.push({ type: 'COMMAND_ERROR', session_id, command: name, context: operationContext, result: failure });
      throw error;
    }
  }

  async chat({ session_id, message }) {
    assertPreprod(this.#environment);
    const session = this.#getSession(session_id);
    const text = requiredString(message, 'message');
    if (!this.#chatAdapter) return this.#humanRequired(session, 'LOW_CONFIDENCE', 'chat adapter unavailable');
    const operationContext = Object.freeze({ ...session.context });
    try {
      const result = await this.#chatAdapter({ context: operationContext, message: text });
      const safeResult = safeClone(result);
      this.#validateHumanRequired(safeResult);
      if (safeResult?.status === 'HUMAN_REQUIRED') {
        session.history.push({ kind: 'HUMAN_REQUIRED', source: 'CHAT', message: text, context: operationContext, result: safeResult });
        this.#audit.push({ type: 'HUMAN_REQUIRED', source: 'CHAT', session_id, context: operationContext, result: safeResult });
      } else {
        session.history.push({ kind: 'CHAT', message: text, context: operationContext, result: safeResult });
        this.#audit.push({ type: 'CHAT_MEDIATED', session_id, context: operationContext, result: safeResult });
      }
      return safeClone(safeResult);
    } catch (error) {
      const failure = { status: 'ERROR', error: safeErrorText(error) };
      session.history.push({ kind: 'CHAT_ERROR', message: text, context: operationContext, result: failure });
      this.#audit.push({ type: 'CHAT_ERROR', session_id, context: operationContext, result: failure });
      throw error;
    }
  }

  inspectSession(session_id) {
    return safeClone(this.#getSession(session_id));
  }

  auditLog() {
    return safeClone(this.#audit);
  }

  queryEngines() {
    assertPreprod(this.#environment);
    return safeClone(REGISTRY.engines);
  }

  contract() {
    return safeClone({
      environment: 'PREPROD',
      gateway_required: true,
      direct_model_access: false,
      prod_execution_enabled: false,
      supabase_writes: false,
      live_writes: false,
      autonomous_prod: false,
      trading_access: false,
      additional_cost_target_eur: 0,
      engines: [...ENGINE_IDS].sort()
    });
  }

  #getSession(session_id) {
    const sid = requiredString(session_id, 'session_id');
    const session = this.#sessions.get(sid);
    if (!session) throw new Error('session not found');
    return session;
  }

  #validateHumanRequired(result) {
    if (!result || result.status !== 'HUMAN_REQUIRED') return;
    if (!HUMAN_REQUIRED.has(result.reason)) throw new Error('invalid HUMAN_REQUIRED reason');
  }

  #humanRequired(session, reason, detail) {
    if (!HUMAN_REQUIRED.has(reason)) throw new Error('invalid HUMAN_REQUIRED reason');
    const operationContext = Object.freeze({ ...session.context });
    const result = { status: 'HUMAN_REQUIRED', reason, detail };
    session.history.push({ kind: 'HUMAN_REQUIRED', context: operationContext, result });
    this.#audit.push({ type: 'HUMAN_REQUIRED', session_id: session.session_id, context: operationContext, result });
    return safeClone(result);
  }
}

export function getConsoleRegistry() {
  return safeClone(REGISTRY);
}
