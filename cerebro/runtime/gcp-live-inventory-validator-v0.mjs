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
const REQUIRED_FIELDS = Object.freeze([
  'capture_id','record_kind','captured_at','company_id','engine_id','environment','version','project_id','domain',
  'command_template_id_or_ref','principal_ref','result_status','evidence_ref','raw_payload_stored',
  'secret_payload_present','resource_ref','classification_status',
]);
const REQUIRED_FIELD_SET = new Set(REQUIRED_FIELDS);
const ENVELOPE_FIELDS = Object.freeze(['coverage_records','resource_records']);

function assertJsonString(value) {
  if (typeof value !== 'string' || value.length === 0) throw new TypeError('envelope must be a non-empty JSON string');
}

function parseEnvelopeJson(inputJson) {
  assertJsonString(inputJson);
  let parsed;
  try {
    parsed = JSON.parse(inputJson);
  } catch {
    throw new TypeError('envelope must be valid JSON');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new TypeError('envelope JSON root must be an object');
  const keys = Object.keys(parsed).sort();
  const expected = [...ENVELOPE_FIELDS].sort();
  if (keys.length !== expected.length || keys.some((key, index) => key !== expected[index])) {
    throw new Error(`envelope fields must be exactly: ${ENVELOPE_FIELDS.join(',')}`);
  }
  if (!Array.isArray(parsed.coverage_records)) throw new TypeError('coverage_records must be an array');
  if (!Array.isArray(parsed.resource_records)) throw new TypeError('resource_records must be an array');
  return parsed;
}

function assertRecordShape(record, label) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) throw new TypeError(`${label} must be an object`);
  const keys = Object.keys(record);
  if (keys.length !== REQUIRED_FIELDS.length || keys.some((key) => !REQUIRED_FIELD_SET.has(key))) {
    throw new Error(`${label} fields must match the canonical capture contract exactly`);
  }
}

function assertNonEmptyString(value, label) {
  if (typeof value !== 'string' || value.trim().length === 0) throw new TypeError(`${label} must be a non-empty string`);
}

function assertTimestamp(value, label) {
  assertNonEmptyString(value, label);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value) || Number.isNaN(Date.parse(value))) {
    throw new TypeError(`${label} must be an ISO-8601 UTC timestamp`);
  }
}

function pairKey(projectId, domain) {
  return `${projectId}::${domain}`;
}

function resourceKey(projectId, resourceRef) {
  return `${projectId}::${resourceRef}`;
}

function validateCommon(record, label, recordKind) {
  assertRecordShape(record, label);
  assertNonEmptyString(record.capture_id, `${label}.capture_id`);
  if (record.record_kind !== recordKind) throw new Error(`${label}.record_kind must be ${recordKind}`);
  assertTimestamp(record.captured_at, `${label}.captured_at`);
  assertNonEmptyString(record.company_id, `${label}.company_id`);
  if (record.engine_id !== 'INT-001') throw new Error(`${label}.engine_id must be INT-001`);
  if (record.environment !== 'SCAFFOLD') throw new Error(`${label}.environment must be SCAFFOLD`);
  assertNonEmptyString(record.version, `${label}.version`);
  assertNonEmptyString(record.project_id, `${label}.project_id`);
  assertNonEmptyString(record.domain, `${label}.domain`);
  assertNonEmptyString(record.command_template_id_or_ref, `${label}.command_template_id_or_ref`);
  assertNonEmptyString(record.principal_ref, `${label}.principal_ref`);
  assertNonEmptyString(record.evidence_ref, `${label}.evidence_ref`);
  if (!PROJECT_SET.has(record.project_id)) throw new RangeError(`${label}.project_id not allowlisted: ${record.project_id}`);
  if (!DOMAIN_SET.has(record.domain)) throw new RangeError(`${label}.domain not canonical: ${record.domain}`);
  if (!RESULT_STATUS.has(record.result_status)) throw new RangeError(`${label}.result_status invalid: ${record.result_status}`);
  if (!CLASSIFICATION_STATUS.has(record.classification_status)) throw new RangeError(`${label}.classification_status invalid: ${record.classification_status}`);
  if (record.raw_payload_stored !== false) throw new Error(`${label}.raw_payload_stored must be false`);
  if (record.secret_payload_present !== false) throw new Error(`${label}.secret_payload_present must be false`);
  assertNonEmptyString(record.resource_ref, `${label}.resource_ref`);
}

export function expectedCoveragePairs() {
  return PROJECTS.flatMap((project_id) => DOMAINS.map((domain) => ({ project_id, domain })));
}

export function validateGcpInventoryEnvelope(inputJson) {
  const input = parseEnvelopeJson(inputJson);
  const seenCaptureIds = new Set();
  const coveragePairs = new Set();

  for (const [index, record] of input.coverage_records.entries()) {
    const label = `coverage_records[${index}]`;
    validateCommon(record, label, 'COVERAGE');
    if (record.resource_ref !== DOMAIN_SENTINEL) throw new Error(`${label}.resource_ref must be ${DOMAIN_SENTINEL}`);
    if (record.classification_status !== 'UNCLASSIFIED') throw new Error(`${label}.classification_status must be UNCLASSIFIED`);
    if (seenCaptureIds.has(record.capture_id)) throw new Error(`duplicate capture_id: ${record.capture_id}`);
    seenCaptureIds.add(record.capture_id);
    const key = pairKey(record.project_id, record.domain);
    if (coveragePairs.has(key)) throw new Error(`duplicate coverage pair: ${key}`);
    coveragePairs.add(key);
  }

  const expected = expectedCoveragePairs().map(({ project_id, domain }) => pairKey(project_id, domain));
  const missing = expected.filter((key) => !coveragePairs.has(key));
  if (input.coverage_records.length !== 76 || coveragePairs.size !== 76 || missing.length > 0) {
    throw new Error(`incomplete project-domain coverage: expected 76 unique COVERAGE records; missing=${missing.join(',')}`);
  }

  const resourceIdentities = new Set();
  for (const [index, record] of input.resource_records.entries()) {
    const label = `resource_records[${index}]`;
    validateCommon(record, label, 'RESOURCE');
    if (record.resource_ref === DOMAIN_SENTINEL) throw new Error(`${label} cannot use the domain sentinel as a real resource`);
    if (seenCaptureIds.has(record.capture_id)) throw new Error(`duplicate capture_id: ${record.capture_id}`);
    seenCaptureIds.add(record.capture_id);
    const key = resourceKey(record.project_id, record.resource_ref);
    if (resourceIdentities.has(key)) throw new Error(`duplicate resource identity across domains: ${key}`);
    resourceIdentities.add(key);
  }

  return Object.freeze({
    valid: true,
    project_count: PROJECTS.length,
    domain_count: DOMAINS.length,
    coverage_pairs: coveragePairs.size,
    resource_records: resourceIdentities.size,
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
  REQUIRED_FIELDS,
  ENVELOPE_FIELDS,
});
