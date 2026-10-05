import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const candidate = JSON.parse(fs.readFileSync(path.join(root, 'registry', 'brandboot-001.candidate.json'), 'utf8'));
const canonical = JSON.parse(fs.readFileSync(path.join(root, 'registry', 'engine-registry.seed.json'), 'utf8'));

test('BRANDBOOT candidate does not silently mutate the 177-engine canonical seed', () => {
  assert.equal(canonical.count, 177);
  assert.equal(canonical.engine_ids.length, 177);
  assert.equal(canonical.engine_ids.includes('BRANDBOOT-001'), false);
  assert.equal(candidate.canonical_registry_seed_unchanged, true);
  assert.equal(candidate.source_status, 'CANDIDATE_NOT_CANONICAL');
});

test('BRANDBOOT candidate is multi-company and carries mandatory context', () => {
  assert.equal(candidate.engine_id, 'BRANDBOOT-001');
  assert.equal(candidate.company_scope, 'MULTI_COMPANY');
  assert.equal(candidate.environment, 'LAB');
  assert.deepEqual(candidate.required_context, ['company_id', 'engine_id', 'environment', 'version']);
});

test('BRANDBOOT candidate is zero-added-cost and fail-closed for PROD', () => {
  assert.equal(candidate.zero_cost_execution.additional_fixed_cost_eur, 0);
  assert.equal(candidate.zero_cost_execution.paid_ai_required, false);
  assert.equal(candidate.zero_cost_execution.paid_design_saas_required, false);
  assert.equal(candidate.permissions.prod_writes, false);
  assert.equal(candidate.permissions.publishing, false);
  assert.equal(candidate.promotion_gates.autonomous_prod, false);
  assert.equal(candidate.promotion_gates.naming_trademark_clearance_required_for_prod, true);
});

test('BRANDBOOT candidate preserves CEREBRO human-exception contract', () => {
  const required = ['LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK','POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST'];
  assert.deepEqual(candidate.human_required_reasons, required);
});

test('BRANDBOOT candidate outputs reusable machine-readable brand contracts', () => {
  for (const output of ['brand_manual','brand.json','design-tokens.json','brand.css','asset_inventory','voice_rules','web_app_social_email_document_presets']) {
    assert.ok(candidate.outputs.includes(output), `missing ${output}`);
  }
});
