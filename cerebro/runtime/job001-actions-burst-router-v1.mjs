const PREPROD = 'PREPROD';

function integer(value, label, min, max) {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < min || n > max) throw new TypeError(`${label} must be integer ${min}..${max}`);
  return n;
}

function assertContract(contract) {
  if (!contract || typeof contract !== 'object' || Array.isArray(contract)) throw new TypeError('contract required');
  if (contract.environment !== PREPROD) throw new Error('JOB001_BURST_PREPROD_ONLY');
  if (contract.second_queue !== false || contract.second_scheduler !== false || contract.second_daemon !== false) {
    throw new Error('JOB001_BURST_CANONICAL_CONTROL_PLANE_REQUIRED');
  }
  if (contract.prod_authorized !== false || contract.trading_access !== false) throw new Error('JOB001_BURST_AUTHORITY_EXPANSION_DENIED');
  for (const key of ['target_useful_default','max_global_default','max_company_default','max_deepseek_default','max_repo_write_default']) {
    if (!Number.isSafeInteger(contract[key]) || contract[key] < 0) throw new Error(`JOB001_BURST_CONTRACT_INVALID:${key}`);
  }
  return contract;
}

function assertPolicy(policy) {
  if (!policy || typeof policy !== 'object' || Array.isArray(policy)) throw new TypeError('policy required');
  if (policy.environment !== PREPROD || policy.engine_id !== 'JOB-001' || policy.mode !== 'FINITE_BURST') throw new Error('JOB001_BURST_POLICY_INVALID');
  if (policy.burst?.finite !== true || policy.burst?.self_refill !== false) throw new Error('JOB001_BURST_MUST_BE_FINITE');
  if (policy.job001_contract?.second_queue !== false || policy.job001_contract?.second_scheduler !== false || policy.job001_contract?.second_daemon !== false) {
    throw new Error('JOB001_BURST_SECOND_CONTROL_PLANE_DENIED');
  }
  const authority = policy.authority || {};
  if (authority.prod_authorized || authority.prod_write_authorized || authority.external_write_authorized || authority.trading_access || authority.paid_ai_fanout_authorized || Number(authority.additional_cost_eur) !== 0) {
    throw new Error('JOB001_BURST_AUTHORITY_OR_COST_DENIED');
  }
  return policy;
}

export function planJob001ActionsBurstV1({ contract, policy, request = {} }) {
  const c = assertContract(contract);
  const p = assertPolicy(policy);

  const platformRequestCeiling = integer(
    p.entitlement?.paid_enterprise_standard_runner_concurrent_jobs_ceiling ?? 500,
    'paid_enterprise_standard_runner_concurrent_jobs_ceiling',
    1,
    10000,
  );
  const matrixCeiling = integer(
    p.entitlement?.matrix_jobs_per_workflow_run_ceiling ?? 256,
    'matrix_jobs_per_workflow_run_ceiling',
    1,
    256,
  );
  const organizationVerified = p.entitlement?.enterprise_organization_verified_for_canonical_repo === true;
  const actionsConcurrencyVerified = organizationVerified
    && p.entitlement?.enterprise_actions_concurrency_entitlement_verified === true;
  const entitlementCap = actionsConcurrencyVerified
    ? integer(p.burst.max_lanes_after_actions_concurrency_verified, 'max_lanes_after_actions_concurrency_verified', 1, matrixCeiling)
    : integer(p.burst.max_lanes_until_actions_concurrency_verified, 'max_lanes_until_actions_concurrency_verified', 1, matrixCeiling);
  const contractCap = Math.min(c.max_global_default, c.max_company_default, matrixCeiling);
  const hardCap = Math.min(entitlementCap, contractCap, matrixCeiling);

  const requestedLanes = request.lanes == null
    ? integer(p.burst.default_lanes, 'default_lanes', 1, hardCap)
    : integer(request.lanes, 'lanes', 1, platformRequestCeiling);
  const lanes = Math.min(requestedLanes, hardCap);
  const unitsPerLane = request.units_per_lane == null
    ? integer(p.burst.default_units_per_lane, 'default_units_per_lane', 1, p.burst.max_units_per_lane)
    : integer(request.units_per_lane, 'units_per_lane', 1, p.burst.max_units_per_lane);
  const cycleBase = request.cycle_base == null ? 0 : integer(request.cycle_base, 'cycle_base', 0, 999999);

  const matrix = Array.from({ length: lanes }, (_, index) => Object.freeze({
    lane: index,
    cycle_start: (cycleBase + (index * unitsPerLane)) % 1000000,
    units: unitsPerLane,
  }));

  return Object.freeze({
    schema_version: '1.1.0',
    state_type: 'CEREBRO_JOB001_ACTIONS_BURST_PLAN_V1',
    company_id: p.company_id,
    engine_id: p.engine_id,
    environment: PREPROD,
    version: p.version,
    mode: 'FINITE_BURST',
    enterprise_account_state: p.entitlement?.enterprise_account_state || 'UNKNOWN',
    entitlement_state: actionsConcurrencyVerified
      ? 'PAID_ACTIONS_CONCURRENCY_VERIFIED'
      : organizationVerified
        ? 'ORG_VERIFIED_ACTIONS_CONCURRENCY_UNVERIFIED'
        : 'ENTITLEMENT_UNVERIFIED',
    requested_lanes: requestedLanes,
    lanes,
    units_per_lane: unitsPerLane,
    total_units: lanes * unitsPerLane,
    platform_request_ceiling: platformRequestCeiling,
    matrix_ceiling: matrixCeiling,
    hard_cap: hardCap,
    matrix: Object.freeze(matrix),
    reuses_existing_runtime: true,
    reuses_existing_work_pump: true,
    second_queue: false,
    second_scheduler: false,
    second_daemon: false,
    self_refill: false,
    prod_authorized: false,
    trading_access: false,
    additional_cost_eur: 0,
  });
}
