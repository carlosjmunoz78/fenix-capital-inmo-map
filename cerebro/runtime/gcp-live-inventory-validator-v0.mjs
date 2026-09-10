const PROJECTS = Object.freeze([
  'fenix-trading-lab',
  'fenix-capital-455809',
  'fenix-inmobiliaria',
  'fenix-capital-make-web-y-seo',
]);

const DOMAINS = Object.freeze([
  'projects','enabled_apis','cloud_run','cloud_functions','compute','jobs','scheduler','pubsub','storage','databases','artifact_registry','service_accounts_and_iam','secret_references','networking','logging_monitoring','billing_cost','regions','deployments','resource_consumers'
]);

const RESULT_STATUS = new Set(['SUCCESS','PERMISSION_DENIED','API_UNAVAILABLE','EMPTY','ERROR']);
const CLASSIFICATION_STATUS = new Set(['UNCLASSIFIED','TRAINING','TRADING','APP_CRM','SHARED_REQUIRES_REVIEW','OTHER']);
const PROJECT_SET = new Set(PROJECTS);
const DOMAIN_SET = new Set(DOMAINS);
const DOMAIN_SENTINEL = '__DOMAIN__';

function assertPlainObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new TypeError(`${label} must be a plain object`);
  }
}

function assertString(value, label) {
  if (typeof value !== 'string' || value.length === 0) throw new TypeError(`${label} must be a non-empty string`);
}

function pairKey(projectId, domain) {
  return `${projectId}::${domain}`;
}

export function expectedCoveragePairs() {
  return PROJECTS.flatMap((project_id) => DOMAINS.map((domain) => ({ project_id, domain })));
}

export function validateGcpInventoryEnvelope(input) {
  assertPlainObject(input, 'envelope');
  if (!Array.isArray(input.domain_captures)) throw new TypeError('domain_captures must be an array');
  if (!Array.isArray(input.resource_records)) throw new TypeError('resource_records must be an array');

  const seen = new Set();
  for (const [index, capture] of input.domain_captures.entries()) {
    assertPlainObject(capture, `domain_captures[${index}]`);
    assertString(capture.project_id, `domain_captures[${index}].project_id`);
    assertString(capture.domain, `domain_captures[${index}].domain`);
    if (!PROJECT_SET.has(capture.project_id)) throw new RangeError(`project_id not allowlisted: ${capture.project_id}`);
    if (!DOMAIN_SET.has(capture.domain)) throw new RangeError(`domain not canonical: ${capture.domain}`);
    if (!RESULT_STATUS.has(capture.result_status)) throw new RangeError(`invalid result_status: ${capture.result_status}`);
    if (capture.raw_payload_stored !== false) throw new Error('raw_payload_stored must be false');
    if (capture.secret_payload_present !== false) throw new Error('secret_payload_present must be false');
    const key = pairKey(capture.project_id, capture.domain);
    if (seen.has(key)) throw new Error(`duplicate project-domain pair: ${key}`);
    seen.add(key);
  }

  const expected = expectedCoveragePairs().map(({ project_id, domain }) => pairKey(project_id, domain));
  const missing = expected.filter((key) => !seen.has(key));
  if (input.domain_captures.length !== expected.length || missing.length > 0) {
    throw new Error(`incomplete project-domain coverage: expected 76 unique pairs; missing=${missing.join(',')}`);
  }

  const resourceKeys = new Set();
  for (const [index, record] of input.resource_records.entries()) {
    assertPlainObject(record, `resource_records[${index}]`);
    assertString(record.project_id, `resource_records[${index}].project_id`);
    assertString(record.domain, `resource_records[${index}].domain`);
    assertString(record.resource_ref, `resource_records[${index}].resource_ref`);
    if (!PROJECT_SET.has(record.project_id)) throw new RangeError(`resource project_id not allowlisted: ${record.project_id}`);
    if (!DOMAIN_SET.has(record.domain)) throw new RangeError(`resource domain not canonical: ${record.domain}`);
    if (record.resource_ref === DOMAIN_SENTINEL) throw new Error('resource_records cannot use the domain sentinel as a real resource');
    if (!CLASSIFICATION_STATUS.has(record.classification_status)) throw new RangeError(`invalid classification_status: ${record.classification_status}`);
    if (record.raw_payload_stored !== false) throw new Error('resource raw_payload_stored must be false');
    if (record.secret_payload_present !== false) throw new Error('resource secret_payload_present must be false');
    const key = `${pairKey(record.project_id, record.domain)}::${record.resource_ref}`;
    if (resourceKeys.has(key)) throw new Error(`duplicate resource record: ${key}`);
    resourceKeys.add(key);
  }

  return Object.freeze({
    valid: true,
    project_count: PROJECTS.length,
    domain_count: DOMAINS.length,
    coverage_pairs: seen.size,
    resource_records: resourceKeys.size,
    execution_mode: 'READ_ONLY_CAPTURE_ONLY',
    prod_writes: false,
    autonomous_prod: false,
    trading_mutation_forbidden: true,
  });
}

export const GCP_INVENTORY_VALIDATOR_CONSTANTS = Object.freeze({
  PROJECTS,
  DOMAINS,
  DOMAIN_SENTINEL,
});
