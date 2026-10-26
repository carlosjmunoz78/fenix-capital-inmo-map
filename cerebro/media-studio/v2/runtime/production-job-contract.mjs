export const UMS_PRODUCTION_JOB_STATUSES = Object.freeze([
  'QUEUED', 'WAITING_FOR_CAPABILITY', 'EXECUTING', 'QA_PENDING', 'CREATIVE_REJECTED',
  'DELIVERABLE_READY', 'BLOCKED', 'HUMAN_REQUIRED',
]);

function text(value) { return String(value ?? '').trim(); }
function required(value, name) { const v = text(value); if (!v) throw new Error(`${name}_REQUIRED`); return v; }
function array(value) { return Array.isArray(value) ? value : []; }

export function normalizeProductionJob(input = {}) {
  const request = input.request ?? input;
  const environment = text(request.environment || input.environment || 'PREPROD').toUpperCase();
  if (environment !== 'PREPROD') throw new Error('UMS_PREMIUM_EXECUTOR_PREPROD_ONLY');
  if (required(request.engine_id || input.engine_id, 'ENGINE_ID') !== 'UMS-001') throw new Error('UMS_ENGINE_SCOPE_REQUIRED');
  if (required(request.kind || 'cerebro.ums.production_order.v1', 'KIND') !== 'cerebro.ums.production_order.v1') throw new Error('UMS_PRODUCTION_ORDER_KIND_REQUIRED');

  const qualityProfile = required(request.quality_profile, 'QUALITY_PROFILE').toUpperCase();
  const premium = qualityProfile.startsWith('PREMIUM_');
  const payload = request.creative_payload || {};
  const primaryRenderer = text(payload.primary_renderer).toUpperCase();
  if (premium && (payload.legacy_programmatic_renderer_allowed === true || primaryRenderer.includes('CANARY') || primaryRenderer.includes('PROGRAMMATIC'))) {
    throw new Error('PROCEDURAL_OR_CANARY_PRIMARY_FORBIDDEN_FOR_PREMIUM');
  }

  const requiredCapabilities = array(payload.execution_capabilities || request.required_capabilities).map(text).filter(Boolean);
  if (premium && requiredCapabilities.length === 0) throw new Error('PREMIUM_EXECUTION_CAPABILITIES_REQUIRED');

  const spendCeiling = Number(request.spend_ceiling_eur ?? request.expected_cost_eur ?? 0);
  if (!Number.isFinite(spendCeiling) || spendCeiling < 0) throw new Error('SPEND_CEILING_INVALID');

  return Object.freeze({
    schema_version: '2.0.0',
    state_type: 'CEREBRO_UMS_PRODUCTION_JOB_V2',
    company_id: required(request.company_id || input.company_id, 'COMPANY_ID'),
    engine_id: 'UMS-001',
    environment,
    version: required(request.version || input.version || 'v2', 'VERSION'),
    job_id: required(input.job_id || request.job_id || request.idempotency_key, 'JOB_ID'),
    production_id: required(request.audit_id || request.production_id || request.idempotency_key, 'PRODUCTION_ID'),
    kind: 'cerebro.ums.production_order.v1',
    brief: request.brief || {},
    deliverables: array(request.deliverables).length ? array(request.deliverables) : [request.output_type || 'REEL'],
    quality_profile: qualityProfile,
    quality_standard_id: request.quality_standard_id || 'CINEMATIC_BLOCKBUSTER_STUDIO_V1',
    required_capabilities: Object.freeze(requiredCapabilities),
    status: 'QUEUED',
    attempt: Number(input.attempt || 0),
    artifacts: Object.freeze(array(input.artifacts)),
    provenance: Object.freeze(array(input.provenance)),
    spend_ceiling_eur: spendCeiling,
    publish_authorized: false,
    request,
    created_at: input.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
}

export const UMS_PRODUCTION_JOB_CONTRACT_V2 = Object.freeze({
  schema_version: '2.0.0', engine_id: 'UMS-001', environment: 'PREPROD',
  default_quality_standard_id: 'CINEMATIC_BLOCKBUSTER_STUDIO_V1',
  default_spend_ceiling_eur: 0, publish_authorized_default: false, fail_closed: true,
  statuses: UMS_PRODUCTION_JOB_STATUSES,
});
