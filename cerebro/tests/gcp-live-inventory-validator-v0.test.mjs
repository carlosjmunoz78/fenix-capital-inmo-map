import test from 'node:test';
import assert from 'node:assert/strict';
import {
  expectedCoveragePairs,
  validateGcpInventoryEnvelope,
  GCP_INVENTORY_VALIDATOR_CONSTANTS,
} from '../runtime/gcp-live-inventory-validator-v0.mjs';

function baseRecord(overrides = {}) {
  return {
    capture_id: 'cap-base',
    record_kind: 'COVERAGE',
    captured_at: '2026-09-10T20:00:00Z',
    company_id: 'fenix-capital',
    engine_id: 'INT-001',
    environment: 'SCAFFOLD',
    version: '1.0.0',
    project_id: 'fenix-trading-lab',
    domain: 'projects',
    command_template_id_or_ref: 'GCP-READONLY-CATALOG:projects',
    principal_ref: 'principal://authorized-readonly',
    result_status: 'EMPTY',
    evidence_ref: 'evidence://gcp/projects',
    raw_payload_stored: false,
    secret_payload_present: false,
    resource_ref: '__DOMAIN__',
    classification_status: 'UNCLASSIFIED',
    ...overrides,
  };
}

function fullCoverage(status = 'EMPTY') {
  return expectedCoveragePairs().map(({ project_id, domain }, index) => baseRecord({
    capture_id: `coverage-${index}`,
    project_id,
    domain,
    result_status: status,
    command_template_id_or_ref: `GCP-READONLY-CATALOG:${domain}`,
    evidence_ref: `evidence://gcp/${project_id}/${domain}`,
  }));
}

function envelope(coverage_records = fullCoverage(), resource_records = []) {
  return JSON.stringify({ coverage_records, resource_records });
}

function resourceRecord(overrides = {}) {
  return baseRecord({
    capture_id: 'resource-1',
    record_kind: 'RESOURCE',
    domain: 'compute',
    result_status: 'SUCCESS',
    resource_ref: 'projects/fenix-trading-lab/zones/europe-west1-b/instances/training-a',
    classification_status: 'TRAINING',
    command_template_id_or_ref: 'GCP-READONLY-CATALOG:compute',
    evidence_ref: 'evidence://gcp/fenix-trading-lab/compute/training-a',
    ...overrides,
  });
}

test('expected coverage is exactly four projects by nineteen domains', () => {
  const pairs = expectedCoveragePairs();
  assert.equal(GCP_INVENTORY_VALIDATOR_CONSTANTS.PROJECTS.length, 4);
  assert.equal(GCP_INVENTORY_VALIDATOR_CONSTANTS.DOMAINS.length, 19);
  assert.equal(pairs.length, 76);
  assert.equal(new Set(pairs.map((p) => `${p.project_id}::${p.domain}`)).size, 76);
});

test('accepts a complete canonical envelope with separated coverage and resource records', () => {
  const resources = [
    resourceRecord(),
    resourceRecord({
      capture_id: 'resource-2',
      resource_ref: 'projects/fenix-trading-lab/zones/europe-west1-b/instances/trading-a',
      classification_status: 'TRADING',
      evidence_ref: 'evidence://gcp/fenix-trading-lab/compute/trading-a',
    }),
  ];
  const result = validateGcpInventoryEnvelope(envelope(fullCoverage(), resources));
  assert.equal(result.valid, true);
  assert.equal(result.coverage_pairs, 76);
  assert.equal(result.resource_records, 2);
  assert.equal(result.prod_writes, false);
  assert.equal(result.autonomous_prod, false);
  assert.equal(result.trading_mutation_forbidden, true);
});

test('public validator accepts JSON text only, preventing accessor/proxy input semantics', () => {
  assert.throws(() => validateGcpInventoryEnvelope({ coverage_records: fullCoverage(), resource_records: [] }), /JSON string/);
});

test('rejects missing or duplicate project-domain coverage including permission gaps', () => {
  const missing = fullCoverage('PERMISSION_DENIED');
  missing.pop();
  assert.throws(() => validateGcpInventoryEnvelope(envelope(missing)), /incomplete project-domain coverage/);

  const duplicate = fullCoverage();
  duplicate.push({ ...duplicate[0], capture_id: 'coverage-extra' });
  assert.throws(() => validateGcpInventoryEnvelope(envelope(duplicate)), /duplicate coverage pair/);
});

