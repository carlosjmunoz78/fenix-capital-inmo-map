import crypto from 'node:crypto';
import { serialize, deserialize } from 'node:v8';
import { AtomicV8Journal } from './persistent-runtime.mjs';

const PREPROD = 'PREPROD';
const KIND = 'LRN-001-CANDIDATE-SPOOL-V1';

function nonEmpty(value, label) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${label} must be a non-empty string`);
  return value.trim();
}

function safeContext(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('context must be an object');
  const context = Object.freeze({
    company_id: nonEmpty(value.company_id, 'context.company_id'),
    engine_id: nonEmpty(value.engine_id, 'context.engine_id'),
    environment: nonEmpty(value.environment, 'context.environment'),
    version: nonEmpty(value.version, 'context.version'),
  });
  if (context.environment !== PREPROD) throw new Error('learning candidate spool V1 is PREPROD-only');
  return context;
}

function clone(value) { return deserialize(serialize(value)); }
function digest(value) { return crypto.createHash('sha256').update(serialize(value)).digest('hex'); }

function optionalString(value, label) {
  if (value == null) return null;
  return nonEmpty(String(value), label);
}

function finite(value, label, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  if (value == null) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) throw new TypeError(`${label} must be between ${min} and ${max}`);
  return n;
}

function replay(operations) {
  const candidates = [];
  const keys = new Set();
  for (const op of operations) {
    if (!op || op.op !== 'append' || !op.candidate) throw new Error('invalid learning candidate spool operation');
    const key = nonEmpty(op.candidate.idempotency_key, 'candidate.idempotency_key');
    if (keys.has(key)) throw new Error(`duplicate learning candidate idempotency key in journal: ${key}`);
    keys.add(key);
    candidates.push(clone(op.candidate));
  }
  return { candidates, keys };
}

export class LearningCandidateSpoolV1 {
  #journal;
  #operations;
  #candidates;
  #keys;

  constructor({ file_path, environment = PREPROD }) {
    if (environment !== PREPROD) throw new Error('learning candidate spool V1 is PREPROD-only');
    this.#journal = new AtomicV8Journal({ file_path: nonEmpty(file_path, 'file_path'), kind: KIND });
    this.#operations = this.#journal.load();
    const state = replay(this.#operations);
    this.#candidates = state.candidates;
    this.#keys = state.keys;
  }

  append({
    context: rawContext,
    task_id,
    block_id = null,
    subtask_id = null,
    parent_task_id = null,
    provider_id = null,
    model_id = null,
    prompt_hash = null,
    tool_hash = null,
    outcome,
    evidence_refs = [],
    tests = null,
    confidence = null,
    latency_ms = null,
    tokens = null,
    cost_eur = null,
    reusable_rule_candidate = null,
    idempotency_key,
    observed_at = new Date().toISOString(),
  }) {
    const context = safeContext(rawContext);
    const safeTaskId = nonEmpty(task_id, 'task_id');
    const key = idempotency_key == null
      ? `learn:${context.company_id}:${context.engine_id}:${safeTaskId}:${digest(outcome).slice(0, 24)}`
      : nonEmpty(idempotency_key, 'idempotency_key');
    if (this.#keys.has(key)) {
      const existing = this.#candidates.find(item => item.idempotency_key === key);
      return Object.freeze({ accepted: false, duplicate: true, candidate: clone(existing) });
    }
    if (!Array.isArray(evidence_refs)) throw new TypeError('evidence_refs must be an array');
    const safeConfidence = finite(confidence, 'confidence', { min: 0, max: 1 });
    const safeLatency = finite(latency_ms, 'latency_ms');
    const safeTokens = finite(tokens, 'tokens');
    const safeCost = finite(cost_eur, 'cost_eur');
    const candidate = Object.freeze({
      schema_version: '1.0',
      candidate_id: `lrn_${digest([key, observed_at]).slice(0, 24)}`,
      idempotency_key: key,
      context: { ...context },
      task_id: safeTaskId,
      block_id: optionalString(block_id, 'block_id'),
      subtask_id: optionalString(subtask_id, 'subtask_id'),
      parent_task_id: optionalString(parent_task_id, 'parent_task_id'),
      provider_id: optionalString(provider_id, 'provider_id'),
      model_id: optionalString(model_id, 'model_id'),
      prompt_hash: optionalString(prompt_hash, 'prompt_hash'),
      tool_hash: optionalString(tool_hash, 'tool_hash'),
      outcome: clone(outcome ?? null),
      evidence_refs: clone(evidence_refs),
      tests: clone(tests),
      confidence: safeConfidence,
      latency_ms: safeLatency,
      tokens: safeTokens,
      cost_eur: safeCost,
      reusable_rule_candidate: clone(reusable_rule_candidate),
      observed_at: nonEmpty(observed_at, 'observed_at'),
      governance_state: 'CANDIDATE_ONLY',
      prod_mutation_authorized: false,
    });
    const operations = [...this.#operations, { op: 'append', candidate }];
    const state = replay(operations);
    this.#journal.commit(operations);
    this.#operations = operations;
    this.#candidates = state.candidates;
    this.#keys = state.keys;
    return Object.freeze({ accepted: true, duplicate: false, candidate: clone(candidate) });
  }

  appendJobOutcome({ outcome, latency_ms = null }) {
    const job = outcome?.job;
    if (!job || !job.context || !job.job_id) return Object.freeze({ accepted: false, skipped: true, reason: 'OUTCOME_WITHOUT_DURABLE_JOB' });
    const dag = job.payload?.__dag ?? {};
    const meta = job.payload?.__learning ?? {};
    const result = job.result ?? null;
    return this.append({
      context: job.context,
      task_id: dag.task_id ?? job.job_id,
      block_id: dag.block_id ?? null,
      subtask_id: dag.subtask_id ?? null,
      parent_task_id: dag.parent_task_id ?? null,
      provider_id: meta.provider_id ?? dag.route?.provider_id ?? null,
      model_id: meta.model_id ?? null,
      prompt_hash: meta.prompt_hash ?? null,
      tool_hash: meta.tool_hash ?? null,
      outcome: {
        worker_status: outcome.status ?? null,
        durable_status: job.status ?? null,
        result,
        error: outcome.error ?? job.error ?? null,
        reason: outcome.reason ?? null,
      },
      evidence_refs: result?.evidence_refs ?? meta.evidence_refs ?? [],
      tests: result?.tests ?? meta.tests ?? null,
      confidence: result?.confidence ?? meta.confidence ?? null,
      latency_ms,
      tokens: result?.tokens ?? meta.tokens ?? null,
      cost_eur: result?.cost_eur ?? meta.cost_eur ?? null,
      reusable_rule_candidate: result?.reusable_rule_candidate ?? null,
      idempotency_key: `job-outcome:${job.job_id}:${job.status}:${job.attempts}`,
    });
  }

  list() { return Object.freeze(this.#candidates.map(clone)); }
  get size() { return this.#candidates.length; }
}

export const LEARNING_CANDIDATE_SPOOL_V1_CONTRACT = Object.freeze({
  capability: 'LRN-001/candidate-spool-v1',
  environment: PREPROD,
  append_only: true,
  idempotent: true,
  governed_candidate_only: true,
  direct_prod_learning: false,
  direct_prod_mutation: false,
  tribunal_required_before_promotion: true,
  additional_cost_target_eur: 0,
  supabase_required: false,
  trading_access: false,
  downstream_learning_bridge_status: 'POR_AUDITAR',
});
