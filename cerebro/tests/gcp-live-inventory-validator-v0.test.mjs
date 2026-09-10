import test from 'node:test';
import assert from 'node:assert/strict';
import { expectedCoveragePairs, validateGcpInventoryEnvelope, GCP_INVENTORY_VALIDATOR_CONSTANTS } from '../runtime/gcp-live-inventory-validator-v0.mjs';

function commandResult(domain, i = 0, status = 'EMPTY') {
  return {
    command_run_ref: `run-${domain}-${i}`,
    command_template_id_or_ref: `GCP-READONLY-CATALOG:${domain}`,
    result_status: status,
    captured_at: '2026-09-10T21:00:00Z',
    principal_ref: 'principal://authorized-readonly',
    evidence_ref: `evidence://gcp/${domain}/${i}`,
  };
}

function baseRecord(overrides = {}) {
  const domain = overrides.domain ?? 'projects';
  return {
    capture_id: 'cap-base', record_kind: 'COVERAGE', captured_at: '2026-09-10T21:00:00Z', company_id: 'fenix-capital',
    engine_id: 'INT-001', environment: 'SCAFFOLD', version: '1.0.0', project_id: 'fenix-trading-lab', domain,
    command_template_id_or_ref: `GCP-READONLY-CATALOG:${domain}`, principal_ref: 'principal://authorized-readonly', result_status: 'EMPTY',
    evidence_ref: `evidence://gcp/fenix-trading-lab/${domain}`, raw_payload_stored: false, secret_payload_present: false,
    resource_ref: '__DOMAIN__', classification_status: 'UNCLASSIFIED', command_results: [commandResult(domain)], ...overrides,
  };
}

function fullCoverage() {
  return expectedCoveragePairs().map(({project_id, domain}, index) => baseRecord({capture_id:`coverage-${index}`, project_id, domain, command_template_id_or_ref:`GCP-READONLY-CATALOG:${domain}`, evidence_ref:`evidence://gcp/${project_id}/${domain}`, command_results:[commandResult(domain, index)]}));
}

function resourceRecord(overrides = {}) {
  const domain = overrides.domain ?? 'compute';
  const record = baseRecord({capture_id:'resource-1', record_kind:'RESOURCE', domain, command_template_id_or_ref:`GCP-READONLY-CATALOG:${domain}`, result_status:'SUCCESS', evidence_ref:'evidence://gcp/resource/1', resource_ref:'projects/fenix-trading-lab/zones/europe-west1-b/instances/training-a', classification_status:'TRAINING', ...overrides});
  delete record.command_results;
  return record;
}

function envelope(coverage_records = fullCoverage(), resource_records = []) { return JSON.stringify({coverage_records, resource_records}); }

test('expected coverage is exactly 4x19=76', () => {
  assert.equal(GCP_INVENTORY_VALIDATOR_CONSTANTS.PROJECTS.length, 4);
  assert.equal(GCP_INVENTORY_VALIDATOR_CONSTANTS.DOMAINS.length, 19);
  assert.equal(expectedCoveragePairs().length, 76);
});

test('accepts canonical complete read-only envelope with per-command evidence', () => {
  const result = validateGcpInventoryEnvelope(envelope(fullCoverage(), [resourceRecord()]));
  assert.equal(result.valid, true);
  assert.equal(result.coverage_pairs, 76);
  assert.equal(result.resource_records, 1);
  assert.equal(result.prod_writes, false);
  assert.equal(result.trading_mutation_forbidden, true);
});

test('rejects duplicate JSON member names before JSON.parse can overwrite them', () => {
  const valid = envelope();
  const duplicateRoot = valid.replace('{"coverage_records":', '{"coverage_records":[],"coverage_records":');
  assert.throws(() => validateGcpInventoryEnvelope(duplicateRoot), /duplicate JSON object key: coverage_records/);

  const one = JSON.stringify(baseRecord());
  const duplicateNested = one.replace('"secret_payload_present":false', '"secret_payload_present":true,"secret_payload_present":false');
  const text = `{"coverage_records":[${duplicateNested}],"resource_records":[]}`;
  assert.throws(() => validateGcpInventoryEnvelope(text), /duplicate JSON object key: secret_payload_present/);
});