test('requires full provenance and canonical context on every record', () => {
  const missingPrincipal = fullCoverage();
  delete missingPrincipal[0].principal_ref;
  assert.throws(() => validateGcpInventoryEnvelope(envelope(missingPrincipal)), /fields must match the canonical capture contract exactly/);

  const badEngine = fullCoverage();
  badEngine[0].engine_id = 'OTHER-001';
  assert.throws(() => validateGcpInventoryEnvelope(envelope(badEngine)), /engine_id must be INT-001/);

  const badEnvironment = fullCoverage();
  badEnvironment[0].environment = 'PROD';
  assert.throws(() => validateGcpInventoryEnvelope(envelope(badEnvironment)), /environment must be SCAFFOLD/);

  const badTimestamp = fullCoverage();
  badTimestamp[0].captured_at = 'yesterday';
  assert.throws(() => validateGcpInventoryEnvelope(envelope(badTimestamp)), /ISO-8601 UTC timestamp/);
});

test('rejects embedded raw, secret, credential or unknown payload-bearing fields even when flags are false', () => {
  for (const field of ['raw_payload','secret_payload','credentials','access_token']) {
    const captures = fullCoverage();
    captures[0][field] = 'must-not-be-present';
    assert.throws(() => validateGcpInventoryEnvelope(envelope(captures)), /fields must match the canonical capture contract exactly/);
  }

  const extraEnvelope = JSON.stringify({ coverage_records: fullCoverage(), resource_records: [], raw_payload: 'x' });
  assert.throws(() => validateGcpInventoryEnvelope(extraEnvelope), /envelope fields must be exactly/);
});

test('rejects raw/secret declarations, non-allowlisted projects and noncanonical domains', () => {
  const secret = fullCoverage();
  secret[0].secret_payload_present = true;
  assert.throws(() => validateGcpInventoryEnvelope(envelope(secret)), /secret_payload_present must be false/);

  const raw = fullCoverage();
  raw[0].raw_payload_stored = true;
  assert.throws(() => validateGcpInventoryEnvelope(envelope(raw)), /raw_payload_stored must be false/);

  const badProject = fullCoverage();
  badProject[0].project_id = 'other-project';
  assert.throws(() => validateGcpInventoryEnvelope(envelope(badProject)), /project_id not allowlisted/);

  const badDomain = fullCoverage();
  badDomain[0].domain = 'unknown_domain';
  assert.throws(() => validateGcpInventoryEnvelope(envelope(badDomain)), /domain not canonical/);
});

test('enforces COVERAGE and RESOURCE record kinds and keeps resource records out of 76-pair coverage', () => {
  const wrongCoverageKind = fullCoverage();
  wrongCoverageKind[0].record_kind = 'RESOURCE';
  assert.throws(() => validateGcpInventoryEnvelope(envelope(wrongCoverageKind)), /record_kind must be COVERAGE/);

  const badResource = resourceRecord({ record_kind: 'COVERAGE' });
  assert.throws(() => validateGcpInventoryEnvelope(envelope(fullCoverage(), [badResource])), /record_kind must be RESOURCE/);
});

test('rejects domain sentinel as real resource and duplicate resource identity across domains', () => {
  const sentinel = resourceRecord({ resource_ref: '__DOMAIN__' });
  assert.throws(() => validateGcpInventoryEnvelope(envelope(fullCoverage(), [sentinel])), /cannot use the domain sentinel/);

  const sameRef = 'projects/fenix-trading-lab/global/resources/shared-a';
  const a = resourceRecord({
    capture_id: 'resource-a', domain: 'compute', resource_ref: sameRef,
    classification_status: 'TRAINING', evidence_ref: 'evidence://a',
  });
  const b = resourceRecord({
    capture_id: 'resource-b', domain: 'resource_consumers', resource_ref: sameRef,
    classification_status: 'TRADING', evidence_ref: 'evidence://b',
  });
  assert.throws(() => validateGcpInventoryEnvelope(envelope(fullCoverage(), [a, b])), /duplicate resource identity across domains/);
});

test('rejects duplicate capture ids across both collections', () => {
  const coverage = fullCoverage();
  const resource = resourceRecord({ capture_id: coverage[0].capture_id });
  assert.throws(() => validateGcpInventoryEnvelope(envelope(coverage, [resource])), /duplicate capture_id/);
});
