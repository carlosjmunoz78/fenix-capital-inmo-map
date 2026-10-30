import { buildNeuronalSubmissionsV1, evidenceForNeuronalSubmissionV1 } from './neuronal-superparallel-source-v1.mjs';

const PREPROD = 'PREPROD';
const CAMPAIGN = 'NEURONAL-SUPERPARALLEL-V1';
const ACTIVE = new Set(['QUEUED', 'RETRY_WAIT', 'RUNNING']);
const TERMINAL = new Set(['SUCCEEDED', 'DEAD_LETTER', 'CANCELLED']);
const MODEL_JOB = 'model.deepseek.agent';
const VERIFIED_GLOBAL_CAP = 180;
export const NEURONAL_AUDIT_JOB_NAME_V1 = 'neuronal.audit.evidence.v1';

export const NEURONAL_QUEUE_HIERARCHY_V1 = Object.freeze([
  Object.freeze({ queue_id: 'Q00_FOUNDATION', rank: 0, match: sub => sub.domain === '00_FOUNDATION' }),
  Object.freeze({ queue_id: 'Q10_AUDIT', rank: 10, phase_code: 'A_AUDIT' }),
  Object.freeze({ queue_id: 'Q20_CONTRACT', rank: 20, phase_code: 'B_CONTRACT' }),
  Object.freeze({ queue_id: 'Q30_DATA', rank: 30, phase_code: 'C_DATA' }),
  Object.freeze({ queue_id: 'Q40_UX', rank: 40, phase_code: 'D_UX' }),
  Object.freeze({ queue_id: 'Q50_VISUAL', rank: 50, phase_code: 'E_VISUAL' }),
  Object.freeze({ queue_id: 'Q60_BUILD', rank: 60, phase_code: 'F_BUILD' }),
  Object.freeze({ queue_id: 'Q70_UNIT', rank: 70, phase_code: 'G_UNIT' }),
  Object.freeze({ queue_id: 'Q71_INTEGRATION', rank: 71, phase_code: 'H_INTEGRATION' }),
  Object.freeze({ queue_id: 'Q72_PERF_A11Y', rank: 72, phase_code: 'I_PERF_A11Y' }),
  Object.freeze({ queue_id: 'Q73_ADVERSARIAL', rank: 73, phase_code: 'J_ADVERSARIAL' }),
  Object.freeze({ queue_id: 'Q80_EVIDENCE', rank: 80, phase_code: 'K_EVIDENCE' }),
  Object.freeze({ queue_id: 'Q90_EVAL', rank: 90, phase_code: 'L_EVAL' }),
  Object.freeze({ queue_id: 'Q99_PROMOTION', rank: 99, phase_code: 'M_PROMOTION' }),
]);

const PRIORITY = Object.freeze({ P0: 0, P1: 1, P2: 2 });
const HORIZON = Object.freeze({ NOW: 0, NEXT: 1, FUTURE: 2 });
const MODEL_COMPLETABLE_PHASES = new Set(['contract', 'data_model', 'ux_spec', 'visual_spec', 'orchestration']);

