import crypto from 'node:crypto';

const PREPROD = 'PREPROD';
const DEFAULT_SOURCE_JOB = 'model.deepseek.agent';
const MARKER = 'CEREBRO_EXECUTION_HANDOFF_JSON=';
const MAX_MARKER_CHARS = 32_768;

function nonEmpty(value, label, max = 4096) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${label} required`);
  const out = value.trim();
  if (out.length > max || out.includes('\0')) throw new TypeError(`${label} invalid`);
  return out;
}

function safeContext(value, label = 'context') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${label} required`);
  const out = Object.freeze({
    company_id: nonEmpty(value.company_id, `${label}.company_id`, 128),
    engine_id: nonEmpty(value.engine_id, `${label}.engine_id`, 128),
    environment: nonEmpty(value.environment, `${label}.environment`, 32),
    version: nonEmpty(value.version, `${label}.version`, 128),
  });
  if (out.environment !== PREPROD) throw new Error(`${label} must be PREPROD`);
  if (/TRAD/i.test(out.engine_id)) throw new Error(`${label} Trading is forbidden`);
  return out;
}

function runtimeContract(runtime) {
  if (!runtime || typeof runtime.enqueue !== 'function') throw new TypeError('job_runtime.enqueue required');
  return runtime;
}

function cloneJson(value, label = 'value') {
  try { return JSON.parse(JSON.stringify(value)); }
  catch { throw new TypeError(`${label} must be JSON-safe`); }
}

function extractMarker(outputText) {
  if (typeof outputText !== 'string' || outputText.length === 0) return { status: 'NONE' };
  const lines = outputText.split(/\r?\n/).filter(line => line.startsWith(MARKER));
  if (lines.length === 0) return { status: 'NONE' };
  if (lines.length !== 1) return { status: 'REJECTED', reason: 'MULTIPLE_HANDOFF_MARKERS' };
  const raw = lines[0].slice(MARKER.length);
  if (raw.length === 0 || raw.length > MAX_MARKER_CHARS) return { status: 'REJECTED', reason: 'HANDOFF_MARKER_SIZE_INVALID' };
  let parsed;
  try { parsed = JSON.parse(raw); }
  catch { return { status: 'REJECTED', reason: 'HANDOFF_JSON_INVALID' }; }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { status: 'REJECTED', reason: 'HANDOFF_OBJECT_REQUIRED' };
  const keys = Object.keys(parsed).sort();
  if (keys.length !== 2 || keys[0] !== 'job_name' || keys[1] !== 'payload') return { status: 'REJECTED', reason: 'HANDOFF_KEYS_INVALID' };
  if (typeof parsed.job_name !== 'string' || !parsed.job_name.trim()) return { status: 'REJECTED', reason: 'HANDOFF_JOB_NAME_INVALID' };
  if (!parsed.payload || typeof parsed.payload !== 'object' || Array.isArray(parsed.payload)) return { status: 'REJECTED', reason: 'HANDOFF_PAYLOAD_INVALID' };
  return { status: 'PARSED', request: parsed };
}

function sameCompany(a, b) { return a?.company_id === b?.company_id; }

function stableKey(sourceJobId, jobName) {
  const digest = crypto.createHash('sha256').update(`${sourceJobId}|${jobName}`).digest('hex').slice(0, 24);
  return `governed-handoff:${digest}`;
}

export function decorateDeepSeekWorkPumpPayloadForHandoffV1(payload, { allowed_job_names = [] } = {}) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return payload;
  if (payload.__work_pump?.kind !== 'BLOCK_SUBTASK' || typeof payload.input !== 'string') return payload;
  const names = [...new Set(allowed_job_names.map(value => String(value).trim()).filter(Boolean))];
  if (names.length === 0) return payload;
  const protocol = [
    'GOVERNED_EXECUTION_HANDOFF_PROTOCOL_V1:',
    `Executable targets currently registered: ${names.join(', ')}.`,
    `Only when the assigned microtask has enough evidence and an exact registered target can safely perform the next deterministic PREPROD step, append exactly one single-line marker: ${MARKER}{"job_name":"<registered-target>","payload":{...}}`,
    'The marker object MUST contain exactly job_name and payload. Never include company_id/engine_id/environment/version as routing authority outside the target payload contract; runtime owns routing. Never request PROD, Trading, credentials, host mutation, permission expansion, paid fallback, arbitrary shell or arbitrary repo writes.',
    'If no exact registered target is appropriate, do not emit the marker. A prose execution_handoff is evidence only and will never execute.',
  ].join('\n');
  return {
    ...payload,
    input: `${payload.input}\n\n${protocol}`,
    instructions: `${payload.instructions || ''}\nUse GOVERNED_EXECUTION_HANDOFF_PROTOCOL_V1 exactly when and only when safe physical PREPROD execution is possible.`.trim(),
  };
}

export class GovernedExecutionHandoffRouterV1 {
  #runtime;
  #targets = new Map();
  #sourceJobName;
  #stats = { observed: 0, no_handoff: 0, rejected: 0, enqueued: 0, duplicates: 0 };

