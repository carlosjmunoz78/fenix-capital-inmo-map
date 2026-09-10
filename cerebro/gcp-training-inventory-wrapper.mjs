const ALLOWED_PROJECT_IDS = Object.freeze([
  'fenix-trading-lab',
  'fenix-capital-455809',
  'fenix-inmobiliaria',
  'fenix-capital-make-web-y-seo',
]);

const INVENTORY_DOMAINS = Object.freeze([
  'services',
  'cloud_run',
  'functions',
  'compute',
  'jobs',
  'scheduler',
  'pubsub',
  'storage',
  'databases',
  'artifact_registry',
  'iam',
  'secret_references',
  'networking',
  'logging_monitoring',
  'billing_cost',
  'regions',
  'deployments',
  'consumers',
]);

function assertPlainObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new Error(`${label} must be a plain object`);
  }
}

function nonEmptyString(value, label) {
  if (typeof value !== 'string' || value.trim() === '') throw new Error(`${label} must be a non-empty string`);
  return value;
}

export function buildGcpTrainingInventoryPlan(input) {
  assertPlainObject(input, 'input');
  const companyId = nonEmptyString(input.company_id, 'company_id');
  const environment = nonEmptyString(input.environment, 'environment');
  const version = nonEmptyString(input.version, 'version');
  const projectId = nonEmptyString(input.project_id, 'project_id');

  if (environment !== 'SCAFFOLD') throw new Error('GCP inventory V0 accepts exact SCAFFOLD only');
  if (!ALLOWED_PROJECT_IDS.includes(projectId)) throw new Error(`unregistered GCP project_id ${projectId}`);

  return Object.freeze({
    status: 'PLAN_READY',
    company_id: companyId,
    engine_id: 'INT-001',
    environment,
    version,
    project_id: projectId,
    mode: 'READ_ONLY_FIRST',
    execution_mode: 'PLAN_ONLY',
    executed: false,
    prod_writes: false,
    trading_access: false,
    additional_cost_target_eur: 0,
    secrets_policy: 'REFERENCES_ONLY',
    least_privilege_required: true,
    training_trading_separation_required_before_write: projectId === 'fenix-trading-lab',
    live_inventory_status: 'UNKNOWN_REQUIRES_AUDIT',
    inventory_domains: INVENTORY_DOMAINS,
    integration_precedence: Object.freeze([
      'EXISTING_API',
      'AUTHORIZED_MCP_OR_CONNECTOR',
      'GCLOUD_OR_SCRIPT',
      'FACT001_NEW_CONNECTOR_ONLY_IF_GAP_PROVEN',
    ]),
  });
}

export function allowedGcpProjectIds() {
  return [...ALLOWED_PROJECT_IDS];
}