test('rejects serialized credentials/payloads disguised as refs and noncanonical command provenance', () => {
  for (const [field, value, pattern] of [
    ['principal_ref', '{"private_key":"x"}', /canonical principal\/credential reference/],
    ['evidence_ref', '{"raw":"payload"}', /canonical evidence:\/\/ reference/],
    ['command_template_id_or_ref', 'gcloud secrets versions access latest', /canonical read-only catalog entry/],
  ]) {
    const coverage = fullCoverage();
    coverage[0][field] = value;
    assert.throws(() => validateGcpInventoryEnvelope(envelope(coverage)), pattern);
  }
});

test('rejects edge whitespace in stable resource refs before deduplication', () => {
  const same = 'projects/fenix-trading-lab/global/resources/shared-a';
  const a = resourceRecord({capture_id:'a', resource_ref:same, domain:'compute', command_template_id_or_ref:'GCP-READONLY-CATALOG:compute'});
  const b = resourceRecord({capture_id:'b', resource_ref:`${same} `, domain:'resource_consumers', command_template_id_or_ref:'GCP-READONLY-CATALOG:resource_consumers'});
  assert.throws(() => validateGcpInventoryEnvelope(envelope(fullCoverage(), [a,b])), /canonical non-empty string without edge whitespace/);
});

test('rejects same resource identity across domains even with contradictory classifications', () => {
  const same = 'projects/fenix-trading-lab/global/resources/shared-a';
  const a = resourceRecord({capture_id:'a', resource_ref:same, domain:'compute', classification_status:'TRAINING', command_template_id_or_ref:'GCP-READONLY-CATALOG:compute'});
  const b = resourceRecord({capture_id:'b', resource_ref:same, domain:'resource_consumers', classification_status:'TRADING', command_template_id_or_ref:'GCP-READONLY-CATALOG:resource_consumers'});
  assert.throws(() => validateGcpInventoryEnvelope(envelope(fullCoverage(), [a,b])), /duplicate resource identity across domains/);
});

test('requires exact provenance/context and rejects payload-bearing or unknown fields', () => {
  const missing = fullCoverage(); delete missing[0].principal_ref;
  assert.throws(() => validateGcpInventoryEnvelope(envelope(missing)), /fields must match the canonical contract exactly/);
  const extra = fullCoverage(); extra[0].raw_payload = 'x';
  assert.throws(() => validateGcpInventoryEnvelope(envelope(extra)), /fields must match the canonical contract exactly/);
});

test('requires one or more command_results per coverage and preserves mixed command statuses', () => {
  const missing = fullCoverage(); missing[0].command_results = [];
  assert.throws(() => validateGcpInventoryEnvelope(envelope(missing)), /command_results must contain every executed command/);

  const mixed = fullCoverage();
  mixed[0].command_results = [commandResult('projects', 1, 'SUCCESS'), commandResult('projects', 2, 'PERMISSION_DENIED')];
  const result = validateGcpInventoryEnvelope(envelope(mixed));
  assert.equal(result.valid, true);

  const duplicateRun = fullCoverage();
  duplicateRun[0].command_results = [commandResult('projects', 1), commandResult('projects', 1)];
  assert.throws(() => validateGcpInventoryEnvelope(envelope(duplicateRun)), /command_run_ref must be unique/);
});

test('public API accepts JSON text only and all 76 pairs remain mandatory', () => {
  assert.throws(() => validateGcpInventoryEnvelope({coverage_records:fullCoverage(),resource_records:[]}), /JSON string/);
  const missing = fullCoverage(); missing.pop();
  assert.throws(() => validateGcpInventoryEnvelope(envelope(missing)), /incomplete project-domain coverage/);
});
