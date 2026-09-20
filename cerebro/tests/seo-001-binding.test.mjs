import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const contract = JSON.parse(fs.readFileSync(path.join(HERE, '..', 'registry', 'seo-001-runtime-binding.json'), 'utf8'));

test('SEO-001 runtime binding preserves canonical identity and multi-company scope', () => {
  assert.equal(contract.engine_id, 'SEO-001');
  assert.equal(contract.company_scope, 'MULTI_COMPANY');
  assert.equal(contract.version, '0.4.1');
  assert.deepEqual(contract.data_model.required_scope, ['company_id','engine_id','environment','engine_version']);
});

test('SEO-001 production autonomy remains fail-closed until the time gate is proven', () => {
  assert.equal(contract.autonomous_prod, false);
  assert.equal(contract.permissions.default, 'deny');
  assert.equal(contract.permissions.prod_writes, 'locked_by_default');
  assert.equal(contract.evaluation.autonomous_verified_gate, '4 consecutive weekly cycles');
});

test('SEO-001 uses only canonical HUMAN_REQUIRED codes', () => {
  assert.deepEqual(contract.human_exception_codes, [
    'LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK',
    'POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST'
  ]);
});

test('SEO-001 keeps zero-new-cost default and does not require GSC Wizard', () => {
  assert.equal(contract.cost_budget.additional_monthly_target_eur, 0);
  assert.equal(contract.cost_budget.paid_ai_required, false);
  assert.equal(contract.cost_budget.gsc_wizard_required, false);
});
