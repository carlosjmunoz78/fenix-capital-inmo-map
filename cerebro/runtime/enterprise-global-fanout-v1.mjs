import { selectMissionUnit } from './mission-derived-useful-work-v1.mjs';

const PREPROD = 'PREPROD';
const HARD_GLOBAL_CEILING = 500;
const MATRIX_CEILING = 256;
const MATRIX_TARGET = 250;
const LANE_COUNT = 68;

function integer(value, label, min, max) {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < min || n > max) {
    throw new TypeError(`${label} must be an integer ${min}..${max}`);
  }
  return n;
}

function assertPolicy(policy) {
  if (!policy || typeof policy !== 'object' || Array.isArray(policy)) throw new TypeError('policy required');
  const limits = policy.verified_platform_limits || {};
  const entitlement = policy.entitlement_gate || {};
  const workflow = policy.workflow_policy || {};
  if (entitlement.enterprise_organization_verified_for_canonical_repo !== true) throw new Error('ENTERPRISE_ENTITLEMENT_REQUIRED');
  if (entitlement.canonical_repository !== 'fenix-cerebro/fenix-capital-inmo-map') throw new Error('CANONICAL_REPOSITORY_MISMATCH');
  if (entitlement.enterprise_slug !== 'cerebro-os') throw new Error('ENTERPRISE_SLUG_MISMATCH');
  if (limits.enterprise_standard_runner_concurrent_jobs_ceiling !== HARD_GLOBAL_CEILING) throw new Error('ENTERPRISE_GLOBAL_CEILING_MISMATCH');
  if (limits.matrix_jobs_per_workflow_run_ceiling !== MATRIX_CEILING) throw new Error('MATRIX_CEILING_MISMATCH');
  if (workflow.production_deploy_from_acceleration_workflow !== false) throw new Error('PROD_DEPLOY_DENIED');
  if (workflow.write_external_systems !== false) throw new Error('EXTERNAL_WRITE_DENIED');
  if (workflow.use_actions_as_permanent_transactional_runtime !== false) throw new Error('PERMANENT_RUNTIME_DENIED');
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

export function planEnterpriseGlobalFanoutV1({ policy, requested_units = HARD_GLOBAL_CEILING } = {}) {
  assertPolicy(policy);
  const requested = integer(requested_units, 'requested_units', 1, HARD_GLOBAL_CEILING);
  const all = [];
  const ids = new Set();
  for (let slot = 0; slot < requested; slot += 1) {
    const spec = specForSlot(slot);
    if (ids.has(spec.work_unit_id)) throw new Error(`DUPLICATE_WORK_UNIT:${spec.work_unit_id}`);
    ids.add(spec.work_unit_id);
    all.push(spec);
  }

  // Alternate slots so both matrices are exercised even for small PREPROD canaries.
  const matrix_a = Object.freeze(all.filter((_, index) => index % 2 === 0));
  const matrix_b = Object.freeze(all.filter((_, index) => index % 2 === 1));
  if (matrix_a.length > MATRIX_TARGET || matrix_b.length > MATRIX_TARGET) throw new Error('MATRIX_TARGET_EXCEEDED');
  if (matrix_a.length > MATRIX_CEILING || matrix_b.length > MATRIX_CEILING) throw new Error('GITHUB_MATRIX_CEILING_EXCEEDED');

  return Object.freeze({
    schema_version: '1.0.0',
    state_type: 'CEREBRO_ENTERPRISE_GLOBAL_FANOUT_V1',
    environment: PREPROD,
    requested_units: requested,
    planned_units: all.length,
    unique_work_units: ids.size,
    global_platform_ceiling: HARD_GLOBAL_CEILING,
    matrix_ceiling: MATRIX_CEILING,
    matrix_target: MATRIX_TARGET,
    matrix_a,
    matrix_b,
    matrix_a_count: matrix_a.length,
    matrix_b_count: matrix_b.length,
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
  global_platform_ceiling: HARD_GLOBAL_CEILING,
  matrix_ceiling: MATRIX_CEILING,
  matrices: 2,
  matrix_target_each: MATRIX_TARGET,
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
