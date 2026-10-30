import { selectMissionUnit } from './mission-derived-useful-work-v1.mjs';

const PREPROD = 'PREPROD';
const PAID_ENTERPRISE_GLOBAL_CEILING = 500;
const MATRIX_CEILING = 256;
const MATRIX_TARGET = 250;
const TRIAL_SAFE_CAP = 20;
const LANE_COUNT = 68;

function integer(value, label, min, max) {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < min || n > max) {
    throw new TypeError(`${label} must be an integer ${min}..${max}`);
  }
  return n;
}

function assertBasePolicy(policy) {
  if (!policy || typeof policy !== 'object' || Array.isArray(policy)) throw new TypeError('policy required');
  const limits = policy.verified_platform_limits || {};
  const entitlement = policy.entitlement_gate || {};
  const parallelism = policy.parallelism || {};
  const workflow = policy.workflow_policy || {};
  const liveRunnerCap = integer(limits.live_standard_runner_concurrent_jobs_max, 'live_standard_runner_concurrent_jobs_max', 1, PAID_ENTERPRISE_GLOBAL_CEILING);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(limits.live_standard_runner_concurrent_jobs_max_observed_at || '')
    || typeof limits.live_standard_runner_concurrent_jobs_max_evidence !== 'string'
    || !limits.live_standard_runner_concurrent_jobs_max_evidence.trim()) {
    throw new Error('LIVE_RUNNER_LIMIT_EVIDENCE_REQUIRED');
  }
  if (entitlement.enterprise_organization_verified_for_canonical_repo !== true) throw new Error('ENTERPRISE_ORGANIZATION_REQUIRED');
  if (entitlement.canonical_repository !== 'fenix-cerebro/fenix-capital-inmo-map') throw new Error('CANONICAL_REPOSITORY_MISMATCH');
  if (entitlement.enterprise_slug !== 'cerebro-os') throw new Error('ENTERPRISE_SLUG_MISMATCH');
  if (limits.standard_runner_concurrent_jobs_baseline_without_enterprise_increase !== TRIAL_SAFE_CAP) throw new Error('STANDARD_BASELINE_MISMATCH');
  if (limits.paid_enterprise_standard_runner_concurrent_jobs_ceiling !== PAID_ENTERPRISE_GLOBAL_CEILING) throw new Error('PAID_ENTERPRISE_GLOBAL_CEILING_MISMATCH');
  if (limits.matrix_jobs_per_workflow_run_ceiling !== MATRIX_CEILING) throw new Error('MATRIX_CEILING_MISMATCH');
  if (limits.enterprise_trial_includes_increased_actions_concurrency !== false) throw new Error('TRIAL_CONCURRENCY_POLICY_MISMATCH');
  if (parallelism.cerebro_trial_safe_parallelism_cap !== TRIAL_SAFE_CAP) throw new Error('TRIAL_SAFE_CAP_MISMATCH');
  if (workflow.production_deploy_from_acceleration_workflow !== false) throw new Error('PROD_DEPLOY_DENIED');
  if (workflow.write_external_systems !== false) throw new Error('EXTERNAL_WRITE_DENIED');
  if (workflow.use_actions_as_permanent_transactional_runtime !== false) throw new Error('PERMANENT_RUNTIME_DENIED');
  return liveRunnerCap;
}

function specForSlot(slot) {
  const lane = slot % LANE_COUNT;
  const cycle = Math.floor(slot / LANE_COUNT);
  const selected = selectMissionUnit(lane, cycle);
  const unit = selected.unit;
  if (unit.environment !== PREPROD) throw new Error('NON_PREPROD_WORK_UNIT_DENIED');
  if (unit.trading_access === true || unit.prod_write_allowed === true || unit.paid_ai_allowed === true) {
    throw new Error('WORK_UNIT_AUTHORITY_EXPANSION_DENIED');
  }
  return Object.freeze({
    slot,
    lane,
    cycle,
    company_id: unit.company_id,
    engine_id: unit.engine_id,
    environment: unit.environment,
    version: unit.version,
    work_unit_id: unit.work_unit_id,
    mission_id: unit.mission_id,
    phase: unit.work_unit_id.split('.')[1] || 'root',
  });
}