function integer(value, label, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < min || n > max) throw new TypeError(`${label} must be integer ${min}..${max}`);
  return n;
}
function nonEmpty(value, label) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${label} required`);
  return value.trim();
}
function runtimeContract(runtime) {
  if (!runtime || typeof runtime.enqueue !== 'function' || typeof runtime.listForContext !== 'function') throw new TypeError('job_runtime enqueue/listForContext required');
  return runtime;
}
function runnerContract(runner) {
  if (!runner || typeof runner.register !== 'function') throw new TypeError('worker_runner.register required');
  return runner;
}
function sameContext(a, b) {
  return a?.company_id === b?.company_id && a?.engine_id === b?.engine_id && a?.environment === b?.environment && a?.version === b?.version;
}
function queueFor(sub) {
  const item = NEURONAL_QUEUE_HIERARCHY_V1.find(entry => typeof entry.match === 'function' ? entry.match(sub) : entry.phase_code === sub.phase_code);
  if (!item) throw new Error(`NEURONAL_QUEUE_UNMAPPED:${sub.submission_id}`);
  return item;
}
function score(sub) {
  const q = queueFor(sub).rank;
  return q * 10_000 + (PRIORITY[sub.priority] ?? 9) * 1_000 + (HORIZON[sub.horizon] ?? 9) * 100;
}
function meta(job) { return job?.payload?.__neuronal ?? null; }
function isNeuronalJob(job) { return meta(job)?.campaign_id === CAMPAIGN && typeof meta(job)?.submission_id === 'string'; }
function outputText(job) { return typeof job?.result?.output_text === 'string' ? job.result.output_text.trim() : ''; }
function modelResultCompleted(job) {
  const m = meta(job);
  if (job.status !== 'SUCCEEDED' || m?.execution_mode !== 'MODEL_CANDIDATE') return false;
  if (job.result?.status === 'HUMAN_REQUIRED' || job.result?.reason === 'MONEY_LIMIT') return false;
  return outputText(job).length > 0;
}
function auditResultCompleted(job) {
  return job.status === 'SUCCEEDED' && job.result?.submission_completed === true;
}
function completionState(job) {
  if (!job) return false;
  if (job.name === NEURONAL_AUDIT_JOB_NAME_V1) return auditResultCompleted(job);
  if (job.name === MODEL_JOB) return modelResultCompleted(job);
  return false;
}
function dispatchMode(sub, modelEnabled) {
  if (sub.phase === 'audit') return 'AUDIT_EVIDENCE';
  if (sub.phase_code === 'F_BUILD') return modelEnabled && sub.deepseek_allowed ? 'MODEL_BUILD_PLAN' : 'WAITING_CAPABILITY';
  if (MODEL_COMPLETABLE_PHASES.has(sub.phase) && modelEnabled && sub.deepseek_allowed) return 'MODEL_CANDIDATE';
  if (sub.domain === '00_FOUNDATION' && modelEnabled && sub.deepseek_allowed) return 'MODEL_CANDIDATE';
  return 'WAITING_CAPABILITY';
}

export function neuronalJob001ContextV1({ company_id = 'fenix', version = 'neuronal-hierarchical-v1' } = {}) {
  return Object.freeze({ company_id: nonEmpty(company_id, 'company_id'), engine_id: 'JOB-001', environment: PREPROD, version: nonEmpty(version, 'version') });
}

export class NeuronalHierarchicalJob001SourceV1 {
  #runtime; #queueContext; #modelContext; #submissions; #targetActive; #maxEnqueue; #modelActiveCap; #modelEnabled;
  constructor({ job_runtime, queue_context = neuronalJob001ContextV1(), model_context, submissions = buildNeuronalSubmissionsV1(), target_active = VERIFIED_GLOBAL_CAP, max_enqueue_per_reconcile = VERIFIED_GLOBAL_CAP, model_active_cap = 8, model_enabled = true } = {}) {
    this.#runtime = runtimeContract(job_runtime);
    if (!queue_context || queue_context.environment !== PREPROD || queue_context.engine_id !== 'JOB-001') throw new Error('neuronal queue context must be JOB-001 PREPROD');
    if (!model_context || model_context.environment !== PREPROD || model_context.engine_id !== 'BOOST-001') throw new Error('neuronal model context must be BOOST-001 PREPROD');
    this.#queueContext = Object.freeze({ ...queue_context });
    this.#modelContext = Object.freeze({ ...model_context });
    this.#submissions = Object.freeze([...submissions]);
    this.#targetActive = integer(target_active, 'target_active', { min: 1, max: VERIFIED_GLOBAL_CAP });
    this.#maxEnqueue = integer(max_enqueue_per_reconcile, 'max_enqueue_per_reconcile', { min: 1, max: VERIFIED_GLOBAL_CAP });
    this.#modelActiveCap = integer(model_active_cap, 'model_active_cap', { min: 0, max: 8 });
    this.#modelEnabled = Boolean(model_enabled);
  }

  #jobs() {
    const queueJobs = this.#runtime.listForContext(this.#queueContext).filter(isNeuronalJob);
    const modelJobs = this.#runtime.listForContext(this.#modelContext).filter(isNeuronalJob);
    return [...queueJobs, ...modelJobs];
  }

  #index(jobs) {
    const bySubmission = new Map();
    for (const job of jobs) {
      const id = meta(job)?.submission_id;
      const current = bySubmission.get(id);
      if (!current || (job.created_at_ms ?? 0) > (current.created_at_ms ?? 0)) bySubmission.set(id, job);
    }
    return bySubmission;
  }

  #state() {
    const jobs = this.#jobs();
    const bySubmission = this.#index(jobs);
    const completed = new Set();
    for (const [id, job] of bySubmission) if (completionState(job)) completed.add(id);
    const active = jobs.filter(job => ACTIVE.has(job.status));
    const activeModel = active.filter(job => sameContext(job.context, this.#modelContext));
    const queues = Object.fromEntries(NEURONAL_QUEUE_HIERARCHY_V1.map(q => [q.queue_id, { total: 0, ready: 0, active: 0, completed: 0, blocked: 0, waiting_capability: 0, dead_letter: 0 }]));
    const ready = [];
    let waitingCapability = 0;
    let deadLetter = 0;
    let humanRequired = 0;
    for (const sub of this.#submissions) {
      const q = queues[queueFor(sub).queue_id]; q.total += 1;
      const job = bySubmission.get(sub.submission_id);
      if (completionState(job)) { q.completed += 1; continue; }
      if (job && ACTIVE.has(job.status)) { q.active += 1; continue; }
      if (job?.status === 'DEAD_LETTER') { q.dead_letter += 1; deadLetter += 1; continue; }
      if (job?.status === 'SUCCEEDED' && job.result?.status === 'HUMAN_REQUIRED') { humanRequired += 1; q.blocked += 1; continue; }
      const depsReady = (sub.dependencies || []).every(dep => completed.has(dep));
      if (!depsReady) { q.blocked += 1; continue; }
      const mode = dispatchMode(sub, this.#modelEnabled);
      if (job?.status === 'SUCCEEDED' && meta(job)?.execution_mode === 'MODEL_BUILD_PLAN') { q.waiting_capability += 1; waitingCapability += 1; continue; }
      if (mode === 'WAITING_CAPABILITY') { q.waiting_capability += 1; waitingCapability += 1; continue; }
      ready.push({ sub, mode }); q.ready += 1;
    }
    ready.sort((a, b) => score(a.sub) - score(b.sub) || a.sub.submission_id.localeCompare(b.sub.submission_id));
    return { jobs, bySubmission, completed, active, activeModel, queues, ready, waitingCapability, deadLetter, humanRequired };
  }

  snapshot() {
    const s = this.#state();
    return Object.freeze({
      schema_version: '1.1.0', state_type: 'CEREBRO_NEURONAL_HIERARCHICAL_JOB001_SOURCE_V1', campaign_id: CAMPAIGN,
      environment: PREPROD, queue_context: this.#queueContext, model_context: this.#modelContext,
      queue_count: NEURONAL_QUEUE_HIERARCHY_V1.length, total_submissions: this.#submissions.length,
      completed_submissions: s.completed.size, active_jobs: s.active.length, active_model_jobs: s.activeModel.length,
      ready_submissions: s.ready.length, blocked_submissions: this.#submissions.length - s.completed.size - s.active.length - s.ready.length - s.waitingCapability - s.deadLetter,
      waiting_capability: s.waitingCapability, dead_letter: s.deadLetter, human_required: s.humanRequired,
      target_active: this.#targetActive, model_active_cap: this.#modelActiveCap,
      headroom: Math.max(0, this.#targetActive - s.active.length), model_headroom: Math.max(0, this.#modelActiveCap - s.activeModel.length),
      queues: Object.freeze(s.queues),
      hierarchy: Object.freeze(NEURONAL_QUEUE_HIERARCHY_V1.map(({ queue_id, rank, phase_code }) => Object.freeze({ queue_id, rank, phase_code: phase_code ?? 'FOUNDATION' }))),
      auto_refill: true, dependency_gated: true, factory_gap_policy: 'WAITING_CAPABILITY_NOT_FAKE_SUCCESS',
      verified_global_cap: VERIFIED_GLOBAL_CAP,
      second_queue: false, second_scheduler: false, second_daemon: false,
      prod_authorized: false, prod_write_authorized: false, trading_access: false,
    });
  }

  #dependencyDigest(sub, bySubmission) {
    return (sub.dependencies || []).map(id => {
      const job = bySubmission.get(id);
      return { submission_id: id, status: job?.status ?? 'MISSING', result: job?.result ? JSON.stringify(job.result).slice(0, 6000) : null };
    });
  }

  #enqueueAudit(sub) {
    return this.#runtime.enqueue({
      name: NEURONAL_AUDIT_JOB_NAME_V1, context: this.#queueContext,
      payload: { submission_id: sub.submission_id, __neuronal: { campaign_id: CAMPAIGN, submission_id: sub.submission_id, queue_id: queueFor(sub).queue_id, execution_mode: 'AUDIT_EVIDENCE' } },
      priority: score(sub), max_attempts: 3, timeout_ms: 180_000,
      idempotency_key: `neuronal-v1:${sub.submission_id}:audit`, correlation_id: `neuronal-v1:${sub.requirement_id || sub.submission_id}`,
      retry: { base_delay_ms: 5_000, max_delay_ms: 120_000, jitter_ratio: 0.2 },
    });
  }

  #enqueueModel(sub, mode, bySubmission) {
    const digest = this.#dependencyDigest(sub, bySubmission);
    const buildPlan = mode === 'MODEL_BUILD_PLAN';
    const input = [
      `CEREBRO NEURONAL ${sub.submission_id}`,
      `QUEUE=${queueFor(sub).queue_id}`,
      `TITLE=${sub.title}`,
      `PHASE=${sub.phase}`,
      `DOMAIN=${sub.domain}`,
      `OBJECTIVE=Produce the concrete PREPROD work product for this bounded submission.`,
      `DEPENDENCY_RESULTS=${JSON.stringify(digest).slice(0, 18000)}`,
      buildPlan ? 'This is BUILD planning only unless an existing governed handoff is explicitly available. Do not claim code was applied. Return implementation targets, exact files/components, tests, rollback and governed execution_handoff only if allowed.' : 'Return the concrete contract/spec/data/UX/visual/orchestration artifact required by this submission. Candidate-only is acceptable in PREPROD; never claim PROD.',
      'Preserve existing behavior. No secrets. No Trading. No PROD writes. Use HUMAN_REQUIRED only for canonical reasons.',
    ].join('\n\n').slice(0, 28000);
    return this.#runtime.enqueue({
      name: MODEL_JOB, context: this.#modelContext,
      payload: {
        input,
        instructions: 'You are a bounded CEREBRO NEURONAL worker. Produce concrete inspectable work product only. Never fabricate execution or telemetry.',
        model: 'deepseek-flash', max_output_tokens: 2200, projected_cost_eur: 0.025,
        __learning: { provider_id: 'deepseek', model_id: 'deepseek-flash', task_class: `neuronal-${sub.phase}` },
        __neuronal: { campaign_id: CAMPAIGN, submission_id: sub.submission_id, queue_id: queueFor(sub).queue_id, execution_mode: mode },
      },
      priority: score(sub), max_attempts: 3, timeout_ms: 240_000,
      idempotency_key: `neuronal-v1:${sub.submission_id}:${mode.toLowerCase()}`, correlation_id: `neuronal-v1:${sub.requirement_id || sub.submission_id}`,
      retry: { base_delay_ms: 5_000, max_delay_ms: 120_000, jitter_ratio: 0.2 },
    });
  }

  reconcile() {
    const beforeState = this.#state();
    let headroom = Math.max(0, this.#targetActive - beforeState.active.length);
    let modelHeadroom = Math.max(0, this.#modelActiveCap - beforeState.activeModel.length);
    const max = Math.min(headroom, this.#maxEnqueue);
    let accepted = 0, duplicates = 0, deferredModel = 0;
    for (const item of beforeState.ready) {
      if (accepted >= max) break;
      let receipt;
      if (item.mode === 'AUDIT_EVIDENCE') receipt = this.#enqueueAudit(item.sub);
      else {
        if (modelHeadroom <= 0) { deferredModel += 1; continue; }
        receipt = this.#enqueueModel(item.sub, item.mode, beforeState.bySubmission);
        if (receipt.accepted) modelHeadroom -= 1;
      }
      if (receipt.accepted) accepted += 1;
      else if (receipt.duplicate) duplicates += 1;
    }
    return Object.freeze({ ...this.snapshot(), accepted_this_reconcile: accepted, duplicates_this_reconcile: duplicates, deferred_model_capacity: deferredModel });
  }
}

export function registerNeuronalAuditHandlerV1({ worker_runner, evidence_for_submission = evidenceForNeuronalSubmissionV1 } = {}) {
  const runner = runnerContract(worker_runner);
  if (typeof evidence_for_submission !== 'function') throw new TypeError('evidence_for_submission required');
  runner.register({
    name: NEURONAL_AUDIT_JOB_NAME_V1,
    handler: async ({ payload, signal, heartbeat, checkpoint }) => {
      if (signal?.aborted) throw new Error(`ABORTED:${signal.reason ?? 'UNKNOWN'}`);
      const submissionId = nonEmpty(payload?.submission_id, 'payload.submission_id');
      heartbeat?.(); checkpoint?.({ stage: 'NEURONAL_AUDIT_START', submission_id: submissionId });
      const evidence = evidence_for_submission(submissionId);
      const completed = evidence?.submission?.phase === 'audit';
      checkpoint?.({ stage: completed ? 'NEURONAL_AUDIT_COMPLETE' : 'NEURONAL_DISCOVERY_ONLY', submission_id: submissionId });
      return Object.freeze({
        status: completed ? 'SUCCEEDED' : 'DISCOVERY_ONLY', submission_id: submissionId, submission_completed: completed,
        evidence_state: evidence?.execution_state ?? null, matching_path_count: evidence?.matching_path_count ?? null,
        completion_evidence: completed ? { kind: 'READONLY_AUDIT_EVIDENCE', generated_at: evidence?.generated_at ?? new Date().toISOString() } : null,
        additional_cost_eur: 0, paid_ai_used: false, prod_authorized: false, prod_write_authorized: false, trading_access: false,
      });
    },
  });
  return runner;
}

export const NEURONAL_HIERARCHICAL_JOB001_ADAPTER_V1_CONTRACT = Object.freeze({
  capability: 'CONSOLE-001/NEURONAL/JOB-001-HIERARCHICAL-AUTOFILL-V1', campaign_id: CAMPAIGN, environment: PREPROD,
  logical_queue_count: 14, physical_queue: 'JOB-001/DurableJobRuntimeV1', auto_refill: true, dependency_gated: true,
  priority_order: 'FOUNDATION->AUDIT->CONTRACT->DATA->UX->VISUAL->BUILD->UNIT->INTEGRATION->PERF_A11Y->ADVERSARIAL->EVIDENCE->EVAL->PROMOTION',
  model_provider_cap_respected: true, model_active_cap_max: 8, queue_active_cap_max: VERIFIED_GLOBAL_CAP,
  build_without_governed_executor: 'WAITING_CAPABILITY', fake_completion_forbidden: true,
  money_limit_becomes_human_required: true, auto_recharge: false,
  second_queue: false, second_scheduler: false, second_daemon: false,
  prod_authorized: false, prod_write_authorized: false, trading_access: false,
});
