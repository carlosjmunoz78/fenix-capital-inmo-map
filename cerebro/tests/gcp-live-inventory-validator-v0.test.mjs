import test from 'node:test';
import assert from 'node:assert/strict';
import {
  expectedCoveragePairs,
  validateGcpInventoryEnvelope,
  GCP_INVENTORY_VALIDATOR_CONSTANTS,
} from '../runtime/gcp-live-inventory-validator-v0.mjs';

function fullCoverage(status = 'EMPTY') {
  return expectedCoveragePairs().map(({ project_id, domain }) => ({
    project_id,
    domain,
    result_status: status,
    raw_payload_stored: false,
    secret_payload_present: false,
  }));
}

test('expected coverage is exactly four projects by nineteen domains', () => {
  const pairs = expectedCoveragePairs();
  assert.equal(GCP_INVENTORY_VALIDATOR_CONSTANTS.PROJECTS.length, 4);
  assert.equal(GCP_INVENTORY_VALIDATOR_CONSTANTS.DOMAINS.length, 19);
  assert.equal(pairs.length, 76);
  assert.equal(new Set(pairs.map((p) => `${p.project_id}::${p.domain}`)).size, 76);
});

test('accepts a complete read-only envelope and distinct Training/Trading resource records', () => {
  const result = validateGcpInventoryEnvelope({
    domain_captures: fullCoverage(),
    resource_records: [
      {
        project_id: 'fenix-trading-lab', domain: 'compute',
        resource_ref: 'projects/fenix-trading-lab/zones/europe-west1-b/instances/training-a',
        classification_status: 'TRAINING', raw_payload_stored: false, secret_payload_present: false,
      },
      {
        project_id: 'fenix-trading-lab', domain: 'compute',
        resource_ref: 'projects/fenix-trading-lab/zones/europe-west1-b/instances/trading-a',
        classification_status: 'TRADING', raw_payload_stored: false, secret_payload_present: false,
      },
    ],
  });
  assert.equal(result.valid, true);
  assert.equal(result.coverage_pairs, 76);
  assert.equal(result.resource_records, 2);
  assert.equal(result.prod_writes, false);
  assert.equal(result.autonomous_prod, false);
  assert.equal(result.trading_mutation_forbidden, true);
});

test('rejects missing project-domain coverage even when the omitted pair would be a permission gap', () => {
  const captures = fullCoverage('PERMISSION_DENIED');
  captures.pop();
  assert.throws(() => validateGcpInventoryEnvelope({ domain_captures: captures, resource_records: [] }), /incomplete project-domain coverage/);
});

test('rejects duplicate project-domain coverage', () => {
  const captures = fullCoverage();
  captures.push({ ...captures[0] });
  assert.throws(() => validateGcpInventoryEnvelope({ domain_captures: captures, resource_records: [] }), /duplicate project-domain pair/);
});

test('rejects non-allowlisted projects and noncanonical domains', () => {
  const badProject = fullCoverage();
  badProject[0] = { ...badProject[0], project_id: 'other-project' };
  assert.throws(() => validateGcpInventoryEnvelope({ domain_captures: badProject, resource_records: [] }), /project_id not allowlisted/);

  const badDomain = fullCoverage();
  badDomain[0] = { ...badDomain[0], domain: 'unknown_domain' };
  assert.throws(() => validateGcpInventoryEnvelope({ domain_captures: badDomain, resource_records: [] }), /domain not canonical/);
});

test('rejects secret/raw payload capture and domain sentinel masquerading as a resource', () => {
  const secretCapture = fullCoverage();
  secretCapture[0] = { ...secretCapture[0], secret_payload_present: true };
  assert.throws(() => validateGcpInventoryEnvelope({ domain_captures: secretCapture, resource_records: [] }), /secret_payload_present must be false/);

  assert.throws(() => validateGcpInventoryEnvelope({
    domain_captures: fullCoverage(),
    resource_records: [{
      project_id: 'fenix-trading-lab', domain: 'compute', resource_ref: '__DOMAIN__',
      classification_status: 'UNCLASSIFIED', raw_payload_stored: false, secret_payload_present: false,
    }],
  }), /cannot use the domain sentinel/);
});

test('rejects duplicate resource identities within the same project-domain pair', () => {
  const record = {
    project_id: 'fenix-trading-lab', domain: 'compute', resource_ref: 'projects/fenix-trading-lab/zones/europe-west1-b/instances/a',
    classification_status: 'UNCLASSIFIED', raw_payload_stored: false, secret_payload_present: false,
  };
  assert.throws(() => validateGcpInventoryEnvelope({ domain_captures: fullCoverage(), resource_records: [record, { ...record }] }), /duplicate resource record/);
});