export function buildPaidEnterpriseTopologyV1(requested_units = PAID_ENTERPRISE_GLOBAL_CEILING) {
  const requested = integer(requested_units, 'requested_units', 1, PAID_ENTERPRISE_GLOBAL_CEILING);
  const all = [];
  const ids = new Set();
  for (let slot = 0; slot < requested; slot += 1) {
    const spec = specForSlot(slot);
    if (ids.has(spec.work_unit_id)) throw new Error(`DUPLICATE_WORK_UNIT:${spec.work_unit_id}`);
    ids.add(spec.work_unit_id);
    all.push(spec);
  }
  const matrix_a = Object.freeze(all.filter((_, index) => index % 2 === 0));
  const matrix_b = Object.freeze(all.filter((_, index) => index % 2 === 1));
  if (matrix_a.length > MATRIX_TARGET || matrix_b.length > MATRIX_TARGET) throw new Error('MATRIX_TARGET_EXCEEDED');
  if (matrix_a.length > MATRIX_CEILING || matrix_b.length > MATRIX_CEILING) throw new Error('GITHUB_MATRIX_CEILING_EXCEEDED');
  return Object.freeze({ requested_units: requested, all, ids, matrix_a, matrix_b });
}

export function planEnterpriseGlobalFanoutV1({ policy, requested_units = TRIAL_SAFE_CAP } = {}) {
  const liveRunnerCap = assertBasePolicy(policy);
  const entitlement = policy.entitlement_gate || {};
  const paidConcurrencyVerified = entitlement.enterprise_actions_concurrency_entitlement_verified === true
    && entitlement.global_500_fanout_enabled === true;
  if (paidConcurrencyVerified && entitlement.enterprise_account_state !== 'PAID') {
    throw new Error('PAID_ENTITLEMENT_STATE_MISMATCH');
  }
  if (paidConcurrencyVerified
    && (!/^\d{4}-\d{2}-\d{2}$/.test(entitlement.enterprise_actions_concurrency_entitlement_verified_at || '')
      || typeof entitlement.enterprise_actions_concurrency_entitlement_evidence !== 'string'
      || !entitlement.enterprise_actions_concurrency_entitlement_evidence.trim())) {
    throw new Error('PAID_ENTITLEMENT_EVIDENCE_REQUIRED');
  }
  const entitlementCap = paidConcurrencyVerified ? PAID_ENTERPRISE_GLOBAL_CEILING : TRIAL_SAFE_CAP;
  const effectiveCap = Math.min(liveRunnerCap, entitlementCap);
  const requested = integer(requested_units, 'requested_units', 1, effectiveCap);
  const topology = buildPaidEnterpriseTopologyV1(requested);

  return Object.freeze({
    schema_version: '1.1.0',
    state_type: 'CEREBRO_ENTERPRISE_GLOBAL_FANOUT_V1',
    environment: PREPROD,
    enterprise_account_state: entitlement.enterprise_account_state || 'UNKNOWN',
    enterprise_actions_concurrency_entitlement_verified: paidConcurrencyVerified,
    requested_units: requested,
    planned_units: topology.all.length,
    unique_work_units: topology.ids.size,
    effective_physical_cap: effectiveCap,
    paid_enterprise_platform_ceiling: PAID_ENTERPRISE_GLOBAL_CEILING,
    matrix_ceiling: MATRIX_CEILING,
    matrix_target: MATRIX_TARGET,
    matrix_a: topology.matrix_a,
    matrix_b: topology.matrix_b,
    matrix_a_count: topology.matrix_a.length,
    matrix_b_count: topology.matrix_b.length,
    work_source: 'MISSION_DAG_V1',
    executor: 'mission-derived-useful-work-v1',
    second_queue: false,
    second_scheduler: false,
    second_daemon: false,
    self_refill: false,
    finite: true,
    paid_ai_used: false,
    additional_cost_eur: 0,
    prod_authorized: false,
    prod_write_authorized: false,
    external_write_authorized: false,
    trading_access: false,
  });
}

export const ENTERPRISE_GLOBAL_FANOUT_V1_CONTRACT = Object.freeze({
  capability: 'RUNTIME-001/GITHUB-ENTERPRISE-GLOBAL-FANOUT-V1',
  environment: PREPROD,
  paid_enterprise_global_platform_ceiling: PAID_ENTERPRISE_GLOBAL_CEILING,
  trial_safe_physical_cap: TRIAL_SAFE_CAP,
  matrix_ceiling: MATRIX_CEILING,
  matrices: 2,
  matrix_target_each: MATRIX_TARGET,
  paid_500_topology_prepared: true,
  paid_500_physical_execution_requires_verified_entitlement: true,
  work_source: 'MISSION_DAG_V1',
  executor: 'mission-derived-useful-work-v1',
  only_discovered_useful_work: true,
  unique_work_units_required: true,
  reuses_existing_mission_dag: true,
  reuses_existing_executor: true,
  second_queue: false,
  second_scheduler: false,
  second_daemon: false,
  self_refill: false,
  finite: true,
  additional_cost_eur: 0,
  prod_authorized: false,
  trading_access: false,
});
