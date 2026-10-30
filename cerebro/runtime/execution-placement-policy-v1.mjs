const PREPROD = 'PREPROD';

const EDGE_ONLY_CAPABILITIES = new Set([
  'DEVICE_REQUIRED',
  'LOCAL_BROWSER_SESSION',
  'LOCAL_FILESYSTEM',
  'LOCAL_APP_SESSION',
  'LOCAL_HARDWARE',
]);

function nonEmpty(value, label) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${label} required`);
  return value.trim();
}

function normalizeContext(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('context required');
  const context = Object.freeze({
    company_id: nonEmpty(value.company_id, 'context.company_id'),
    engine_id: nonEmpty(value.engine_id, 'context.engine_id'),
    environment: nonEmpty(value.environment, 'context.environment'),
    version: nonEmpty(value.version, 'context.version'),
  });
  if (context.environment !== PREPROD) throw new Error('EXECUTION_PLACEMENT_PREPROD_ONLY');
  if (/trading/i.test(context.engine_id)) throw new Error('EXECUTION_PLACEMENT_TRADING_DENIED');
  return context;
}

function normalizeCapabilities(value) {
  if (value === undefined || value === null) return Object.freeze([]);
  if (!Array.isArray(value)) throw new TypeError('required_capabilities must be an array');
  return Object.freeze([...new Set(value.map(item => nonEmpty(item, 'required_capabilities[]').toUpperCase()))].sort());
}

function normalizeEdge(value = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('edge_status must be an object');
  return Object.freeze({
    online: value.online === true,
    paired: value.paired === true,
    transport_online: value.transport_online === true,
    device_id: typeof value.device_id === 'string' && value.device_id.trim() ? value.device_id.trim() : null,
  });
}

export function classifyExecutionPlacementV1({ context, required_capabilities = [], edge_status = {} } = {}) {
  const safeContext = normalizeContext(context);
  const capabilities = normalizeCapabilities(required_capabilities);
  const edge = normalizeEdge(edge_status);
  const edgeRequired = capabilities.some(capability => EDGE_ONLY_CAPABILITIES.has(capability));

  if (!edgeRequired) {
    return Object.freeze({
      schema_version: '1.0.0',
      state_type: 'CEREBRO_EXECUTION_PLACEMENT_V1',
      context: safeContext,
      placement: 'HOSTLESS',
      runnable: true,
      deferred: false,
      edge_required: false,
      edge_status: edge.online ? 'EDGE_ONLINE_OPTIONAL' : 'EDGE_OFFLINE_OPTIONAL',
      reason: edge.online ? 'HOSTLESS_PREFERRED_EDGE_OPTIONAL' : 'HOSTLESS_CONTINUES_EDGE_OFFLINE',
      human_required: false,
      human_required_reason: null,
      additional_cost_eur: 0,
      prod_authorized: false,
      trading_access: false,
    });
  }

  const edgeReady = edge.online && edge.paired && edge.transport_online && Boolean(edge.device_id);
  return Object.freeze({
    schema_version: '1.0.0',
    state_type: 'CEREBRO_EXECUTION_PLACEMENT_V1',
    context: safeContext,
    placement: edgeReady ? 'EDGE' : 'DEFERRED_EDGE',
    runnable: edgeReady,
    deferred: !edgeReady,
    edge_required: true,
    edge_status: edgeReady ? 'EDGE_READY' : 'EDGE_OFFLINE',
    reason: edgeReady ? 'DEVICE_REQUIRED_EDGE_READY' : 'DEVICE_REQUIRED_EDGE_OFFLINE',
    human_required: false,
    human_required_reason: null,
    additional_cost_eur: 0,
    prod_authorized: false,
    trading_access: false,
  });
}

export const EXECUTION_PLACEMENT_POLICY_V1_CONTRACT = Object.freeze({
  capability: 'JOB-001/EXECUTION-PLACEMENT-V1',
  environment: PREPROD,
  default_placement: 'HOSTLESS',
  edge_is_optional_by_default: true,
  edge_offline_is_global_failure: false,
  edge_offline_is_human_required: false,
  device_required_jobs_defer_when_edge_offline: true,
  device_required_jobs_resume_when_edge_ready: true,
  hostless_jobs_continue_when_edge_offline: true,
  new_queue_created: false,
  new_scheduler_created: false,
  new_daemon_created: false,
  additional_cost_eur: 0,
  prod_authorized: false,
  trading_access: false,
});
