import { selectMissionUnit } from './mission-derived-useful-work-v1.mjs';

const PREPROD = 'PREPROD';
const DOCUMENTED_ENTERPRISE_GLOBAL_CEILING = 500;
const MATRIX_CEILING = 256;
const MATRIX_TARGET = 250;
const STANDARD_FALLBACK_CAP = 20;
const QUEUE_BUFFER_MULTIPLIER = 2;
const LANE_COUNT = 68;
const TOTAL_MISSION_UNITS = selectMissionUnit(0, 0).atomic_count;

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
  if (entitlement.enterprise_organization_verified_for_canonical_repo !== true) throw new Error('ENTERPRISE_ORGANIZATION_REQUIRED');
  if (entitlement.canonical_repository !== 'fenix-cerebro/fenix-capital-inmo-map') throw new Error('CANONICAL_REPOSITORY_MISMATCH');
  if (entitlement.enterprise_slug !== 'cerebro-os') throw new Error('ENTERPRISE_SLUG_MISMATCH');
  if (limits.standard_runner_concurrent_jobs_baseline_without_enterprise_increase !== STANDARD_FALLBACK_CAP) throw new Error('STANDARD_BASELINE_MISMATCH');
  if (limits.paid_enterprise_standard_runner_documented_ceiling !== DOCUMENTED_ENTERPRISE_GLOBAL_CEILING) throw new Error('DOCUMENTED_ENTERPRISE_GLOBAL_CEILING_MISMATCH');
  if (limits.matrix_jobs_per_workflow_run_ceiling !== MATRIX_CEILING) throw new Error('MATRIX_CEILING_MISMATCH');
  if (limits.enterprise_trial_includes_increased_actions_concurrency !== false) throw new Error('TRIAL_CONCURRENCY_POLICY_MISMATCH');
  const liveLimit = integer(limits.live_enterprise_runner_concurrent_jobs_limit, 'live_enterprise_runner_concurrent_jobs_limit', 1, DOCUMENTED_ENTERPRISE_GLOBAL_CEILING);
  if (parallelism.current_live_enterprise_parallelism_cap !== liveLimit) throw new Error('LIVE_ENTERPRISE_CAP_MISMATCH');
  if (parallelism.cerebro_standard_fallback_parallelism_cap !== STANDARD_FALLBACK_CAP) throw new Error('STANDARD_FALLBACK_CAP_MISMATCH');
  if (workflow.production_deploy_from_acceleration_workflow !== false) throw new Error('PROD_DEPLOY_DENIED');
  if (workflow.write_external_systems !== false) throw new Error('EXTERNAL_WRITE_DENIED');
  if (workflow.use_actions_as_permanent_transactional_runtime !== false) throw new Error('PERMANENT_RUNTIME_DENIED');
  return liveLimit;
}