  constructor({ job_runtime, targets = {}, source_job_name = DEFAULT_SOURCE_JOB } = {}) {
    this.#runtime = runtimeContract(job_runtime);
    this.#sourceJobName = nonEmpty(source_job_name, 'source_job_name', 256);
    if (!targets || typeof targets !== 'object' || Array.isArray(targets)) throw new TypeError('targets must be an object');
    for (const [name, raw] of Object.entries(targets)) {
      const jobName = nonEmpty(name, 'target job name', 256);
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new TypeError(`target ${jobName} invalid`);
      const target = Object.freeze({
        context: safeContext(raw.context, `target ${jobName}.context`),
        enabled: raw.enabled !== false,
        sanitize_payload: raw.sanitize_payload ?? (value => cloneJson(value, 'payload')),
        priority: Number.isSafeInteger(raw.priority) ? raw.priority : 50,
        max_attempts: Number.isSafeInteger(raw.max_attempts) ? raw.max_attempts : 3,
        timeout_ms: Number.isSafeInteger(raw.timeout_ms) ? raw.timeout_ms : 240_000,
      });
      if (typeof target.sanitize_payload !== 'function') throw new TypeError(`target ${jobName}.sanitize_payload must be a function`);
      this.#targets.set(jobName, target);
    }
  }

  get allowed_job_names() { return Object.freeze([...this.#targets.entries()].filter(([, value]) => value.enabled).map(([name]) => name).sort()); }

  #reject(reason, extra = {}) {
    this.#stats.rejected += 1;
    return Object.freeze({ status: 'REJECTED', reason, ...extra, prod_authorized: false, trading_access: false });
  }

  handleOutcome({ outcome } = {}) {
    this.#stats.observed += 1;
    if (!outcome || outcome.status !== 'SUCCEEDED') {
      this.#stats.no_handoff += 1;
      return Object.freeze({ status: 'NO_HANDOFF', reason: 'SOURCE_NOT_SUCCEEDED' });
    }
    const source = outcome.job;
    if (!source || source.name !== this.#sourceJobName) {
      this.#stats.no_handoff += 1;
      return Object.freeze({ status: 'NO_HANDOFF', reason: 'SOURCE_JOB_NOT_ELIGIBLE' });
    }
    let sourceContext;
    try { sourceContext = safeContext(source.context, 'source.context'); }
    catch (error) { return this.#reject('SOURCE_CONTEXT_REJECTED', { error: String(error?.message || error) }); }

    const parsed = extractMarker(source.result?.output_text);
    if (parsed.status === 'NONE') {
      this.#stats.no_handoff += 1;
      return Object.freeze({ status: 'NO_HANDOFF', reason: 'MARKER_ABSENT' });
    }
    if (parsed.status === 'REJECTED') return this.#reject(parsed.reason);

    const jobName = parsed.request.job_name.trim();
    const target = this.#targets.get(jobName);
    if (!target || !target.enabled) return this.#reject('TARGET_NOT_ALLOWLISTED', { job_name: jobName });
    if (!sameCompany(sourceContext, target.context)) return this.#reject('CROSS_COMPANY_HANDOFF_FORBIDDEN', { job_name: jobName });

    let payload;
    try { payload = target.sanitize_payload(cloneJson(parsed.request.payload, 'payload'), { source_job: source, target_context: target.context }); }
    catch (error) { return this.#reject('TARGET_PAYLOAD_REJECTED', { job_name: jobName, error: String(error?.message || error).slice(0, 500) }); }
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return this.#reject('TARGET_SANITIZER_INVALID', { job_name: jobName });

    const receipt = this.#runtime.enqueue({
      name: jobName,
      context: target.context,
      payload,
      priority: target.priority,
      max_attempts: target.max_attempts,
      timeout_ms: target.timeout_ms,
      idempotency_key: stableKey(source.job_id, jobName),
      correlation_id: source.correlation_id || `handoff:${source.job_id}`,
    });
    if (receipt.duplicate) this.#stats.duplicates += 1;
    else if (receipt.accepted) this.#stats.enqueued += 1;
    return Object.freeze({
      status: receipt.accepted ? 'ENQUEUED' : 'DUPLICATE',
      source_job_id: source.job_id,
      target_job_name: jobName,
      target_job_id: receipt.job?.job_id ?? null,
      target_context: target.context,
      prod_authorized: false,
      trading_access: false,
    });
  }

  snapshot() {
    return Object.freeze({
      schema_version: '1.0.0',
      state_type: 'CEREBRO_GOVERNED_EXECUTION_HANDOFF_ROUTER_V1',
      environment: PREPROD,
      source_job_name: this.#sourceJobName,
      allowed_job_names: this.allowed_job_names,
      ...this.#stats,
      free_form_execution_handoff_executes: false,
      arbitrary_handler_from_model: false,
      prod_authorized: false,
      trading_access: false,
    });
  }
}

export const GOVERNED_EXECUTION_HANDOFF_ROUTER_V1_CONTRACT = Object.freeze({
  capability: 'JOB-001/governed-execution-handoff-router-v1',
  environment: PREPROD,
  same_durable_queue: true,
  second_daemon: false,
  second_scheduler: false,
  source: 'model.deepseek.agent/SUCCEEDED',
  exact_marker: MARKER,
  single_marker_only: true,
  target_allowlist_required: true,
  runtime_owned_target_context: true,
  same_company_required: true,
  idempotent_per_source_and_target: true,
  free_form_execution_handoff_executes: false,
  arbitrary_handler_from_model: false,
  prod_authorized: false,
  prod_writes: false,
  trading_access: false,
});