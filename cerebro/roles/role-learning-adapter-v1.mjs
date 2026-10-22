import { stableIdempotencyKey } from '../runtime/continuous-improvement-contract.mjs';
import { buildUniversalLearningEventReport, UNIVERSAL_SIGNAL_TYPES } from '../runtime/universal-learning-ingress.mjs';
import { runLearningWorkerOnce } from '../runtime/rsi-learning-worker.mjs';
import { buildRoleKnowledgeContext } from './role-knowledge-runtime-v1.mjs';

const SIGNAL_TYPES = new Set(UNIVERSAL_SIGNAL_TYPES);
const FORBIDDEN_BYPASSES = Object.freeze([
  'auto_apply',
  'direct_knowledge_mutation',
  'skip_evaluation',
  'skip_tribunal',
  'prod_authorized',
  'prod_write_authorized',
  'trading_access',
  'external_side_effect_authorized'
]);

function reqString(value, label, { max = 1000 } = {}) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} required`);
  const out = value.trim();
  if (out.length > max) throw new Error(`${label} too long`);
  return out;
}

function cloneJson(value, label) {
  if (value == null) return null;
  try {
    return structuredClone(value);
  } catch {
    throw new Error(`${label} must be structured-cloneable`);
  }
}

function assertPreprod(environment) {
  if (environment !== 'PREPROD') throw new Error('role learning adapter v1 is exact PREPROD only');
}

function assertNoBypass(input) {
  for (const key of FORBIDDEN_BYPASSES) {
    if (input?.[key] === true) throw new Error(`role learning bypass forbidden: ${key}`);
  }
  if (input?.contains_customer_data === true) throw new Error('role learning customer data forbidden');
  if (input?.contains_secrets === true) throw new Error('role learning secrets forbidden');
  if (Number(input?.additional_cost_eur ?? 0) !== 0) throw new Error('role learning incremental cost must be zero');
}

function normalizeRefs(value) {
  const refs = Array.isArray(value) ? value : [];
  const out = [...new Set(refs.map((item) => reqString(item, 'evidence_ref', { max: 1000 })))].sort((a, b) => a.localeCompare(b));
  if (!out.length) throw new Error('at least one evidence_ref required');
  return out;
}

function selectEngine(role, requestedEngineId) {
  const engines = Array.isArray(role.engines) ? role.engines : [];
  if (!engines.length) throw new Error(`role ${role.role_id} has no verified engine binding`);
  if (requestedEngineId == null) return engines[0];
  const engineId = reqString(requestedEngineId, 'engine_id', { max: 160 });
  if (!engines.includes(engineId)) throw new Error(`engine_id ${engineId} is not verified for role ${role.role_id}`);
  return engineId;
}

function canonicalDelta(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('proposed_knowledge_delta object required');
  return cloneJson(value, 'proposed_knowledge_delta');
}

export const ROLE_LEARNING_ADAPTER_V1_CONTRACT = Object.freeze({
  adapter_id: 'CEREBRO_ROLE_LEARNING_ADAPTER_V1',
  engine_id: 'LRN-001',
  environment: 'PREPROD',
  version: '1.0.0',
  ingress: 'cerebro/runtime/universal-learning-ingress.mjs',
  worker: 'cerebro/runtime/rsi-learning-worker.mjs',
  proposal_only: true,
  auto_apply: false,
  direct_knowledge_mutation: false,
  evaluation_required: true,
  tribunal_required: true,
  authority_delta: false,
  prod_authorized: false,
  prod_write_authorized: false,
  trading_access: false,
  external_side_effect_authorized: false,
  additional_cost_eur: 0
});

export function buildRoleLearningSignal(input = {}) {
  assertNoBypass(input);
  const roleId = reqString(input.role_id, 'role_id', { max: 160 });
  const companyId = reqString(input.company_id, 'company_id', { max: 160 });
  const environment = input.environment ?? 'PREPROD';
  assertPreprod(environment);

  const roleContext = buildRoleKnowledgeContext({
    role_id: roleId,
    company_id: companyId,
    environment,
    version: input.role_context_version ?? 'v1',
    requested_authority: input.requested_authority ?? {}
  });

  const evidenceRefs = normalizeRefs(input.evidence_refs);
  const proposedDelta = canonicalDelta(input.proposed_knowledge_delta);
  const engineId = selectEngine(roleContext.role, input.engine_id);
  const signalType = reqString(input.signal_type ?? 'ENGINE_RESULT', 'signal_type', { max: 80 }).toUpperCase();
  if (!SIGNAL_TYPES.has(signalType)) throw new Error(`unsupported role learning signal_type:${signalType}`);
  const version = reqString(input.version ?? '1.0.0', 'version', { max: 80 });
  const observedAt = reqString(input.observed_at, 'observed_at', { max: 80 });
  const observedOutcome = cloneJson(input.observed_outcome ?? {}, 'observed_outcome');

  const proposalKey = stableIdempotencyKey({
    role_id: roleId,
    company_id: companyId,
    engine_id: engineId,
    version,
    knowledge_pack_id: roleContext.role.knowledge_pack_id,
    evidence_refs: evidenceRefs,
    proposed_knowledge_delta: proposedDelta
  });

  return {
    signal_id: `role-learning:${roleId}:${proposalKey.slice(0, 24)}`,
    signal_type: signalType,
    company_id: companyId,
    engine_id: engineId,
    source_environment: 'PREPROD',
    version,
    observed_at: observedAt,
    severity: input.severity ?? 'LOW',
    confidence: input.confidence,
    risk_class: input.risk_class,
    reason: input.reason ?? `Governed learning proposal from ${roleId}`,
    hypothesis: input.hypothesis,
    evidence_refs: evidenceRefs,
    metric: input.metric,
    payload: {
      role_id: roleId,
      role_class: roleContext.role.class,
      department: roleContext.role.department,
      family: roleContext.role.family,
      role_state: roleContext.role.state,
      knowledge_pack_id: roleContext.role.knowledge_pack_id,
      proposed_knowledge_delta: proposedDelta,
      observed_outcome: observedOutcome,
      proposal_only: true,
      auto_apply: false,
      direct_knowledge_mutation: false,
      evaluation_required: true,
      tribunal_required: true,
      learning_pipeline: roleContext.learning.pipeline,
      authority_delta: false
    },
    contains_customer_data: false,
    contains_secrets: false,
    additional_cost_eur: 0,
    prod_authorized: false,
    prod_write_authorized: false,
    trading_access: false
  };
}

export function buildRoleLearningEventReport(input = {}) {
  const signal = buildRoleLearningSignal(input);
  return buildUniversalLearningEventReport({ signals: [signal] });
}

export function runRoleLearningProposalOnce(input = {}) {
  assertNoBypass(input);
  const environment = input.environment ?? 'PREPROD';
  assertPreprod(environment);
  const eventReport = buildRoleLearningEventReport(input);
  const roleId = eventReport.events[0]?.payload?.role_id;
  const knowledgePackId = eventReport.events[0]?.payload?.knowledge_pack_id;
  const result = runLearningWorkerOnce({
    event_report: eventReport,
    ledger_file: reqString(input.ledger_file, 'ledger_file', { max: 2000 }),
    preprod_version: reqString(input.preprod_version, 'preprod_version', { max: 80 }),
    environment: 'PREPROD',
    policy_pass: input.policy_pass === true,
    security_pass: input.security_pass === true,
    local_persistence_enabled: input.local_persistence_enabled === true,
    kill_switch: input.kill_switch === true,
    observed_at: input.worker_observed_at ?? input.observed_at
  });
  return Object.freeze({
    ...result,
    role_id: roleId,
    knowledge_pack_id: knowledgePackId,
    proposal_only: true,
    auto_apply: false,
    direct_knowledge_mutation: false,
    evaluation_required: true,
    tribunal_required: true,
    authority_delta: false,
    external_side_effect_authorized: false,
    prod_authorized: false,
    prod_write_authorized: false,
    trading_access: false,
    additional_cost_eur: 0
  });
}