function specForSlot(slot) {
  const absolute = integer(slot, 'slot', 0, TOTAL_MISSION_UNITS - 1);
  const lane = absolute % LANE_COUNT;
  const cycle = Math.floor(absolute / LANE_COUNT);
  const selected = selectMissionUnit(lane, cycle);
  const unit = selected.unit;
  if (unit.environment !== PREPROD) throw new Error('NON_PREPROD_WORK_UNIT_DENIED');
  if (unit.trading_access === true || unit.prod_write_allowed === true || unit.paid_ai_allowed === true) {
    throw new Error('WORK_UNIT_AUTHORITY_EXPANSION_DENIED');
  }
  return Object.freeze({
    slot: absolute,
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

export function buildPaidEnterpriseTopologyV1(requested_units = DOCUMENTED_ENTERPRISE_GLOBAL_CEILING, offset = 0) {
  const requested = integer(requested_units, 'requested_units', 1, DOCUMENTED_ENTERPRISE_GLOBAL_CEILING);
  const start = integer(offset, 'offset', 0, TOTAL_MISSION_UNITS - 1);
  const planned = Math.min(requested, TOTAL_MISSION_UNITS - start);
  const all = [];
  const ids = new Set();
  for (let index = 0; index < planned; index += 1) {
    const spec = specForSlot(start + index);
    if (ids.has(spec.work_unit_id)) throw new Error(`DUPLICATE_WORK_UNIT:${spec.work_unit_id}`);
    ids.add(spec.work_unit_id);
    all.push(spec);
  }
  const matrix_a = Object.freeze(all.filter((_, index) => index % 2 === 0));
  const matrix_b = Object.freeze(all.filter((_, index) => index % 2 === 1));
  if (matrix_a.length > MATRIX_TARGET || matrix_b.length > MATRIX_TARGET) throw new Error('MATRIX_TARGET_EXCEEDED');
  if (matrix_a.length > MATRIX_CEILING || matrix_b.length > MATRIX_CEILING) throw new Error('GITHUB_MATRIX_CEILING_EXCEEDED');
  const nextOffset = start + all.length;
  return Object.freeze({
    requested_units: requested,
    offset: start,
    planned_units: all.length,
    total_work_units: TOTAL_MISSION_UNITS,
    next_offset: nextOffset,
    has_more: nextOffset < TOTAL_MISSION_UNITS,
    all,
    ids,
    matrix_a,
    matrix_b,
  });
}

export function planEnterpriseGlobalFanoutV1({ policy, requested_units, offset = 0 } = {}) {
  const liveLimit = assertBasePolicy(policy);
  const entitlement = policy.entitlement_gate || {};
  const paidConcurrencyVerified = entitlement.enterprise_account_state === 'PAID'
    && entitlement.enterprise_actions_concurrency_entitlement_verified === true
    && entitlement.global_fanout_enabled === true;
  const global500Enabled = paidConcurrencyVerified
    && entitlement.global_500_fanout_enabled === true
    && liveLimit >= DOCUMENTED_ENTERPRISE_GLOBAL_CEILING;
  const effectiveCap = paidConcurrencyVerified
    ? Math.min(liveLimit, DOCUMENTED_ENTERPRISE_GLOBAL_CEILING)
    : STANDARD_FALLBACK_CAP;
  const queueBufferCap = Math.min(DOCUMENTED_ENTERPRISE_GLOBAL_CEILING, effectiveCap * QUEUE_BUFFER_MULTIPLIER);
  const requested = requested_units == null
    ? queueBufferCap
    : integer(requested_units, 'requested_units', 1, queueBufferCap);
  const start = integer(offset, 'offset', 0, TOTAL_MISSION_UNITS - 1);
  const topology = buildPaidEnterpriseTopologyV1(requested, start);

  return Object.freeze({
    schema_version: '1.4.0',
    state_type: 'CEREBRO_ENTERPRISE_GLOBAL_FANOUT_V1',
    environment: PREPROD,
    enterprise_account_state: entitlement.enterprise_account_state || 'UNKNOWN',
    enterprise_actions_concurrency_entitlement_verified: paidConcurrencyVerified,
    global_500_fanout_enabled: global500Enabled,
    requested_units: requested,
    planned_units: topology.all.length,
    unique_work_units: topology.ids.size,
    offset: topology.offset,
    next_offset: topology.next_offset,
    has_more: topology.has_more,
    total_work_units: topology.total_work_units,
    effective_physical_cap: effectiveCap,
    queue_buffer_cap: queueBufferCap,
    queue_buffer_multiplier: QUEUE_BUFFER_MULTIPLIER,
    live_enterprise_runner_limit: liveLimit,
    documented_enterprise_platform_ceiling: DOCUMENTED_ENTERPRISE_GLOBAL_CEILING,
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
    self_refill: true,
    finite_wave: true,
    buffered_queue: true,
    stops_when_backlog_exhausted: true,
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
  documented_enterprise_global_platform_ceiling: DOCUMENTED_ENTERPRISE_GLOBAL_CEILING,
  standard_fallback_physical_cap: STANDARD_FALLBACK_CAP,
  queue_buffer_multiplier: QUEUE_BUFFER_MULTIPLIER,
  matrix_ceiling: MATRIX_CEILING,
  matrices: 2,
  matrix_target_each: MATRIX_TARGET,
  paid_500_topology_prepared: true,
  physical_execution_uses_live_runner_limit: true,
  paid_500_physical_execution_requires_live_limit_500: true,
  work_source: 'MISSION_DAG_V1',
  executor: 'mission-derived-useful-work-v1',
  total_mission_work_units: TOTAL_MISSION_UNITS,
  offset_aware: true,
  only_discovered_useful_work: true,
  unique_work_units_required: true,
  reuses_existing_mission_dag: true,
  reuses_existing_executor: true,
  second_queue: false,
  second_scheduler: false,
  second_daemon: false,
  self_refill: true,
  finite_wave: true,
  buffered_queue: true,
  stops_when_backlog_exhausted: true,
  additional_cost_eur: 0,
  prod_authorized: false,
  trading_access: false,
});
